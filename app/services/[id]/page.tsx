'use client';

import MainLayout from '@/components/MainLayout';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { User, Wrench, Calendar, DollarSign, Edit, ArrowLeft, Plus } from 'lucide-react';
import { Service, ServiceHistory } from '@/lib/supabase';

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [service, setService] = useState<Service | null>(null);
  const [history, setHistory] = useState<ServiceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    type: 'service' as 'service' | 'repair' | 'maintenance' | 'inspection',
    description: '',
    date: new Date().toISOString().split('T')[0],
    cost: '',
    technician: '',
  });

  useEffect(() => {
    if (id) {
      loadService();
      loadHistory();
    }
  }, [id]);

  const loadService = async () => {
    try {
      const res = await fetch(`/api/services?id=${id}`);
      const result = await res.json();
      if (result.success) {
        setService(result.data);
      }
    } catch (error) {
      console.error('Error loading service:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/service-history?service_id=${id}`);
      const result = await res.json();
      if (result.success) {
        setHistory(result.data);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const res = await fetch('/api/services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const result = await res.json();
      if (result.success) {
        await loadService();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/service-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: id,
          appliance_id: service?.appliance_id,
          contact_id: service?.contact_id,
          ...historyForm,
          cost: historyForm.cost ? parseFloat(historyForm.cost) : null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        await loadHistory();
        setShowHistoryForm(false);
        setHistoryForm({
          type: 'service',
          description: '',
          date: new Date().toISOString().split('T')[0],
          cost: '',
          technician: '',
        });
      }
    } catch (error) {
      console.error('Error adding history:', error);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-12">Loading...</div>
      </MainLayout>
    );
  }

  if (!service) {
    return (
      <MainLayout>
        <div className="text-center py-12">Service not found</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Link
          href="/services"
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Services
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{service.title}</h1>
              {service.description && (
                <p className="mt-2 text-gray-600 dark:text-gray-400">{service.description}</p>
              )}
            </div>
            <select
              value={service.status}
              onChange={(e) => handleStatusUpdate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Details</h3>
              <div className="space-y-3">
                {service.contact && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Contact:</span>
                    <Link
                      href={`/contacts/${service.contact_id}`}
                      className="ml-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {service.contact.name}
                    </Link>
                  </div>
                )}
                {service.appliance && (
                  <div className="flex items-center">
                    <Wrench className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Appliance:</span>
                    <Link
                      href={`/contacts/${service.contact_id}/appliances/${service.appliance_id}`}
                      className="ml-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {service.appliance.name}
                    </Link>
                  </div>
                )}
                {service.service_date && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Date: {format(new Date(service.service_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                {service.technician && (
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Technician: {service.technician}</span>
                  </div>
                )}
                {service.cost && (
                  <div className="flex items-center">
                    <DollarSign className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">Cost: ${service.cost.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {service.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Notes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{service.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Service History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service History</h2>
            <button
              onClick={() => setShowHistoryForm(!showHistoryForm)}
              className="flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Entry
            </button>
          </div>

          {showHistoryForm && (
            <form onSubmit={handleAddHistory} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                  <select
                    value={historyForm.type}
                    onChange={(e) => setHistoryForm({ ...historyForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    required
                  >
                    <option value="service">Service</option>
                    <option value="repair">Repair</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={historyForm.date}
                    onChange={(e) => setHistoryForm({ ...historyForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={historyForm.description}
                  onChange={(e) => setHistoryForm({ ...historyForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  rows={3}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={historyForm.cost}
                    onChange={(e) => setHistoryForm({ ...historyForm, cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Technician</label>
                  <input
                    type="text"
                    value={historyForm.technician}
                    onChange={(e) => setHistoryForm({ ...historyForm, technician: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Add Entry
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistoryForm(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">No history entries yet</div>
          ) : (
            <div className="space-y-4">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{entry.type}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(entry.date), 'MMM d, yyyy')}
                        </span>
                        {entry.technician && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">by {entry.technician}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{entry.description}</p>
                      {entry.cost && (
                        <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">${entry.cost.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

