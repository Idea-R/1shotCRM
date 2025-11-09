import crypto from 'crypto';
import { supabase } from './supabase';
import { logAction } from './audit-logger';

export interface Webhook {
  id: string;
  organization_id?: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  status: 'pending' | 'delivered' | 'failed';
  retry_count: number;
  next_retry_at?: string;
  response_status?: number;
  response_body?: string;
  error_message?: string;
  created_at: string;
  delivered_at?: string;
}

/**
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Deliver webhook event
 */
export async function deliverWebhook(
  webhook: Webhook,
  eventType: string,
  payload: any
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const payloadString = JSON.stringify(payload);
    const signature = generateWebhookSignature(payloadString, webhook.secret);

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': eventType,
        'X-Webhook-Id': webhook.id,
      },
      body: payloadString,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const responseText = await response.text().catch(() => '');
    const success = response.ok;

    // Log webhook delivery
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event_type: eventType,
      payload,
      response_status: response.status,
      response_body: responseText.substring(0, 1000), // Limit response body length
      error_message: success ? null : `HTTP ${response.status}: ${responseText.substring(0, 200)}`,
    });

    return {
      success,
      status: response.status,
      error: success ? undefined : `HTTP ${response.status}`,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';

    // Log webhook delivery failure
    await supabase.from('webhook_logs').insert({
      webhook_id: webhook.id,
      event_type: eventType,
      payload,
      response_status: null,
      response_body: null,
      error_message: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Create webhook delivery record
 */
export async function createWebhookDelivery(
  webhookId: string,
  eventType: string,
  payload: any
): Promise<string> {
  const { data, error } = await supabase
    .from('webhook_deliveries')
    .insert({
      webhook_id: webhookId,
      event_type: eventType,
      payload,
      status: 'pending',
      retry_count: 0,
      next_retry_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Process pending webhook deliveries
 */
export async function processWebhookDeliveries(): Promise<{ processed: number; failed: number }> {
  const { data: deliveries, error } = await supabase
    .from('webhook_deliveries')
    .select('*, webhook:webhooks(*)')
    .eq('status', 'pending')
    .lte('next_retry_at', new Date().toISOString())
    .limit(50);

  if (error || !deliveries) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const delivery of deliveries) {
    const webhook = delivery.webhook as Webhook;
    
    if (!webhook || !webhook.active) {
      continue;
    }

    try {
      const result = await deliverWebhook(webhook, delivery.event_type, delivery.payload);

      if (result.success) {
        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'delivered',
            response_status: result.status,
            delivered_at: new Date().toISOString(),
          })
          .eq('id', delivery.id);
        processed++;
      } else {
        const retryCount = delivery.retry_count + 1;
        const maxRetries = 5;
        const backoffSeconds = Math.min(300, Math.pow(2, retryCount) * 60); // Exponential backoff, max 5 minutes

        if (retryCount >= maxRetries) {
          await supabase
            .from('webhook_deliveries')
            .update({
              status: 'failed',
              retry_count: retryCount,
              error_message: result.error,
            })
            .eq('id', delivery.id);
          failed++;
        } else {
          await supabase
            .from('webhook_deliveries')
            .update({
              retry_count: retryCount,
              next_retry_at: new Date(Date.now() + backoffSeconds * 1000).toISOString(),
              error_message: result.error,
            })
            .eq('id', delivery.id);
        }
      }
    } catch (error: any) {
      const retryCount = delivery.retry_count + 1;
      if (retryCount >= 5) {
        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'failed',
            retry_count: retryCount,
            error_message: error.message,
          })
          .eq('id', delivery.id);
        failed++;
      } else {
        const backoffSeconds = Math.min(300, Math.pow(2, retryCount) * 60);
        await supabase
          .from('webhook_deliveries')
          .update({
            retry_count: retryCount,
            next_retry_at: new Date(Date.now() + backoffSeconds * 1000).toISOString(),
            error_message: error.message,
          })
          .eq('id', delivery.id);
      }
    }
  }

  return { processed, failed };
}

/**
 * Trigger webhook event for all matching webhooks
 */
export async function triggerWebhookEvent(
  eventType: string,
  payload: any,
  organizationId?: string
): Promise<void> {
  try {
    let query = supabase
      .from('webhooks')
      .select('*')
      .eq('active', true)
      .contains('events', [eventType]);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: webhooks, error } = await query;

    if (error || !webhooks) {
      return;
    }

    // Create delivery records for all matching webhooks
    for (const webhook of webhooks) {
      await createWebhookDelivery(webhook.id, eventType, payload);
    }

    // Process deliveries asynchronously (don't wait)
    processWebhookDeliveries().catch(console.error);
  } catch (error) {
    console.error('Error triggering webhook event:', error);
  }
}

/**
 * Generate webhook secret
 */
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

