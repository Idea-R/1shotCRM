import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndPermission } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';
import { generateWebhookSecret, triggerWebhookEvent } from '@/lib/webhook-service';
import { logAction } from '@/lib/audit-logger';

/**
 * Webhooks API Routes
 */
export async function GET(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'settings:read');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organization_id');

    let query = supabase
      .from('webhooks')
      .select('id, url, events, active, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Don't return secrets in list
    return NextResponse.json({ success: true, data });
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
    const { url, events, organization_id } = body;

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { success: false, error: 'url and events array are required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const secret = generateWebhookSecret();

    const { data, error } = await supabase
      .from('webhooks')
      .insert({
        url,
        events,
        secret,
        active: true,
        organization_id: organization_id || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAction(
      authResult.user.id,
      'create',
      'webhook',
      data.id,
      { url, events, organization_id },
      req
    );

    // Return webhook without secret (client should save it securely)
    const { secret: _, ...webhookWithoutSecret } = data;
    return NextResponse.json({
      success: true,
      data: {
        ...webhookWithoutSecret,
        secret, // Include secret only on creation
      },
    });
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
    const { id, url, events, active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (url !== undefined) {
      try {
        new URL(url);
        updateData.url = url;
      } catch {
        return NextResponse.json(
          { success: false, error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }
    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return NextResponse.json(
          { success: false, error: 'events must be a non-empty array' },
          { status: 400 }
        );
      }
      updateData.events = events;
    }
    if (active !== undefined) {
      updateData.active = active;
    }
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('webhooks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAction(
      authResult.user.id,
      'update',
      'webhook',
      id,
      updateData,
      req
    );

    const { secret: _, ...webhookWithoutSecret } = data;
    return NextResponse.json({ success: true, data: webhookWithoutSecret });
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

    const { error } = await supabase
      .from('webhooks')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log action
    await logAction(
      authResult.user.id,
      'delete',
      'webhook',
      id,
      {},
      req
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

