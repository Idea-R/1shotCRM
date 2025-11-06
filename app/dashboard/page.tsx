'use client';

import { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { supabase, Deal, Contact, Task, PipelineStage } from '@/lib/supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Briefcase, CheckSquare, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contactsRes, dealsRes, tasksRes, stagesRes] = await Promise.all([
        supabase.from('contacts').select('*'),
        supabase.from('deals').select('*, contact:contacts(*)'),
        supabase.from('tasks').select('*'),
        supabase.from('pipeline_stages').select('*').order('order'),
      ]);

      setContacts(contactsRes.data || []);
      setDeals(dealsRes.data || []);
      setTasks(tasksRes.data || []);
      setStages(stagesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

  // Calculate metrics
  const totalDealsValue = deals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  const activeDeals = deals.filter(d => d.stage_id && stages.find(s => s.name === 'Won' || s.name === 'Lost')?.id !== d.stage_id).length;
  const completedTasks = tasks.filter(t => t.completed).length;

  // Prepare chart data
  const dealsByStage = stages.map(stage => ({
    name: stage.name,
    value: deals.filter(d => d.stage_id === stage.id).length,
    color: stage.color || '#3B82F6',
  }));

  const monthlyValue = deals.reduce((acc, deal) => {
    const month = new Date(deal.created_at).toLocaleDateString('en-US', { month: 'short' });
    acc[month] = (acc[month] || 0) + (deal.value || 0);
    return acc;
  }, {} as Record<string, number>);

  const monthlyData = Object.entries(monthlyValue).map(([month, value]) => ({
    month,
    value,
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280'];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Overview of your CRM health</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/20 rounded-lg p-3">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Contacts</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{contacts.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 dark:bg-green-900/20 rounded-lg p-3">
                <Briefcase className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Deals</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{activeDeals}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg p-3">
                <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Deal Value</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">${totalDealsValue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 dark:bg-purple-900/20 rounded-lg p-3">
                <CheckSquare className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tasks</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">{completedTasks}/{tasks.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Deals by Stage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dealsByStage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dealsByStage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Deal Value Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {deals.slice(0, 5).map((deal) => (
                <div key={deal.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{deal.title}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {deal.contact?.name || 'No contact'} • ${deal.value?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(deal.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {deals.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No deals yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
