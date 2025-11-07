import { Contact, Deal } from './supabase';

export interface TemplateVariables {
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  company?: string;
  deal_title?: string;
  deal_value?: string;
  deal_stage?: string;
  [key: string]: string | undefined;
}

/**
 * Replace template variables in a string with actual values
 * Supports variables like {{contact_name}}, {{deal_title}}, etc.
 */
export function replaceTemplateVariables(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;
  
  // Replace all {{variable}} patterns
  Object.keys(variables).forEach((key) => {
    const value = variables[key] || '';
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  
  return result;
}

/**
 * Extract available variables from a template string
 */
export function extractVariables(template: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }
  
  return variables;
}

/**
 * Build template variables from contact and/or deal
 */
export function buildTemplateVariables(
  contact?: Contact,
  deal?: Deal
): TemplateVariables {
  const variables: TemplateVariables = {};
  
  if (contact) {
    variables.contact_name = contact.name || '';
    variables.contact_email = contact.email || '';
    variables.contact_phone = contact.phone || '';
    variables.company = contact.company || '';
  }
  
  if (deal) {
    variables.deal_title = deal.title || '';
    variables.deal_value = deal.value ? `$${deal.value.toFixed(2)}` : '$0.00';
    variables.deal_stage = deal.stage?.name || '';
  }
  
  return variables;
}

/**
 * Get list of available template variables with descriptions
 */
export function getAvailableVariables(): Array<{ key: string; description: string }> {
  return [
    { key: 'contact_name', description: 'Contact full name' },
    { key: 'contact_email', description: 'Contact email address' },
    { key: 'contact_phone', description: 'Contact phone number' },
    { key: 'company', description: 'Contact company name' },
    { key: 'deal_title', description: 'Deal title' },
    { key: 'deal_value', description: 'Deal value (formatted as currency)' },
    { key: 'deal_stage', description: 'Current pipeline stage' },
  ];
}

