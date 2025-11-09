import { indexedDB } from './indexed-db';
import { supabase } from './supabase';

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entity_type: string;
  entity_id?: string;
  payload: any;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retry_count: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Add item to sync queue (both IndexedDB and server)
 */
export async function addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'status' | 'retry_count' | 'created_at' | 'updated_at'>): Promise<string> {
  // Add to IndexedDB first
  const id = await indexedDB.addSyncQueueItem({
    ...item,
    status: 'pending',
    retry_count: 0,
  });

  // Try to sync to server immediately if online
  if (navigator.onLine) {
    try {
      await syncToServer(id);
    } catch (error) {
      console.error('Failed to sync immediately:', error);
      // Will retry later
    }
  }

  return id;
}

/**
 * Sync a single item to server
 */
async function syncToServer(itemId: string): Promise<void> {
  const items = await indexedDB.getSyncQueueItems('pending');
  const item = items.find(i => i.id === itemId);
  
  if (!item) {
    return;
  }

  // Mark as syncing
  await indexedDB.updateSyncQueueItem(itemId, { status: 'syncing' });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('Not authenticated');
    }

    // Determine API endpoint based on entity_type
    const endpoint = getEndpointForEntityType(item.entity_type);
    if (!endpoint) {
      throw new Error(`Unknown entity type: ${item.entity_type}`);
    }

    let response: Response;

    if (item.operation === 'create') {
      response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(item.payload),
      });
    } else if (item.operation === 'update') {
      response = await fetch(`/api/${endpoint}?id=${item.entity_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(item.payload),
      });
    } else {
      // delete
      response = await fetch(`/api/${endpoint}?id=${item.entity_id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Sync failed');
    }

    // Mark as completed
    await indexedDB.updateSyncQueueItem(itemId, { status: 'completed' });

    // Also sync to server database
    await syncToServerDatabase(item);
  } catch (error: any) {
    const retryCount = (item.retry_count || 0) + 1;
    const maxRetries = 3;

    if (retryCount >= maxRetries) {
      await indexedDB.updateSyncQueueItem(itemId, {
        status: 'failed',
        retry_count: retryCount,
        error_message: error.message,
      });
    } else {
      await indexedDB.updateSyncQueueItem(itemId, {
        status: 'pending',
        retry_count: retryCount,
        error_message: error.message,
      });
    }

    throw error;
  }
}

/**
 * Sync item to server database sync_queue table
 */
async function syncToServerDatabase(item: SyncQueueItem): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    return;
  }

  await supabase.from('sync_queue').insert({
    user_id: session.user.id,
    operation: item.operation,
    entity_type: item.entity_type,
    entity_id: item.entity_id,
    payload: item.payload,
    status: 'completed',
    retry_count: item.retry_count,
  });
}

/**
 * Get endpoint for entity type
 */
function getEndpointForEntityType(entityType: string): string | null {
  const mapping: Record<string, string> = {
    contact: 'contacts',
    deal: 'deals',
    task: 'tasks',
    activity: 'activities',
    service: 'services',
    appliance: 'appliances',
    attachment: 'attachments',
  };

  return mapping[entityType] || null;
}

/**
 * Process all pending sync queue items
 */
export async function processSyncQueue(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const pendingItems = await indexedDB.getSyncQueueItems('pending');
  let synced = 0;
  let failed = 0;

  for (const item of pendingItems) {
    try {
      await syncToServer(item.id);
      synced++;
    } catch (error) {
      failed++;
      console.error(`Failed to sync item ${item.id}:`, error);
    }
  }

  return { synced, failed };
}

/**
 * Initialize background sync
 */
export function initBackgroundSync(): void {
  // Process queue when coming online
  window.addEventListener('online', () => {
    processSyncQueue();
  });

  // Process queue periodically (every 30 seconds)
  setInterval(() => {
    if (navigator.onLine) {
      processSyncQueue();
    }
  }, 30000);

  // Process queue on page visibility change
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && navigator.onLine) {
      processSyncQueue();
    }
  });
}

/**
 * Get sync status
 */
export async function getSyncStatus(): Promise<{
  pending: number;
  syncing: number;
  failed: number;
}> {
  const [pending, syncing, failed] = await Promise.all([
    indexedDB.getSyncQueueItems('pending'),
    indexedDB.getSyncQueueItems('syncing'),
    indexedDB.getSyncQueueItems('failed'),
  ]);

  return {
    pending: pending.length,
    syncing: syncing.length,
    failed: failed.length,
  };
}

