'use client';

import { Deal, PipelineStage } from '@/lib/supabase';
import Link from 'next/link';
import { format } from 'date-fns';
import { DollarSign, User } from 'lucide-react';

interface PipelineListViewProps {
  deals: Deal[];
  stages: PipelineStage[];
}

export default function PipelineListView({ deals, stages }: PipelineListViewProps) {
  const getStageName = (stageId: string | null) => {
    if (!stageId) return 'No Stage';
    return stages.find(s => s.id === stageId)?.name || 'Unknown';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Deal
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Stage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Expected Close
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {deals.length > 0 ? (
              deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/pipeline/${deal.id}`}
                      className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {deal.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      {deal.contact ? (
                        <>
                          <User className="w-4 h-4 mr-2" />
                          {deal.contact.name}
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                      {getStageName(deal.stage_id)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
                      <DollarSign className="w-4 h-4 mr-1" />
                      {deal.value?.toLocaleString() || '0'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {deal.expected_close_date
                      ? format(new Date(deal.expected_close_date), 'MMM d, yyyy')
                      : '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(deal.created_at), 'MMM d, yyyy')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400">No deals yet. Create your first deal!</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

