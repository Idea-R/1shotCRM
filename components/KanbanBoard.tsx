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
    const stageId = over.id as string;

    if (dealId && stageId && stageId.startsWith('stage-')) {
      const actualStageId = stageId.replace('stage-', '');
      onDealUpdate(dealId, actualStageId);
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
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
              onTitleUpdate={onTitleUpdate}
              isDragging={!!activeId}
              isOver={isOverStage}
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

