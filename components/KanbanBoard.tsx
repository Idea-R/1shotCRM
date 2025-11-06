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
}

export default function KanbanBoard({ deals, stages, onDealUpdate }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const dealId = active.id as string;
    const stageId = over.id as string;

    if (dealId && stageId && stageId.startsWith('stage-')) {
      const actualStageId = stageId.replace('stage-', '');
      onDealUpdate(dealId, actualStageId);
    }

    setActiveId(null);
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
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = getDealsForStage(stage.id);
          return (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={stageDeals}
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

