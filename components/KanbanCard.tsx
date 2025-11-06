'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Deal } from '@/lib/supabase';
import Link from 'next/link';
import { format } from 'date-fns';
import { DollarSign, User } from 'lucide-react';

interface KanbanCardProps {
  deal: Deal;
  isDragging?: boolean;
}

export default function KanbanCard({ deal, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging || isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isSortableDragging || isDragging ? 'shadow-lg' : ''
      }`}
    >
      <Link href={`/pipeline/${deal.id}`}>
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400">
          {deal.title}
        </h4>
      </Link>
      
      <div className="space-y-2">
        {deal.contact && (
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
            <User className="w-4 h-4 mr-1" />
            {deal.contact.name}
          </div>
        )}
        
        <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
          <DollarSign className="w-4 h-4 mr-1" />
          ${deal.value?.toLocaleString() || '0'}
        </div>

        {deal.expected_close_date && (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Due: {format(new Date(deal.expected_close_date), 'MMM d, yyyy')}
          </div>
        )}
      </div>
    </div>
  );
}

