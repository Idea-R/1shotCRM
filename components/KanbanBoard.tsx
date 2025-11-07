'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Deal, PipelineStage } from '@/lib/supabase';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';

interface KanbanBoardProps {
  deals: Deal[];
  stages: PipelineStage[];
  onDealUpdate: (dealId: string, stageId: string) => void;
  onTitleUpdate?: (dealId: string, newTitle: string) => void;
}

export default function KanbanBoard({ deals, stages, onDealUpdate, onTitleUpdate }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string;
    if (overId) {
      setOverId(overId);
    } else {
      setOverId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      setOverId(null);
      return;
    }

    const dealId = active.id as string;
    const overId = over.id as string;
    let targetStageId: string | null = null;

    // Check if dropping on a stage column
    if (overId.startsWith('stage-')) {
      targetStageId = overId.replace('stage-', '');
    } 
    // Check if dropping on another deal card - find which stage that deal belongs to
    else {
      const targetDeal = deals.find(d => d.id === overId);
      if (targetDeal && targetDeal.stage_id) {
        targetStageId = targetDeal.stage_id;
      }
    }

    // Only update if we have a valid stage ID and it's different from current stage
    if (targetStageId && dealId) {
      const currentDeal = deals.find(d => d.id === dealId);
      if (currentDeal && currentDeal.stage_id !== targetStageId) {
        onDealUpdate(dealId, targetStageId);
      }
    }

    setActiveId(null);
    setOverId(null);
  };

  const getDealsForStage = (stageId: string) => {
    return deals.filter(deal => deal.stage_id === stageId);
  };

  const activeDeal = deals.find(d => d.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = getDealsForStage(stage.id);
          const isOverStage = overId === `stage-${stage.id}`;
          // Also check if we're dragging over a card that belongs to this stage
          const isOverCardInStage = overId ? stageDeals.some(d => d.id === overId) : false;
          const isOver = isOverStage || isOverCardInStage;
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              onTitleUpdate={onTitleUpdate}
              isDragging={!!activeId}
              isOver={isOver}
              activeDealId={activeId}
              overId={overId}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <KanbanCard deal={activeDeal} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

