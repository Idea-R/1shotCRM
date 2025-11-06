'use client';

import { useState } from 'react';
import { Activity, Task } from '@/lib/supabase';
import { format } from 'date-fns';
import { Plus, FileText, Phone, Mail, Calendar, CheckSquare } from 'lucide-react';

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
  const [newActivity, setNewActivity] = useState({ type: 'note', title: '', description: '' });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddActivity = async () => {
    if (!newActivity.title.trim()) return;

    setIsAdding(true);
    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newActivity,
          deal_id: dealId,
          contact_id: contactId,
        }),
      });

      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error adding activity:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h3>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
              <textarea
                value={newActivity.description}
                onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="Enter activity description"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsAdding(false)}
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
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {activity.description}
                      </p>
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

