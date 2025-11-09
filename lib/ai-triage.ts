import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

// Lazy initialization for OpenAI client
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiInstance = new OpenAI({ apiKey });
  }
  return openaiInstance;
}

export interface TriageResult {
  extractedInfo: {
    applianceType?: string;
    applianceBrand?: string;
    applianceModel?: string;
    issueDescription: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    estimatedCost?: number;
  };
  missingFields: Array<{
    field: string;
    reason: string;
    required: boolean;
  }>;
  matchedServiceSheets: Array<{
    id: string;
    file_name: string;
    url: string;
    relevance_score: number;
  }>;
  recommendations: string[];
}

export interface ServiceRequestData {
  title: string;
  description?: string;
  contactName?: string;
  applianceType?: string;
  applianceBrand?: string;
  applianceModel?: string;
  serviceDate?: string;
}

/**
 * Analyze a service request using AI triage
 */
export async function analyzeServiceRequest(
  serviceData: ServiceRequestData
): Promise<TriageResult> {
  try {
    const openai = getOpenAI();

    // Build prompt for GPT-4o-mini
    const prompt = `You are an AI assistant helping to triage service requests for an appliance repair company.

Service Request Details:
- Title: ${serviceData.title}
- Description: ${serviceData.description || 'No description provided'}
- Contact: ${serviceData.contactName || 'Unknown'}
- Appliance Type: ${serviceData.applianceType || 'Not specified'}
- Appliance Brand: ${serviceData.applianceBrand || 'Not specified'}
- Appliance Model: ${serviceData.applianceModel || 'Not specified'}
- Service Date: ${serviceData.serviceDate || 'Not scheduled'}

Please analyze this service request and provide:
1. Extract all available information (appliance type, brand, model, issue description, urgency level, estimated cost if mentioned)
2. Identify missing critical information (e.g., model number, serial number, specific symptoms, error codes)
3. Determine urgency level based on the description (low, medium, high, critical)
4. Provide recommendations for next steps

Respond in JSON format with this structure:
{
  "extractedInfo": {
    "applianceType": "string or null",
    "applianceBrand": "string or null",
    "applianceModel": "string or null",
    "issueDescription": "string",
    "urgency": "low|medium|high|critical",
    "estimatedCost": "number or null"
  },
  "missingFields": [
    {
      "field": "string (e.g., 'model_number', 'serial_number', 'error_code')",
      "reason": "string (why this field is needed)",
      "required": "boolean"
    }
  ],
  "recommendations": ["string array of recommendations"]
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant that analyzes service requests for an appliance repair company. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    const parsedResult = JSON.parse(content) as Omit<TriageResult, 'matchedServiceSheets'>;

    // Find matching service sheets based on extracted info
    const matchedSheets = await findMatchingServiceSheets(parsedResult.extractedInfo);

    return {
      ...parsedResult,
      matchedServiceSheets: matchedSheets,
    };
  } catch (error: any) {
    console.error('Error in AI triage:', error);
    throw new Error(`AI triage failed: ${error.message}`);
  }
}

/**
 * Find service sheets that match the extracted information
 */
async function findMatchingServiceSheets(
  extractedInfo: TriageResult['extractedInfo']
): Promise<TriageResult['matchedServiceSheets']> {
  try {
    const searchTerms: string[] = [];
    
    if (extractedInfo.applianceType) {
      searchTerms.push(extractedInfo.applianceType.toLowerCase());
    }
    if (extractedInfo.applianceBrand) {
      searchTerms.push(extractedInfo.applianceBrand.toLowerCase());
    }
    if (extractedInfo.applianceModel) {
      searchTerms.push(extractedInfo.applianceModel.toLowerCase());
    }

    if (searchTerms.length === 0) {
      return [];
    }

    // Search for service sheets with matching tags or file names
    const { data: sheets, error } = await supabase
      .from('attachments')
      .select('id, file_name, file_path, tags')
      .eq('entity_type', 'service_sheet')
      .limit(20);

    if (error || !sheets) {
      return [];
    }

    // Score relevance based on matches
    const scoredSheets = sheets
      .map((sheet) => {
        const fileName = sheet.file_name.toLowerCase();
        const tags = (sheet.tags || []).map((t: string) => t.toLowerCase());
        const allText = [fileName, ...tags].join(' ');

        let score = 0;
        for (const term of searchTerms) {
          if (allText.includes(term)) {
            score += 1;
          }
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('service-sheets')
          .getPublicUrl(sheet.file_path);

        return {
          id: sheet.id,
          file_name: sheet.file_name,
          url: urlData.publicUrl,
          relevance_score: score / searchTerms.length, // Normalize to 0-1
        };
      })
      .filter((sheet) => sheet.relevance_score > 0)
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, 5); // Top 5 matches

    return scoredSheets;
  } catch (error) {
    console.error('Error finding matching service sheets:', error);
    return [];
  }
}

/**
 * Store triage result in service record
 */
export async function storeTriageResult(
  serviceId: string,
  triageResult: TriageResult
): Promise<void> {
  try {
    const { error } = await supabase
      .from('services')
      .update({ triage_result: triageResult })
      .eq('id', serviceId);

    if (error) {
      throw error;
    }
  } catch (error: any) {
    console.error('Error storing triage result:', error);
    throw new Error(`Failed to store triage result: ${error.message}`);
  }
}

/**
 * Get triage result for a service
 */
export async function getTriageResult(serviceId: string): Promise<TriageResult | null> {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('triage_result')
      .eq('id', serviceId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.triage_result as TriageResult | null;
  } catch (error) {
    console.error('Error getting triage result:', error);
    return null;
  }
}

