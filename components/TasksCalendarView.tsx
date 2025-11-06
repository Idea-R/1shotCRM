'use client';

import { useState } from 'react';
import { Task } from '@/lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CheckSquare, XSquare } from 'lucide-react';

interface TasksCalendarViewProps {
  tasks: Task[];
  onToggleComplete: (taskId: string, completed: boolean) => void;
}

export default function TasksCalendarView({ tasks, onToggleComplete }: TasksCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(new Date(task.due_date), date);
    });
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: monthStart.getDay() }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        {daysInMonth.map((day) => {
          const dayTasks = getTasksForDate(day);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              className={`aspect-square border border-gray-200 dark:border-gray-700 rounded-lg p-2 ${
                isCurrentDay ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : ''
              }`}
            >
              <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-1 overflow-y-auto max-h-20">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 ${
                      task.completed
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                        : 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
                    }`}
                    onClick={() => onToggleComplete(task.id, task.completed)}
                    title={task.title}
                  >
                    {task.completed ? (
                      <CheckSquare className="w-3 h-3 inline mr-1" />
                    ) : (
                      <XSquare className="w-3 h-3 inline mr-1" />
                    )}
                    {task.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    +{dayTasks.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

