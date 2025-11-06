'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Deal } from '@/lib/supabase';
import Link from 'next/link';
import { format } from 'date-fns';
import { DollarSign, User, GripVertical, Edit2, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface KanbanCardProps {
  deal: Deal;
  isDragging?: boolean;
  onTitleUpdate?: (dealId: string, newTitle: string) => void;
}

export default function KanbanCard({ deal, isDragging, onTitleUpdate }: KanbanCardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(deal.title);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleTitleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditingTitle(true);
  };

  const handleTitleSave = async () => {
    if (editedTitle.trim() && editedTitle !== deal.title) {
      setIsUpdating(true);
      try {
        const { error } = await supabase
          .from('deals')
          .update({ title: editedTitle.trim() })
          .eq('id', deal.id);

        if (!error && onTitleUpdate) {
          onTitleUpdate(deal.id, editedTitle.trim());
        }
      } catch (error) {
        console.error('Error updating title:', error);
      } finally {
        setIsUpdating(false);
        setIsEditingTitle(false);
      }
    } else {
      setIsEditingTitle(false);
      setEditedTitle(deal.title);
    }
  };

  const handleTitleCancel = () => {
    setIsEditingTitle(false);
    setEditedTitle(deal.title);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-4 hover:shadow-md transition-shadow ${
        isSortableDragging || isDragging ? 'shadow-lg' : ''
      }`}
    >
      {/* Drag Handle */}
      <div className="flex items-start gap-2 mb-2 group">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical className="w-4 h-4 text-gray-400 mt-1" />
        </div>
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyPress}
                onBlur={handleTitleSave}
                autoFocus
                className="flex-1 px-2 py-1 text-sm font-semibold text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUpdating}
              />
              <button
                onClick={handleTitleSave}
                disabled={isUpdating}
                className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleTitleCancel}
                disabled={isUpdating}
                className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <Link
                href={`/pipeline/${deal.id}`}
                className="flex-1 text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {deal.title}
              </Link>
              <button
                onClick={handleTitleClick}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity"
                title="Edit title"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="space-y-2 ml-6" onClick={(e) => e.stopPropagation()}>
        {deal.contact && (
          <Link
            href={`/contacts/${deal.contact.id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <User className="w-4 h-4 mr-1" />
            {deal.contact.name}
          </Link>
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
