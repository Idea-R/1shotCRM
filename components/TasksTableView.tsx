'use client';

import { Task } from '@/lib/supabase';
import { format } from 'date-fns';
import { CheckSquare, XSquare, Calendar, User, Briefcase } from 'lucide-react';
import Link from 'next/link';

interface TasksTableViewProps {
  tasks: Task[];
  onToggleComplete: (taskId: string, completed: boolean) => void;
}

export default function TasksTableView({ tasks, onToggleComplete }: TasksTableViewProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Task
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Related To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <tr
                  key={task.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    task.completed ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onToggleComplete(task.id, task.completed)}
                      className={`transition-colors ${
                        task.completed
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-gray-400 hover:text-green-600 dark:hover:text-green-400'
                      }`}
                    >
                      {task.completed ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <XSquare className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p
                        className={`text-sm font-medium ${
                          task.completed
                            ? 'line-through text-gray-500 dark:text-gray-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {task.contact && (
                        <Link
                          href={`/contacts/${task.contact.id}`}
                          className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <User className="w-4 h-4 mr-1" />
                          {task.contact.name}
                        </Link>
                      )}
                      {task.deal && (
                        <Link
                          href={`/pipeline/${task.deal.id}`}
                          className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <Briefcase className="w-4 h-4 mr-1" />
                          {task.deal.title}
                        </Link>
                      )}
                      {!task.contact && !task.deal && (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.due_date ? (
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        <Calendar className="w-4 h-4 mr-1" />
                        {format(new Date(task.due_date), 'MMM d, yyyy')}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(task.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No tasks yet. Create your first task!</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

