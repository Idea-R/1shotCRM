import { NextRequest, NextResponse } from 'next/server';
import { triggerAutomation } from '@/lib/automation-engine';

/**
 * Test automation endpoint
 * Allows testing automations with sample data
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { automation_id, trigger_type, trigger_data, organization_id } = body;

    if (!automation_id || !trigger_type || !trigger_data) {
      return NextResponse.json(
        { success: false, error: 'automation_id, trigger_type, and trigger_data are required' },
        { status: 400 }
      );
    }

    // Trigger automation
    await triggerAutomation(trigger_type as any, trigger_data, organization_id);

    return NextResponse.json({
      success: true,
      message: 'Automation triggered successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

