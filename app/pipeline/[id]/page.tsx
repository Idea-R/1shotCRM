import MainLayout from '@/components/MainLayout';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import DealInfoPanel from '@/components/DealInfoPanel';
import ActivityLog from '@/components/ActivityLog';
import FileAttachmentsSection from '@/components/FileAttachmentsSection';
import DealActions from '@/components/DealActions';
import PaymentSection from '@/components/PaymentSection';
import { DollarSign, Calendar, User, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const { data: deal } = await supabase
    .from('deals')
    .select('*, contact:contacts(*), stage:pipeline_stages(*)')
    .eq('id', id)
    .single();

  if (!deal) {
    notFound();
  }

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('deal_id', id)
    .order('created_at', { ascending: false });

  const { data: relatedTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('deal_id', id)
    .order('created_at', { ascending: false });

  // Note: Tags will be loaded client-side in DealInfoPanel component

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{deal.title}</h1>
          <DealActions deal={deal} />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Deal Value</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ${deal.value?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Probability</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {deal.probability || 0}%
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Expected Close</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {deal.expected_close_date
                    ? format(new Date(deal.expected_close_date), 'MMM d, yyyy')
                    : 'Not set'}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <User className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Contact</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {deal.contact?.name || 'No contact'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Deal Info */}
          <div className="lg:col-span-1">
            <DealInfoPanel deal={deal} tasks={relatedTasks || []} />
          </div>

          {/* Middle Panel - Activity Log */}
          <div className="lg:col-span-2 space-y-6">
            <ActivityLog dealId={id} activities={activities || []} />
            <FileAttachmentsSection entityType="deal" entityId={id} />
            <PaymentSection dealId={id} contactId={deal.contact_id || undefined} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

