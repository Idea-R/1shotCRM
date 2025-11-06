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
    const lowerMessage = message.toLowerCase();

    // Fetch ALL CRM data with full details
    const [contactsRes, dealsRes, tasksRes, stagesRes, activitiesRes] = await Promise.all([
      supabase.from('contacts').select('*').order('created_at', { ascending: false }),
      supabase.from('deals').select('*, contact:contacts(*), stage:pipeline_stages(*)').order('created_at', { ascending: false }),
      supabase.from('tasks').select('*, contact:contacts(*), deal:deals(*)').order('created_at', { ascending: false }),
      supabase.from('pipeline_stages').select('*').order('order'),
      supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    const contacts = contactsRes.data || [];
    const deals = dealsRes.data || [];
    const tasks = tasksRes.data || [];
    const stages = stagesRes.data || [];
    const activities = activitiesRes.data || [];

    // Build comprehensive context with ALL CRM data
    const contactsData = contacts.map(c => ({
      name: c.name,
      email: c.email || 'No email',
      phone: c.phone || 'No phone',
      company: c.company || 'No company',
      id: c.id,
    }));

    const dealsData = deals.map(d => ({
      title: d.title,
      value: d.value || 0,
      stage: d.stage?.name || 'No stage',
      probability: d.probability || 0,
      contact: d.contact?.name || 'No contact',
      expected_close_date: d.expected_close_date || 'Not set',
      id: d.id,
    }));

    const tasksData = tasks.map(t => ({
      title: t.title,
      completed: t.completed,
      due_date: t.due_date || 'No due date',
      contact: t.contact?.name || null,
      deal: t.deal?.title || null,
    }));

    const stagesData = stages.map(s => ({
      name: s.name,
      order: s.order,
      color: s.color,
    }));

    // Analyze data for insights
    const totalDealsValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    const hotLeads = deals.filter(d => {
      const stageName = d.stage?.name?.toLowerCase() || '';
      return (stageName === 'qualified' || stageName === 'proposal' || stageName === 'negotiation') && 
             (d.probability || 0) >= 50;
    });
    const wonDeals = deals.filter(d => d.stage?.name?.toLowerCase() === 'won');
    const lostDeals = deals.filter(d => d.stage?.name?.toLowerCase() === 'lost');
    const activeDeals = deals.filter(d => {
      const stageName = d.stage?.name?.toLowerCase() || '';
      return stageName !== 'won' && stageName !== 'lost';
    });
    const overdueTasks = tasks.filter(t => !t.completed && t.due_date && new Date(t.due_date) < new Date());

    // Build comprehensive context
    const context = `You are an AI assistant for a CRM system with FULL access to all CRM data. Here's the complete current state:

=== CONTACTS (${contacts.length} total) ===
${contactsData.length > 0 ? JSON.stringify(contactsData, null, 2) : 'No contacts yet'}

=== DEALS (${deals.length} total) ===
${dealsData.length > 0 ? JSON.stringify(dealsData, null, 2) : 'No deals yet'}

=== TASKS (${tasks.length} total) ===
${tasksData.length > 0 ? JSON.stringify(tasksData, null, 2) : 'No tasks yet'}

=== PIPELINE STAGES ===
${stagesData.map(s => `${s.name} (order: ${s.order})`).join(', ')}

=== KEY INSIGHTS ===
- Total Deal Value: $${totalDealsValue.toLocaleString()}
- Hot Leads (Qualified/Proposal/Negotiation with >50% probability): ${hotLeads.length}
- Won Deals: ${wonDeals.length}
- Lost Deals: ${lostDeals.length}
- Active Deals: ${activeDeals.length}
- Overdue Tasks: ${overdueTasks.length}

=== CAPABILITIES ===
You can:
1. Answer ANY question about contacts (names, emails, phone numbers, companies)
2. Answer ANY question about deals (what deals exist, their values, stages, probabilities, contacts)
3. Identify hot leads, won deals, lost deals
4. Answer questions about tasks and their status
5. Create contacts, deals, or tasks
6. Update existing records
7. Provide insights and recommendations
8. Analyze pipeline health and performance

User query: ${message}

Respond naturally and helpfully. When answering questions, provide specific details from the data above. Be conversational but informative.`;

    // Handle create operations
    if (lowerMessage.includes('create') || lowerMessage.includes('add') || lowerMessage.includes('make')) {
      let actionResult = null;

      if (lowerMessage.includes('contact') || lowerMessage.includes('person')) {
        // Improved name extraction - try multiple patterns
        const namePatterns = [
          /(?:name|called|named)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
          /create\s+(?:a\s+)?contact\s+(?:named|called|for)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
          /contact\s+(?:named|called)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        ];
        
        let nameMatch = null;
        for (const pattern of namePatterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            nameMatch = match[1].trim();
            // Remove common trailing phrases
            nameMatch = nameMatch.replace(/\s+with\s+email.*$/i, '');
            nameMatch = nameMatch.replace(/\s+email.*$/i, '');
            nameMatch = nameMatch.replace(/\s+phone.*$/i, '');
            break;
          }
        }
        
        const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i);
        const phoneMatch = message.match(/(\+?[\d\s\-\(\)]{10,})/);
        const companyMatch = message.match(/(?:company|works?\s+at|from)\s+([A-Z][a-zA-Z0-9\s&]+)/i);
        
        if (nameMatch) {
          const { data, error } = await supabase
            .from('contacts')
            .insert({
              name: nameMatch,
              email: emailMatch ? emailMatch[1] : null,
              phone: phoneMatch ? phoneMatch[1] : null,
              company: companyMatch ? companyMatch[1] : null,
            })
            .select()
            .single();

          if (!error && data) {
            actionResult = `✅ Created contact: ${data.name}${data.email ? ` (${data.email})` : ''}${data.phone ? ` - Phone: ${data.phone}` : ''}${data.company ? ` at ${data.company}` : ''}`;
          } else {
            actionResult = `❌ Error creating contact: ${error?.message || 'Unknown error'}`;
          }
        }
      } else if (lowerMessage.includes('deal') || lowerMessage.includes('opportunity')) {
        const titleMatch = message.match(/(?:deal|opportunity)[\s\w]+(?:called|named|for|about)\s+([^.!?]+)/i) ||
                          message.match(/create\s+(?:a\s+)?deal\s+(?:called|named|for|about)?\s*([^.!?]+)/i);
        const valueMatch = message.match(/\$?([\d,]+(?:\.[\d]{2})?)/);
        const contactMatch = message.match(/(?:contact|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
        
        let contactId = null;
        if (contactMatch) {
          const contact = contacts.find(c => c.name.toLowerCase().includes(contactMatch[1].toLowerCase()));
          if (contact) contactId = contact.id;
        }
        
        if (titleMatch) {
          const { data: stages } = await supabase.from('pipeline_stages').select('id').order('order').limit(1);
          const stageId = stages && stages[0] ? stages[0].id : null;

          const { data, error } = await supabase
            .from('deals')
            .insert({
              title: titleMatch[1].trim(),
              value: valueMatch ? parseFloat(valueMatch[1].replace(/,/g, '')) : 0,
              stage_id: stageId,
              contact_id: contactId,
            })
            .select()
            .single();

          if (!error && data) {
            actionResult = `✅ Created deal: ${data.title}${valueMatch ? ` ($${parseFloat(valueMatch[1].replace(/,/g, '')).toLocaleString()})` : ''}`;
          } else {
            actionResult = `❌ Error creating deal: ${error?.message || 'Unknown error'}`;
          }
        }
      } else if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
        const titleMatch = message.match(/(?:task|todo)[\s\w]+(?:called|named|for|about|to)\s+([^.!?]+)/i) ||
                          message.match(/create\s+(?:a\s+)?task\s+(?:called|named|for|about|to)?\s*([^.!?]+)/i);
        const dueDateMatch = message.match(/(?:due|by)\s+([A-Z][a-z]+\s+\d{1,2})/i);
        
        if (titleMatch) {
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              title: titleMatch[1].trim(),
              completed: false,
              due_date: dueDateMatch ? new Date(dueDateMatch[1]).toISOString() : null,
            })
            .select()
            .single();

          if (!error && data) {
            actionResult = `✅ Created task: ${data.title}`;
          } else {
            actionResult = `❌ Error creating task: ${error?.message || 'Unknown error'}`;
          }
        }
      }

      if (actionResult) {
        return NextResponse.json({ success: true, response: actionResult });
      }
    }

    // Handle query operations with GPT - now with full CRM data
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: context,
        },
        ...(messages || []).slice(-10).map((m: { role: string; content: string }) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: 1000,
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
