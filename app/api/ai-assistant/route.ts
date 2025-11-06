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
          /(?:name|called|named)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)(?:\s+with|\s+and|\s+email|\s+phone|\s+@|$)/i,
          /create\s+(?:a\s+)?contact\s+(?:named|called|for)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)(?:\s+with|\s+and|\s+email|\s+phone|\s+@|$)/i,
          /contact\s+(?:named|called)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+?)(?:\s+with|\s+and|\s+email|\s+phone|\s+@|$)/i,
        ];
        
        let nameMatch = null;
        for (const pattern of namePatterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            nameMatch = match[1].trim();
            // Remove any trailing words that aren't part of the name
            nameMatch = nameMatch.replace(/\s+(with|and|email|phone|@).*$/i, '');
            break;
          }
        }
        
        // Fallback: if no match, try simpler pattern
        if (!nameMatch) {
          const simpleMatch = message.match(/(?:named|called|name)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i);
          if (simpleMatch) {
            nameMatch = simpleMatch[1].trim();
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
        // Enhanced task parsing - extract title, description, due date, contact, deal
        const titlePatterns = [
          /(?:task|todo)[\s\w]+(?:called|named|for|about|to)\s+([^.!?]+?)(?:\s+for|\s+due|\s+assigned|\s+@|$)/i,
          /create\s+(?:a\s+)?task\s+(?:called|named|for|about|to)?\s*([^.!?]+?)(?:\s+for|\s+due|\s+assigned|\s+@|$)/i,
          /task\s+to\s+([^.!?]+?)(?:\s+for|\s+due|\s+assigned|\s+@|$)/i,
        ];
        
        let titleMatch = null;
        for (const pattern of titlePatterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            titleMatch = match[1].trim();
            // Clean up title - remove common trailing phrases
            titleMatch = titleMatch.replace(/\s+(for|due|by|assigned|@).*$/i, '');
            break;
          }
        }
        
        // Fallback: simpler pattern
        if (!titleMatch) {
          const simpleMatch = message.match(/task\s+(?:to\s+)?([^.!?]+)/i) ||
                            message.match(/create\s+task\s+(.+?)(?:\s+for|\s+due|$)/i);
          if (simpleMatch) {
            titleMatch = simpleMatch[1].trim();
          }
        }
        
        // Extract description (text after ":" or "description" or "details")
        const descriptionMatch = message.match(/(?:description|details|note|about)[\s:]+([^.!?]+)/i) ||
                                 message.match(/:\s*([^.!?]+)/);
        
        // Enhanced date parsing - multiple formats
        const datePatterns = [
          /(?:due|by|on)\s+(?:date\s+)?(?:of\s+)?(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
          /(?:due|by|on)\s+(?:date\s+)?(?:of\s+)?([A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s+[A-Z][a-z]+)?(?:\s+\d{4})?)/i,
          /(?:due|by|on)\s+(?:date\s+)?(?:of\s+)?(today|tomorrow|next\s+week|next\s+month)/i,
          /(?:due|by|on)\s+(?:date\s+)?(?:of\s+)?(\d{1,2}\s+(?:days?|weeks?|months?)\s+from\s+now)/i,
        ];
        
        let dueDate: string | null = null;
        for (const pattern of datePatterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            const dateStr = match[1].toLowerCase();
            const now = new Date();
            
            if (dateStr === 'today') {
              dueDate = now.toISOString();
            } else if (dateStr === 'tomorrow') {
              now.setDate(now.getDate() + 1);
              dueDate = now.toISOString();
            } else if (dateStr.includes('next week')) {
              now.setDate(now.getDate() + 7);
              dueDate = now.toISOString();
            } else if (dateStr.includes('next month')) {
              now.setMonth(now.getMonth() + 1);
              dueDate = now.toISOString();
            } else if (dateStr.includes('days from now')) {
              const days = parseInt(dateStr.match(/\d+/)?.[0] || '0');
              now.setDate(now.getDate() + days);
              dueDate = now.toISOString();
            } else if (dateStr.includes('weeks from now')) {
              const weeks = parseInt(dateStr.match(/\d+/)?.[0] || '0');
              now.setDate(now.getDate() + (weeks * 7));
              dueDate = now.toISOString();
            } else if (dateStr.includes('months from now')) {
              const months = parseInt(dateStr.match(/\d+/)?.[0] || '0');
              now.setMonth(now.getMonth() + months);
              dueDate = now.toISOString();
            } else {
              // Try parsing standard date formats
              try {
                const parsed = new Date(match[1]);
                if (!isNaN(parsed.getTime())) {
                  dueDate = parsed.toISOString();
                }
              } catch (e) {
                // Ignore parsing errors
              }
            }
            break;
          }
        }
        
        // Find contact by name (look for "for [Name]" or "assigned to [Name]" or "@[Name]")
        const contactPatterns = [
          /(?:for|assigned\s+to|@)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
          /contact[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        ];
        
        let contactId: string | null = null;
        for (const pattern of contactPatterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            const contactName = match[1].trim();
            // Find contact by name (fuzzy match)
            const contact = contacts.find(c => 
              c.name.toLowerCase().includes(contactName.toLowerCase()) ||
              contactName.toLowerCase().includes(c.name.toLowerCase())
            );
            if (contact) {
              contactId = contact.id;
              break;
            }
          }
        }
        
        // Find deal by title (look for "for deal [Title]" or "related to [Deal]")
        const dealPatterns = [
          /(?:for\s+deal|related\s+to\s+deal|deal[:\s]+)([^.!?]+?)(?:\s+for|\s+due|$)/i,
          /deal[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        ];
        
        let dealId: string | null = null;
        for (const pattern of dealPatterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            const dealTitle = match[1].trim();
            // Find deal by title (fuzzy match)
            const deal = deals.find(d => 
              d.title.toLowerCase().includes(dealTitle.toLowerCase()) ||
              dealTitle.toLowerCase().includes(d.title.toLowerCase())
            );
            if (deal) {
              dealId = deal.id;
              break;
            }
          }
        }
        
        if (titleMatch) {
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              title: titleMatch,
              description: descriptionMatch ? descriptionMatch[1].trim() : null,
              completed: false,
              due_date: dueDate,
              contact_id: contactId,
              deal_id: dealId,
            })
            .select()
            .single();

          if (!error && data) {
            const parts = [`✅ Created task: ${data.title}`];
            if (dueDate) {
              const date = new Date(dueDate);
              parts.push(`Due: ${date.toLocaleDateString()}`);
            }
            if (contactId) {
              const contact = contacts.find(c => c.id === contactId);
              if (contact) parts.push(`For: ${contact.name}`);
            }
            if (dealId) {
              const deal = deals.find(d => d.id === dealId);
              if (deal) parts.push(`Related to: ${deal.title}`);
            }
            actionResult = parts.join(' | ');
          } else {
            actionResult = `❌ Error creating task: ${error?.message || 'Unknown error'}`;
          }
        }
      } else if (lowerMessage.includes('activity') || lowerMessage.includes('note') || lowerMessage.includes('log')) {
        // Create activity/note for a deal or contact
        const activityTypeMatch = message.match(/(note|call|email|meeting|task)/i);
        const type = activityTypeMatch ? activityTypeMatch[1].toLowerCase() : 'note';
        
        const titleMatch = message.match(/(?:note|activity|log)[\s\w]+(?:called|named|about|for)\s+([^.!?]+)/i) ||
                          message.match(/add\s+(?:a\s+)?(?:note|activity|log)\s+(?:about|for)?\s*([^.!?]+)/i) ||
                          message.match(/create\s+(?:a\s+)?(?:note|activity|log)\s+(?:about|for)?\s*([^.!?]+)/i);
        
        const descriptionMatch = message.match(/(?:description|details|content|text)[\s:]+([^.!?]+)/i) ||
                                 message.match(/:\s*([^.!?]+)/);
        
        // Find deal or contact
        let dealId: string | null = null;
        let contactId: string | null = null;
        
        // Look for deal reference
        const dealPatterns = [
          /(?:for|on|about)\s+deal[:\s]+([^.!?]+?)(?:\s+for|\s+about|$)/i,
          /deal[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        ];
        for (const pattern of dealPatterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            const dealTitle = match[1].trim();
            const deal = deals.find(d => 
              d.title.toLowerCase().includes(dealTitle.toLowerCase()) ||
              dealTitle.toLowerCase().includes(d.title.toLowerCase())
            );
            if (deal) {
              dealId = deal.id;
              break;
            }
          }
        }
        
        // Look for contact reference
        const contactPatterns = [
          /(?:for|on|about)\s+contact[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
          /contact[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
        ];
        for (const pattern of contactPatterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            const contactName = match[1].trim();
            const contact = contacts.find(c => 
              c.name.toLowerCase().includes(contactName.toLowerCase()) ||
              contactName.toLowerCase().includes(c.name.toLowerCase())
            );
            if (contact) {
              contactId = contact.id;
              break;
            }
          }
        }
        
        if (titleMatch || descriptionMatch) {
          const { data, error } = await supabase
            .from('activities')
            .insert({
              type,
              title: titleMatch ? titleMatch[1].trim() : (descriptionMatch ? descriptionMatch[1].trim().substring(0, 100) : 'Activity'),
              description: descriptionMatch ? descriptionMatch[1].trim() : (titleMatch ? titleMatch[1].trim() : null),
              deal_id: dealId,
              contact_id: contactId,
            })
            .select()
            .single();

          if (!error && data) {
            const parts = [`✅ Created ${type}: ${data.title}`];
            if (dealId) {
              const deal = deals.find(d => d.id === dealId);
              if (deal) parts.push(`For deal: ${deal.title}`);
            }
            if (contactId) {
              const contact = contacts.find(c => c.id === contactId);
              if (contact) parts.push(`For contact: ${contact.name}`);
            }
            actionResult = parts.join(' | ');
          } else {
            actionResult = `❌ Error creating activity: ${error?.message || 'Unknown error'}`;
          }
        }
      }

      if (actionResult) {
        return NextResponse.json({ success: true, response: actionResult });
      }
    }

    // Handle update operations
    if (lowerMessage.includes('update') || lowerMessage.includes('change') || lowerMessage.includes('move') || lowerMessage.includes('set')) {
      let actionResult = null;

      // Update deal stage or probability
      if (lowerMessage.includes('deal')) {
        // Find deal by title
        const dealTitleMatch = message.match(/deal[:\s]+([^.!?]+?)(?:\s+to|\s+stage|\s+probability|$)/i) ||
                              message.match(/(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+deal/i);
        
        let dealId: string | null = null;
        if (dealTitleMatch) {
          const dealTitle = dealTitleMatch[1].trim();
          const deal = deals.find(d => 
            d.title.toLowerCase().includes(dealTitle.toLowerCase()) ||
            dealTitle.toLowerCase().includes(d.title.toLowerCase())
          );
          if (deal) dealId = deal.id;
        }
        
        if (dealId) {
          const updates: any = {};
          
          // Check for stage change
          const stageMatch = message.match(/(?:to|stage|move\s+to)\s+(lead|qualified|proposal|negotiation|won|lost)/i);
          if (stageMatch) {
            const stageName = stageMatch[1].toLowerCase();
            const stage = stages.find(s => s.name.toLowerCase() === stageName);
            if (stage) updates.stage_id = stage.id;
          }
          
          // Check for probability change
          const probMatch = message.match(/(?:probability|prob|chance)\s+(?:to|is|at)\s+(\d{1,3})/i);
          if (probMatch) {
            updates.probability = parseInt(probMatch[1]);
          }
          
          if (Object.keys(updates).length > 0) {
            const { data, error } = await supabase
              .from('deals')
              .update(updates)
              .eq('id', dealId)
              .select()
              .single();

            if (!error && data) {
              const parts = [`✅ Updated deal: ${data.title}`];
              if (updates.stage_id) {
                const stage = stages.find(s => s.id === updates.stage_id);
                if (stage) parts.push(`Stage: ${stage.name}`);
              }
              if (updates.probability !== undefined) {
                parts.push(`Probability: ${updates.probability}%`);
              }
              actionResult = parts.join(' | ');
            } else {
              actionResult = `❌ Error updating deal: ${error?.message || 'Unknown error'}`;
            }
          }
        }
      }
      
      // Update task completion
      if (lowerMessage.includes('task') && (lowerMessage.includes('complete') || lowerMessage.includes('done') || lowerMessage.includes('finish'))) {
        const taskTitleMatch = message.match(/task[:\s]+([^.!?]+)/i);
        if (taskTitleMatch) {
          const taskTitle = taskTitleMatch[1].trim();
          const task = tasks.find(t => 
            t.title.toLowerCase().includes(taskTitle.toLowerCase()) ||
            taskTitle.toLowerCase().includes(t.title.toLowerCase())
          );
          
          if (task) {
            const { data, error } = await supabase
              .from('tasks')
              .update({ completed: true })
              .eq('id', task.id)
              .select()
              .single();

            if (!error && data) {
              actionResult = `✅ Marked task as complete: ${data.title}`;
            } else {
              actionResult = `❌ Error updating task: ${error?.message || 'Unknown error'}`;
            }
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
