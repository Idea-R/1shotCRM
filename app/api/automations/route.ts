import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndPermission } from '@/lib/api-auth';
import { supabase } from '@/lib/supabase';
import { triggerAutomation } from '@/lib/automation-engine';
import { logAction } from '@/lib/audit-logger';
import { Automation, AutomationAction } from '@/lib/automation-engine';

/**
 * Automations API Routes
 */
export async function GET(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'settings:read');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organization_id');
    const includeRuns = searchParams.get('include_runs') === 'true';

    let query = supabase
      .from('automations')
      .select(includeRuns ? '*, automation_runs(*)' : '*')
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;

    if (error) throw error;

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
    const { name, trigger_type, trigger_config, actions, organization_id } = body;

    if (!name || !trigger_type || !actions || !Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'name, trigger_type, and actions array are required' },
        { status: 400 }
      );
    }

    // Validate actions
    for (const action of actions) {
      if (!action.type || !action.config) {
        return NextResponse.json(
          { success: false, error: 'Each action must have type and config' },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('automations')
      .insert({
        name,
        trigger_type,
        trigger_config: trigger_config || {},
        actions: actions as AutomationAction[],
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
      'automation',
      data.id,
      { name, trigger_type, actions_count: actions.length },
      req
    );

    return NextResponse.json({ success: true, data });
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
    const { id, name, trigger_type, trigger_config, actions, active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (trigger_type !== undefined) updateData.trigger_type = trigger_type;
    if (trigger_config !== undefined) updateData.trigger_config = trigger_config;
    if (actions !== undefined) {
      if (!Array.isArray(actions) || actions.length === 0) {
        return NextResponse.json(
          { success: false, error: 'actions must be a non-empty array' },
          { status: 400 }
        );
      }
      updateData.actions = actions;
    }
    if (active !== undefined) updateData.active = active;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('automations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await logAction(
      authResult.user.id,
      'update',
      'automation',
      id,
      updateData,
      req
    );

    return NextResponse.json({ success: true, data });
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
      .from('automations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Log action
    await logAction(
      authResult.user.id,
      'delete',
      'automation',
      id,
      {},
      req
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

