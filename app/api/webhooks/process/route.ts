import { NextRequest, NextResponse } from 'next/server';
import { processWebhookDeliveries } from '@/lib/webhook-service';

/**
 * Background job endpoint to process webhook deliveries
 * Should be called via cron or scheduled task
 */
export async function POST(req: NextRequest) {
  try {
    // Simple auth check - in production, use a secret token
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.WEBHOOK_PROCESSOR_SECRET || 'secret'}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processWebhookDeliveries();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Allow GET for manual triggering
  return POST(req);
}

