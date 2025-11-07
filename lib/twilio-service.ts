import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export interface SMSOptions {
  to: string;
  body: string;
}

export async function sendSMS(options: SMSOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!client || !fromNumber) {
      return { success: false, error: 'SMS service not configured' };
    }

    const message = await client.messages.create({
      body: options.body,
      from: fromNumber,
      to: options.to,
    });

    return { success: true, messageId: message.sid };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

