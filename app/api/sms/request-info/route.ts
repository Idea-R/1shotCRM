import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndPermission } from '@/lib/api-auth';
import { sendInfoRequestSMS, linkSMSToService, linkSMSToContact, getSMSThread, getServiceSMSTreads } from '@/lib/sms-request';
import { logAction } from '@/lib/audit-logger';

/**
 * SMS Request API Routes
 */
export async function POST(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'services:write');
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { phone_number, missing_fields, service_id, contact_id, service_title, contact_name } = body;

    if (!phone_number || !missing_fields || missing_fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'phone_number and missing_fields are required' },
        { status: 400 }
      );
    }

    // Send SMS
    const result = await sendInfoRequestSMS(
      phone_number,
      missing_fields,
      service_title,
      contact_name
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Link to service if provided
    if (service_id && result.threadId) {
      await linkSMSToService(result.threadId, service_id);
    }

    // Link to contact if provided
    if (contact_id && result.threadId) {
      await linkSMSToContact(result.threadId, contact_id);
    }

    // Log action
    await logAction(
      authResult.user.id,
      'create',
      'sms_request',
      result.threadId || null,
      { 
        phone_number,
        service_id,
        contact_id,
        missing_fields_count: missing_fields.length,
      },
      req
    );

    return NextResponse.json({
      success: true,
      data: { thread_id: result.threadId },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'services:read');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const threadId = searchParams.get('thread_id');
    const serviceId = searchParams.get('service_id');

    if (threadId) {
      const thread = await getSMSThread(threadId);
      return NextResponse.json({
        success: true,
        data: thread,
      });
    }

    if (serviceId) {
      const threads = await getServiceSMSTreads(serviceId);
      return NextResponse.json({
        success: true,
        data: threads,
      });
    }

    return NextResponse.json(
      { success: false, error: 'thread_id or service_id is required' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

