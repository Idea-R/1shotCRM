'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Plus, List, Grid, Briefcase } from 'lucide-react';
import { supabase, Deal, PipelineStage } from '@/lib/supabase';
import KanbanBoard from '@/components/KanbanBoard';
import PipelineListView from '@/components/PipelineListView';

type ViewMode = 'kanban' | 'list';

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dealsRes, stagesRes] = await Promise.all([
        supabase.from('deals').select('*, contact:contacts(*)').order('created_at', { ascending: false }),
        supabase.from('pipeline_stages').select('*').order('order'),
      ]);

      setDeals(dealsRes.data || []);
      setStages(stagesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDealUpdate = async (dealId: string, stageId: string) => {
    try {
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: stageId })
        .eq('id', dealId);

      if (!error) {
        setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage_id: stageId } : d));
      }
    } catch (error) {
      console.error('Error updating deal:', error);
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pipeline</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your deals</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1 rounded transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              <Plus className="w-5 h-5 mr-2" />
              New Deal
            </button>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <KanbanBoard
            deals={deals}
            stages={stages}
            onDealUpdate={handleDealUpdate}
          />
        ) : (
          <PipelineListView deals={deals} stages={stages} />
        )}
      </div>
    </MainLayout>
  );
}

