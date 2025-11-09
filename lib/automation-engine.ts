import { supabase } from './supabase';
import { triggerWebhookEvent } from './webhook-service';
import { sendEmail } from './email-service';
import { sendSMS } from './twilio-service';

export interface Automation {
  id: string;
  organization_id?: string;
  name: string;
  trigger_type: 'service_created' | 'service_updated' | 'contact_created' | 'deal_stage_changed' | 'task_completed';
  trigger_config: Record<string, any>;
  actions: AutomationAction[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutomationAction {
  type: 'send_email' | 'send_sms' | 'create_task' | 'update_field' | 'call_webhook';
  config: Record<string, any>;
}

export interface AutomationRun {
  id: string;
  automation_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input_data: Record<string, any>;
  output_data?: Record<string, any>;
  error?: string;
  created_at: string;
  completed_at?: string;
}

/**
 * Execute automation actions
 */
export async function executeAutomationActions(
  automation: Automation,
  triggerData: Record<string, any>
): Promise<{ success: boolean; results: any[]; error?: string }> {
  const results: any[] = [];

  try {
    for (const action of automation.actions) {
      let result: any;

      switch (action.type) {
        case 'send_email':
          result = await executeSendEmailAction(action.config, triggerData);
          break;
        case 'send_sms':
          result = await executeSendSMSAction(action.config, triggerData);
          break;
        case 'create_task':
          result = await executeCreateTaskAction(action.config, triggerData);
          break;
        case 'update_field':
          result = await executeUpdateFieldAction(action.config, triggerData);
          break;
        case 'call_webhook':
          result = await executeCallWebhookAction(action.config, triggerData);
          break;
        default:
          result = { success: false, error: `Unknown action type: ${action.type}` };
      }

      results.push(result);
    }

    return { success: true, results };
  } catch (error: any) {
    return { success: false, results, error: error.message };
  }
}

/**
 * Execute send email action
 */
async function executeSendEmailAction(
  config: Record<string, any>,
  triggerData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const to = replacePlaceholders(config.to, triggerData);
    const subject = replacePlaceholders(config.subject || '', triggerData);
    const body = replacePlaceholders(config.body || '', triggerData);

    if (!to) {
      return { success: false, error: 'Email recipient not specified' };
    }

    const result = await sendEmail({
      to,
      subject,
      html: body,
    });

    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute send SMS action
 */
async function executeSendSMSAction(
  config: Record<string, any>,
  triggerData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const to = replacePlaceholders(config.to, triggerData);
    const body = replacePlaceholders(config.body || '', triggerData);

    if (!to) {
      return { success: false, error: 'SMS recipient not specified' };
    }

    const result = await sendSMS({ to, body });
    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute create task action
 */
async function executeCreateTaskAction(
  config: Record<string, any>,
  triggerData: Record<string, any>
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    const title = replacePlaceholders(config.title || '', triggerData);
    const description = replacePlaceholders(config.description || '', triggerData);
    const contactId = config.contact_id || triggerData.contact_id;
    const dealId = config.deal_id || triggerData.deal_id;
    const dueDate = config.due_date ? replacePlaceholders(config.due_date, triggerData) : null;

    if (!title) {
      return { success: false, error: 'Task title not specified' };
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description: description || null,
        contact_id: contactId || null,
        deal_id: dealId || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        completed: false,
      })
      .select()
      .single();

    if (error) throw error;

    return { success: true, taskId: data.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute update field action
 */
async function executeUpdateFieldAction(
  config: Record<string, any>,
  triggerData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const entityType = config.entity_type || triggerData.entity_type;
    const entityId = config.entity_id || triggerData.entity_id || triggerData.id;
    const field = config.field;
    const value = replacePlaceholders(config.value || '', triggerData);

    if (!entityType || !entityId || !field) {
      return { success: false, error: 'Entity type, ID, and field are required' };
    }

    const tableName = getTableNameForEntityType(entityType);
    if (!tableName) {
      return { success: false, error: `Unknown entity type: ${entityType}` };
    }

    const { error } = await supabase
      .from(tableName)
      .update({ [field]: value })
      .eq('id', entityId);

    if (error) throw error;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Execute call webhook action
 */
async function executeCallWebhookAction(
  config: Record<string, any>,
  triggerData: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = replacePlaceholders(config.url || '', triggerData);
    const payload = config.payload || triggerData;

    if (!url) {
      return { success: false, error: 'Webhook URL not specified' };
    }

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Replace placeholders in string with trigger data
 */
function replacePlaceholders(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = getNestedValue(data, key);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Get table name for entity type
 */
function getTableNameForEntityType(entityType: string): string | null {
  const mapping: Record<string, string> = {
    contact: 'contacts',
    deal: 'deals',
    task: 'tasks',
    service: 'services',
    appliance: 'appliances',
  };

  return mapping[entityType] || null;
}

/**
 * Trigger automation for event
 */
export async function triggerAutomation(
  triggerType: Automation['trigger_type'],
  triggerData: Record<string, any>,
  organizationId?: string
): Promise<void> {
  try {
    let query = supabase
      .from('automations')
      .select('*')
      .eq('active', true)
      .eq('trigger_type', triggerType);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: automations, error } = await query;

    if (error || !automations) {
      return;
    }

    for (const automation of automations) {
      // Check trigger config conditions if any
      if (automation.trigger_config && Object.keys(automation.trigger_config).length > 0) {
        const matches = checkTriggerConditions(automation.trigger_config, triggerData);
        if (!matches) {
          continue;
        }
      }

      // Create automation run record
      const { data: run, error: runError } = await supabase
        .from('automation_runs')
        .insert({
          automation_id: automation.id,
          status: 'pending',
          input_data: triggerData,
        })
        .select()
        .single();

      if (runError || !run) {
        console.error('Failed to create automation run:', runError);
        continue;
      }

      // Execute automation asynchronously
      executeAutomation(automation, run, triggerData).catch(console.error);
    }
  } catch (error) {
    console.error('Error triggering automation:', error);
  }
}

/**
 * Check if trigger conditions match
 */
function checkTriggerConditions(
  config: Record<string, any>,
  data: Record<string, any>
): boolean {
  for (const [key, value] of Object.entries(config)) {
    const dataValue = getNestedValue(data, key);
    if (dataValue !== value) {
      return false;
    }
  }
  return true;
}

/**
 * Execute automation
 */
async function executeAutomation(
  automation: Automation,
  run: AutomationRun,
  triggerData: Record<string, any>
): Promise<void> {
  try {
    // Update run status to running
    await supabase
      .from('automation_runs')
      .update({ status: 'running' })
      .eq('id', run.id);

    // Execute actions
    const result = await executeAutomationActions(automation, triggerData);

    // Update run status
    await supabase
      .from('automation_runs')
      .update({
        status: result.success ? 'completed' : 'failed',
        output_data: { results: result.results },
        error: result.error || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id);
  } catch (error: any) {
    await supabase
      .from('automation_runs')
      .update({
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run.id);
  }
}

