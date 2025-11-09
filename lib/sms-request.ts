import { sendSMS } from '@/lib/twilio-service';
import { supabase } from '@/lib/supabase';

export interface SMSMessage {
  id: string;
  direction: 'outbound' | 'inbound';
  body: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sent_at: string;
  twilio_sid?: string;
}

export interface SMSThread {
  id: string;
  service_id?: string;
  contact_id?: string;
  phone_number: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'responded';
  messages: SMSMessage[];
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Send SMS requesting missing information
 */
export async function sendInfoRequestSMS(
  phoneNumber: string,
  missingFields: Array<{ field: string; reason: string }>,
  serviceTitle?: string,
  contactName?: string
): Promise<{ success: boolean; threadId?: string; error?: string }> {
  try {
    // Build SMS message
    const fieldsList = missingFields
      .slice(0, 5) // Limit to 5 fields
      .map((f) => `• ${f.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`)
      .join('\n');

    const message = `Hi${contactName ? ` ${contactName}` : ''}!

We need some additional information for your service request${serviceTitle ? `: ${serviceTitle}` : ''}:

${fieldsList}

${missingFields.length > 5 ? `\n...and ${missingFields.length - 5} more field(s).` : ''}

Please reply with this information, or call us if you have questions.

Thank you!`;

    // Send SMS via Twilio
    const result = await sendSMS({ to: phoneNumber, body: message });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Create or update SMS thread
    const threadData = {
      phone_number: phoneNumber,
      status: 'sent' as const,
      messages: [
        {
          id: `msg-${Date.now()}`,
          direction: 'outbound' as const,
          body: message,
          status: 'sent' as const,
          sent_at: new Date().toISOString(),
          twilio_sid: result.messageId,
        },
      ],
      last_message_at: new Date().toISOString(),
    };

    // Try to find existing thread
    const { data: existingThread } = await supabase
      .from('sms_threads')
      .select('id')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let threadId: string;

    if (existingThread) {
      // Update existing thread
      const { data, error } = await supabase
        .from('sms_threads')
        .update({
          ...threadData,
      messages: [
        ...((existingThread as any).messages || []),
        threadData.messages[0],
      ],
        })
        .eq('id', existingThread.id)
        .select()
        .single();

      if (error) throw error;
      threadId = data.id;
    } else {
      // Create new thread
      const { data, error } = await supabase
        .from('sms_threads')
        .insert(threadData)
        .select()
        .single();

      if (error) throw error;
      threadId = data.id;
    }

    return { success: true, threadId };
  } catch (error: any) {
    console.error('Error sending info request SMS:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Link SMS thread to service
 */
export async function linkSMSToService(
  threadId: string,
  serviceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('sms_threads')
      .update({ service_id: serviceId })
      .eq('id', threadId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Link SMS thread to contact
 */
export async function linkSMSToContact(
  threadId: string,
  contactId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('sms_threads')
      .update({ contact_id: contactId })
      .eq('id', threadId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get SMS thread by ID
 */
export async function getSMSThread(threadId: string): Promise<SMSThread | null> {
  try {
    const { data, error } = await supabase
      .from('sms_threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as SMSThread;
  } catch (error) {
    console.error('Error getting SMS thread:', error);
    return null;
  }
}

/**
 * Get SMS threads for a service
 */
export async function getServiceSMSTreads(serviceId: string): Promise<SMSThread[]> {
  try {
    const { data, error } = await supabase
      .from('sms_threads')
      .select('*')
      .eq('service_id', serviceId)
      .order('last_message_at', { ascending: false });

    if (error) {
      return [];
    }

    return (data || []) as SMSThread[];
  } catch (error) {
    console.error('Error getting service SMS threads:', error);
    return [];
  }
}

