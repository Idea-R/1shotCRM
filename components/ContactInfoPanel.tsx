'use client';

import { Contact, Deal, Task, Tag } from '@/lib/supabase';
import { format } from 'date-fns';
import { Building, DollarSign, TrendingUp, Calendar, CheckSquare, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { TagBadge, TagSelector } from '@/components/TagSelector';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ContactInfoPanelProps {
  contact: Contact;
  deals: Deal[];
  tasks: Task[];
}

export default function ContactInfoPanel({ contact, deals, tasks }: ContactInfoPanelProps) {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    loadTags();
  }, [contact.id]);

  const loadTags = async () => {
    const { data } = await supabase
      .from('contact_tags')
      .select('tag:tags(*)')
      .eq('contact_id', contact.id);
    
    if (data) {
      setTags(data.map((item: any) => item.tag));
    }
  };

  const totalDealValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const activeDeals = deals.filter(d => d.stage?.name !== 'Won' && d.stage?.name !== 'Lost');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
        
        {/* Tags */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Tags</label>
          <TagSelector
            selectedTags={tags}
            onTagsChange={setTags}
            entityType="contact"
            entityId={contact.id}
          />
        </div>
        
        <div className="space-y-4">
          {contact.company && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Company</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">{contact.company}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {format(new Date(contact.created_at), 'MMM d, yyyy')}
            </p>
          </div>

          {contact.updated_at && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {format(new Date(contact.updated_at), 'MMM d, yyyy')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statistics</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Deals</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{deals.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Active Deals</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{activeDeals.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Value</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              ${totalDealValue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Related Deals */}
      {deals.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Related Deals</h3>
          <div className="space-y-2">
            {deals.map((deal) => (
              <Link
                key={deal.id}
                href={`/pipeline/${deal.id}`}
                className="block p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{deal.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {deal.stage?.name || 'No stage'}
                      </span>
                      <span className="text-xs font-medium text-gray-900 dark:text-white">
                        ${deal.value?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </div>
                  <LinkIcon className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Tasks */}
      {tasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Related Tasks</h3>
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center flex-1">
                  <CheckSquare
                    className={`w-4 h-4 mr-2 ${
                      task.completed ? 'text-green-500' : 'text-gray-400'
                    }`}
                  />
                  <span
                    className={`text-sm ${
                      task.completed
                        ? 'line-through text-gray-500 dark:text-gray-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {task.title}
                  </span>
                </div>
                {task.due_date && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {format(new Date(task.due_date), 'MMM d')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

