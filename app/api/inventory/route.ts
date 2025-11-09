import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndPermission } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';
import { syncInventory, getInventoryItems, createInventoryConnection, updateInventoryConnection, deleteInventoryConnection } from '@/lib/inventory-service';
import { logAction } from '@/lib/audit-logger';

/**
 * Inventory API Routes
 */
export async function GET(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'settings:read');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'connections' or 'items'
    const connectionId = searchParams.get('connection_id');
    const search = searchParams.get('search');

    if (type === 'connections') {
      const { data, error } = await supabase
        .from('inventory_connections')
        .select('id, organization_id, provider, api_endpoint, active, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json({ success: true, data });
    } else {
      // Get inventory items
      const items = await getInventoryItems(connectionId || undefined, search || undefined);
      return NextResponse.json({ success: true, data: items });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'settings:write');
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { action, ...data } = body;

    if (action === 'sync') {
      // Sync inventory
      const { connection_id, sync_type } = data;
      if (!connection_id) {
        return NextResponse.json(
          { success: false, error: 'connection_id is required' },
          { status: 400 }
        );
      }

      const result = await syncInventory(connection_id, sync_type || 'incremental');

      // Log action
      await logAction(
        authResult.user.id,
        'create',
        'inventory_sync',
        connection_id,
        { sync_type: sync_type || 'incremental', items_synced: result.itemsSynced },
        req
      );

      return NextResponse.json({ success: result.success, data: result });
    } else {
      // Create connection
      const { organization_id, provider, api_endpoint, api_key, config } = data;

      if (!organization_id || !provider || !api_endpoint || !api_key) {
        return NextResponse.json(
          { success: false, error: 'organization_id, provider, api_endpoint, and api_key are required' },
          { status: 400 }
        );
      }

      const result = await createInventoryConnection({
        organization_id,
        provider,
        api_endpoint,
        api_key_encrypted: api_key, // Will be encrypted in service
        config: config || {},
        active: true,
      });

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      // Log action
      await logAction(
        authResult.user.id,
        'create',
        'inventory_connection',
        result.id,
        { provider, api_endpoint },
        req
      );

      return NextResponse.json({ success: true, data: { id: result.id } });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'settings:write');
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const result = await updateInventoryConnection(id, updates);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Log action
    await logAction(
      authResult.user.id,
      'update',
      'inventory_connection',
      id,
      updates,
      req
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'settings:write');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const result = await deleteInventoryConnection(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Log action
    await logAction(
      authResult.user.id,
      'delete',
      'inventory_connection',
      id,
      {},
      req
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

