'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Task } from '@/lib/supabase';
import { format } from 'date-fns';
import { Plus, FileText, Phone, Mail, Calendar, CheckSquare } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

interface ActivityLogProps {
  dealId?: string;
  contactId?: string;
  activities: Activity[];
}

const activityIcons = {
  note: FileText,
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckSquare,
};

export default function ActivityLog({ dealId, contactId, activities }: ActivityLogProps) {
  const router = useRouter();
  const [newActivity, setNewActivity] = useState({ type: 'note', title: '', description: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleAddActivity = async () => {
    if (!newActivity.title.trim()) {
      setError('Title is required');
      return;
    }

    setIsAdding(true);
    setError(null);
    
    // Create abort controller for request cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newActivity,
          deal_id: dealId,
          contact_id: contactId,
        }),
        signal: abortController.signal,
      });

      // Check if request was aborted
      if (abortController.signal.aborted) {
        setIsAdding(false);
        return;
      }

      const data = await response.json();

      if (response.ok && data.success) {
        // Reset form
        setNewActivity({ type: 'note', title: '', description: '' });
        setIsAdding(false);
        // Refresh the page data
        router.refresh();
      } else {
        setError(data.error || 'Failed to add activity');
        setIsAdding(false);
      }
    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        setIsAdding(false);
        return;
      }
      console.error('Error adding activity:', error);
      setError('Network error. Please try again.');
      setIsAdding(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    // Abort any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsAdding(false);
    setError(null);
    setNewActivity({ type: 'note', title: '', description: '' });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h3>
          <button
            onClick={() => setIsAdding(!isAdding)}
            disabled={isAdding}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Activity
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={newActivity.type}
                onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={newActivity.title}
                onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter activity title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <RichTextEditor
                content={newActivity.description}
                onChange={(content) => setNewActivity({ ...newActivity, description: content })}
                placeholder="Enter activity description (supports formatting)"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddActivity}
                disabled={!newActivity.title.trim() || isAdding}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAdding ? 'Adding...' : 'Add Activity'}
              </button>
            </div>
            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm mt-2">
                {error}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {activities.length > 0 ? (
          activities.map((activity) => {
            const Icon = activityIcons[activity.type as keyof typeof activityIcons] || FileText;
            return (
              <div key={activity.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        {activity.title}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    {activity.description && (
                      <div
                        className="mt-2 text-sm text-gray-600 dark:text-gray-400 prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: activity.description }}
                      />
                    )}
                    <span className="inline-block mt-2 px-2 py-1 text-xs font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {activity.type}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">No activities yet. Add your first activity!</p>
          </div>
        )}
      </div>
    </div>
  );
}

