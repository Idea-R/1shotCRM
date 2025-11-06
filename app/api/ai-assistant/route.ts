import { NextRequest, NextResponse } from 'next/server';
import openai from '@/lib/openai';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    if (!openai) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const { message, messages } = await req.json();

    // Get current CRM data for context
    const [contactsRes, dealsRes, tasksRes] = await Promise.all([
      supabase.from('contacts').select('id, name, email').limit(10),
      supabase.from('deals').select('id, title, value, stage_id').limit(10),
      supabase.from('tasks').select('id, title, completed, due_date').limit(10),
    ]);

    const contacts = contactsRes.data || [];
    const deals = dealsRes.data || [];
    const tasks = tasksRes.data || [];

    // Build context for AI
    const context = `
You are an AI assistant for a CRM system. Here's the current state:

Contacts: ${contacts.length} contacts
Deals: ${deals.length} deals
Tasks: ${tasks.length} tasks

You can help users:
1. Create contacts, deals, or tasks
2. Answer questions about their CRM data
3. Update existing records
4. Provide insights and suggestions

User query: ${message}

Respond naturally and helpfully. If the user wants to create or modify data, acknowledge it and explain what you'll do.
`;

    // Check if user wants to perform an action
    const lowerMessage = message.toLowerCase();
    
    // Handle create operations
    if (lowerMessage.includes('create') || lowerMessage.includes('add') || lowerMessage.includes('make')) {
      let actionResult = null;

      if (lowerMessage.includes('contact') || lowerMessage.includes('person')) {
        // Extract contact info from message
        const nameMatch = message.match(/(?:name|called|named)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
        const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i);
        const phoneMatch = message.match(/(\+?[\d\s\-\(\)]{10,})/);
        
        if (nameMatch) {
          const { data, error } = await supabase
            .from('contacts')
            .insert({
              name: nameMatch[1],
              email: emailMatch ? emailMatch[1] : null,
              phone: phoneMatch ? phoneMatch[1] : null,
            })
            .select()
            .single();

          if (!error && data) {
            actionResult = `✅ Created contact: ${data.name}`;
          }
        }
      } else if (lowerMessage.includes('deal') || lowerMessage.includes('opportunity')) {
        // Extract deal info
        const titleMatch = message.match(/(?:deal|opportunity)[\s\w]+(?:called|named|for|about)\s+([^.!?]+)/i);
        const valueMatch = message.match(/\$?([\d,]+)/);
        
        if (titleMatch) {
          const { data: stages } = await supabase.from('pipeline_stages').select('id').order('order').limit(1);
          const stageId = stages && stages[0] ? stages[0].id : null;

          const { data, error } = await supabase
            .from('deals')
            .insert({
              title: titleMatch[1].trim(),
              value: valueMatch ? parseFloat(valueMatch[1].replace(/,/g, '')) : 0,
              stage_id: stageId,
            })
            .select()
            .single();

          if (!error && data) {
            actionResult = `✅ Created deal: ${data.title}`;
          }
        }
      } else if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
        const titleMatch = message.match(/(?:task|todo)[\s\w]+(?:called|named|for|about|to)\s+([^.!?]+)/i);
        
        if (titleMatch) {
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              title: titleMatch[1].trim(),
              completed: false,
            })
            .select()
            .single();

          if (!error && data) {
            actionResult = `✅ Created task: ${data.title}`;
          }
        }
      }

      if (actionResult) {
        return NextResponse.json({ success: true, response: actionResult });
      }
    }

    // Handle query operations with GPT
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using gpt-4o-mini as GPT-5 Mini doesn't exist yet
      messages: [
        {
          role: 'system',
          content: context,
        },
        ...(messages || []).map((m: { role: string; content: string }) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    return NextResponse.json({ success: true, response });
  } catch (error: any) {
    console.error('AI Assistant error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An error occurred' },
      { status: 500 }
    );
  }
}

