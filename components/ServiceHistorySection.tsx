'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Filter } from 'lucide-react';
import { ServiceHistory } from '@/lib/supabase';
import { format } from 'date-fns';

interface ServiceHistorySectionProps {
  contactId: string;
  applianceId?: string;
}

export default function ServiceHistorySection({ contactId, applianceId }: ServiceHistorySectionProps) {
  const [history, setHistory] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    loadHistory();
  }, [contactId, applianceId, filterCategory, filterType]);

  const loadHistory = async () => {
    try {
      let url = `/api/service-history?contact_id=${contactId}`;
      if (applianceId) {
        url += `&appliance_id=${applianceId}`;
      }
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        let filtered = result.data;
        if (filterCategory && !applianceId) {
          filtered = filtered.filter((h: ServiceHistory) => h.appliance?.category === filterCategory);
        }
        if (filterType) {
          filtered = filtered.filter((h: ServiceHistory) => h.type === filterType);
        }
        setHistory(filtered);
      }
    } catch (error) {
      console.error('Error loading service history:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(
    new Set(history.map((h) => h.appliance?.category).filter((c) => c !== undefined))
  ).sort() as string[];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'repair':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
      case 'maintenance':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      case 'inspection':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service History</h2>
        <Link
          href={`/services/new?contact_id=${contactId}`}
          className="flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Service
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-4">
        <Filter className="w-4 h-4 text-gray-400" />
        {categories.length > 0 && (
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        )}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">All Types</option>
          <option value="service">Service</option>
          <option value="repair">Repair</option>
          <option value="maintenance">Maintenance</option>
          <option value="inspection">Inspection</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
      ) : history.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">No service history yet</div>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(entry.type)}`}>
                    {entry.type}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(entry.date), 'MMM d, yyyy')}
                  </span>
                  {entry.appliance && (
                    <Link
                      href={`/contacts/${contactId}/appliances/${entry.appliance_id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {entry.appliance.name}
                    </Link>
                  )}
                  {entry.service && (
                    <Link
                      href={`/services/${entry.service_id}`}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      View Service
                    </Link>
                  )}
                </div>
                {entry.cost && (
                  <span className="text-sm font-medium text-gray-900 dark:text-white">${entry.cost.toFixed(2)}</span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{entry.description}</p>
              {entry.technician && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Technician: {entry.technician}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

