'use client';

import { Deal, Task, Tag } from '@/lib/supabase';
import { format } from 'date-fns';
import { MapPin, Calendar, User, FileText, CheckSquare } from 'lucide-react';
import Link from 'next/link';
import { TagBadge, TagSelector } from './TagSelector';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface DealInfoPanelProps {
  deal: Deal;
  tasks: Task[];
}

export default function DealInfoPanel({ deal, tasks }: DealInfoPanelProps) {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    loadTags();
  }, [deal.id]);

  const loadTags = async () => {
    const { data } = await supabase
      .from('deal_tags')
      .select('tag:tags(*)')
      .eq('deal_id', deal.id);
    
    if (data) {
      setTags(data.map((item: any) => item.tag));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Deal Information</h3>
        
        {/* Tags */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Tags</label>
          <TagSelector
            selectedTags={tags}
            onTagsChange={setTags}
            entityType="deal"
            entityId={deal.id}
          />
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Stage</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {deal.stage?.name || 'No stage'}
            </p>
          </div>

          {deal.contact && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact</label>
              <Link
                href={`/contacts/${deal.contact.id}`}
                className="mt-1 text-sm text-blue-600 dark:text-blue-400 hover:underline block"
              >
                {deal.contact.name}
              </Link>
              {deal.contact.email && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{deal.contact.email}</p>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
            <p className="mt-1 text-sm text-gray-900 dark:text-white">
              {format(new Date(deal.created_at), 'MMM d, yyyy')}
            </p>
          </div>

          {deal.updated_at && (
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-white">
                {format(new Date(deal.updated_at), 'MMM d, yyyy')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Tasks */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Related Tasks</h3>
        <div className="space-y-2">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center">
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
            ))
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No tasks yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

