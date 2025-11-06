'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PipelineStage, Deal } from '@/lib/supabase';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  stage: PipelineStage;
  deals: Deal[];
}

export default function KanbanColumn({ stage, deals }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: `stage-${stage.id}`,
  });

  return (
    <div className="flex-shrink-0 w-80">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div
          className="p-4 border-b border-gray-200 dark:border-gray-700"
          style={{ borderTopColor: stage.color || '#3B82F6', borderTopWidth: '4px' }}
        >
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {stage.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {deals.length} {deals.length === 1 ? 'deal' : 'deals'}
          </p>
        </div>
        <div
          ref={setNodeRef}
          className="p-4 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto"
        >
          <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {deals.map((deal) => (
                <KanbanCard key={deal.id} deal={deal} />
              ))}
              {deals.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Drop deals here
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

