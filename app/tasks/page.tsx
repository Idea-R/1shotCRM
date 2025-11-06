'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { supabase, Task } from '@/lib/supabase';
import Link from 'next/link';
import { Plus, Calendar, List } from 'lucide-react';
import TasksTableView from '@/components/TasksTableView';
import TasksCalendarView from '@/components/TasksCalendarView';

type ViewMode = 'table' | 'calendar';

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*, contact:contacts(*), deal:deals(*)')
        .order('created_at', { ascending: false });

      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !completed })
        .eq('id', taskId);

      if (!error) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !completed } : t));
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading...</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tasks</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your tasks</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded transition-colors ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 rounded transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
              </button>
            </div>
            <Link
              href="/tasks/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Task
            </Link>
          </div>
        </div>

        {viewMode === 'table' ? (
          <TasksTableView tasks={tasks} onToggleComplete={handleToggleComplete} />
        ) : (
          <TasksCalendarView tasks={tasks} onToggleComplete={handleToggleComplete} />
        )}
      </div>
    </MainLayout>
  );
}

