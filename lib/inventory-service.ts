import { supabase } from './supabase';
import crypto from 'crypto';

export interface InventoryConnection {
  id: string;
  organization_id: string;
  provider: '1shotInventory' | 'custom';
  api_endpoint: string;
  api_key_encrypted: string;
  config: Record<string, any>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  connection_id: string;
  external_id: string;
  name: string;
  sku?: string;
  price?: number;
  quantity: number;
  metadata: Record<string, any>;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Encrypt API key (simple encryption - in production use proper encryption)
 */
function encryptApiKey(apiKey: string): string {
  // In production, use proper encryption with a secret key
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production';
  const cipher = crypto.createCipher('aes-256-cbc', secret);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * Decrypt API key
 */
function decryptApiKey(encrypted: string): string {
  const secret = process.env.ENCRYPTION_SECRET || 'default-secret-change-in-production';
  const decipher = crypto.createDecipher('aes-256-cbc', secret);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Sync inventory from external source
 */
export async function syncInventory(
  connectionId: string,
  syncType: 'full' | 'incremental' = 'incremental'
): Promise<{ success: boolean; itemsSynced: number; error?: string }> {
  try {
    // Get connection
    const { data: connection, error: connError } = await supabase
      .from('inventory_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      throw new Error('Inventory connection not found');
    }

    // Create sync log
    const { data: syncLog, error: logError } = await supabase
      .from('inventory_sync_logs')
      .insert({
        connection_id: connectionId,
        sync_type: syncType,
        status: 'running',
      })
      .select()
      .single();

    if (logError) throw logError;

    try {
      // Decrypt API key
      const apiKey = decryptApiKey(connection.api_key_encrypted);

      // Fetch inventory from external API
      const response = await fetch(`${connection.api_endpoint}/inventory`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      const items = data.items || [];

      // Upsert inventory items
      let itemsSynced = 0;
      for (const item of items) {
        const { error: upsertError } = await supabase
          .from('inventory_items')
          .upsert({
            connection_id: connectionId,
            external_id: item.id || item.external_id,
            name: item.name,
            sku: item.sku,
            price: item.price,
            quantity: item.quantity || 0,
            metadata: item.metadata || {},
            synced_at: new Date().toISOString(),
          }, {
            onConflict: 'connection_id,external_id',
          });

        if (!upsertError) {
          itemsSynced++;
        }
      }

      // Update sync log
      await supabase
        .from('inventory_sync_logs')
        .update({
          status: 'completed',
          items_synced: itemsSynced,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id);

      return { success: true, itemsSynced };
    } catch (error: any) {
      // Update sync log with error
      await supabase
        .from('inventory_sync_logs')
        .update({
          status: 'failed',
          error: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id);

      throw error;
    }
  } catch (error: any) {
    return { success: false, itemsSynced: 0, error: error.message };
  }
}

/**
 * Get inventory items
 */
export async function getInventoryItems(
  connectionId?: string,
  search?: string
): Promise<InventoryItem[]> {
  try {
    let query = supabase
      .from('inventory_items')
      .select('*')
      .order('name', { ascending: true });

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []) as InventoryItem[];
  } catch (error) {
    console.error('Error getting inventory items:', error);
    return [];
  }
}

/**
 * Create inventory connection
 */
export async function createInventoryConnection(
  connection: Omit<InventoryConnection, 'id' | 'created_at' | 'updated_at'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const encryptedKey = encryptApiKey(connection.api_key_encrypted);

    const { data, error } = await supabase
      .from('inventory_connections')
      .insert({
        ...connection,
        api_key_encrypted: encryptedKey,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, id: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Update inventory connection
 */
export async function updateInventoryConnection(
  id: string,
  updates: Partial<Omit<InventoryConnection, 'id' | 'created_at' | 'updated_at'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { ...updates };
    
    if (updates.api_key_encrypted) {
      updateData.api_key_encrypted = encryptApiKey(updates.api_key_encrypted);
    }

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('inventory_connections')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete inventory connection
 */
export async function deleteInventoryConnection(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('inventory_connections')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

