import { NextRequest, NextResponse } from 'next/server';
import { requireAuthAndPermission } from '@/lib/api-auth';
import { analyzeServiceRequest, storeTriageResult, getTriageResult, ServiceRequestData } from '@/lib/ai-triage';
import { logAction } from '@/lib/audit-logger';

/**
 * AI Triage API Routes
 */
export async function POST(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'services:write');
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { service_id, service_data } = body;

    if (!service_id || !service_data) {
      return NextResponse.json(
        { success: false, error: 'service_id and service_data are required' },
        { status: 400 }
      );
    }

    // Analyze service request
    const triageResult = await analyzeServiceRequest(service_data as ServiceRequestData);

    // Store triage result
    await storeTriageResult(service_id, triageResult);

    // Log action
    await logAction(
      authResult.user.id,
      'create',
      'ai_triage',
      service_id,
      { 
        urgency: triageResult.extractedInfo.urgency,
        missingFieldsCount: triageResult.missingFields.length,
        matchedSheetsCount: triageResult.matchedServiceSheets.length,
      },
      req
    );

    return NextResponse.json({
      success: true,
      data: triageResult,
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
    const serviceId = searchParams.get('service_id');

    if (!serviceId) {
      return NextResponse.json(
        { success: false, error: 'service_id is required' },
        { status: 400 }
      );
    }

    const triageResult = await getTriageResult(serviceId);

    return NextResponse.json({
      success: true,
      data: triageResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

