'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { PipelineStage, Deal } from '@/lib/supabase';
import KanbanCard from './KanbanCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  stage: PipelineStage;
  deals: Deal[];
  onTitleUpdate?: (dealId: string, newTitle: string) => void;
  isDragging?: boolean;
  isOver?: boolean;
  activeDealId?: string | null;
  overId?: string | null;
}

export default function KanbanColumn({ stage, deals, onTitleUpdate, isDragging, isOver, activeDealId, overId }: KanbanColumnProps) {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
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
          className={`p-4 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto transition-all duration-200 ${
            isOver || isDroppableOver ? 'bg-gray-50 dark:bg-gray-700/30' : ''
          }`}
        >
          <SortableContext items={deals.map(d => d.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {/* Render all deals - no limit on number of deals per stage */}
              {deals.map((deal) => {
                const isOverCard = overId === deal.id;
                return (
                  <KanbanCard 
                    key={deal.id} 
                    deal={deal} 
                    onTitleUpdate={onTitleUpdate}
                    isDragging={isDragging && deal.id !== activeDealId}
                    isOver={isOverCard}
                    stageColor={stage.color}
                  />
                );
              })}
              {deals.length === 0 && (
                <div className={`text-center py-8 text-gray-400 text-sm transition-all ${
                  isOver || isDroppableOver ? 'opacity-100' : 'opacity-50'
                }`}>
                  {isOver || isDroppableOver ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-400 dark:border-gray-500 flex items-center justify-center">
                        <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      </div>
                      <span>Drop here</span>
                    </div>
                  ) : (
                    'Drop deals here'
                  )}
                </div>
              )}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

