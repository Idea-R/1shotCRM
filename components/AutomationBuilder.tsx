'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Automation, AutomationRun } from '@/lib/automation-engine';
import { Plus, Play, Trash2, Edit, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AutomationBuilder() {
  const router = useRouter();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'service_created' as Automation['trigger_type'],
    trigger_config: {},
    actions: [] as Array<{ type: string; config: Record<string, any> }>,
  });

  useEffect(() => {
    loadAutomations();
  }, []);

  const loadAutomations = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/automations?include_runs=true', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const result = await res.json();
      if (result.success) {
        setAutomations(result.data);
      }
    } catch (error) {
      console.error('Error loading automations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const url = editingId ? `/api/automations?id=${editingId}` : '/api/automations';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (result.success) {
        setShowForm(false);
        setEditingId(null);
        setFormData({
          name: '',
          trigger_type: 'service_created',
          trigger_config: {},
          actions: [],
        });
        loadAutomations();
      } else {
        alert(result.error || 'Failed to save automation');
      }
    } catch (error) {
      console.error('Error saving automation:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/automations?id=${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const result = await res.json();
      if (result.success) {
        loadAutomations();
      } else {
        alert(result.error || 'Failed to delete automation');
      }
    } catch (error) {
      console.error('Error deleting automation:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleTest = async (automation: Automation) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/automations/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          automation_id: automation.id,
          trigger_type: automation.trigger_type,
          trigger_data: { test: true },
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert('Automation test triggered');
        loadAutomations();
      } else {
        alert(result.error || 'Failed to test automation');
      }
    } catch (error) {
      console.error('Error testing automation:', error);
      alert('Network error. Please try again.');
    }
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...formData.actions,
        { type: 'send_email', config: {} },
      ],
    });
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading automations...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Automations</h1>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              name: '',
              trigger_type: 'service_created',
              trigger_config: {},
              actions: [],
            });
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Automation
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingId ? 'Edit Automation' : 'Create Automation'}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Automation name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Trigger Type
              </label>
              <select
                value={formData.trigger_type}
                onChange={(e) => setFormData({ ...formData, trigger_type: e.target.value as Automation['trigger_type'] })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="service_created">Service Created</option>
                <option value="service_updated">Service Updated</option>
                <option value="contact_created">Contact Created</option>
                <option value="deal_stage_changed">Deal Stage Changed</option>
                <option value="task_completed">Task Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Actions ({formData.actions.length})
              </label>
              <div className="space-y-2">
                {formData.actions.map((action, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <select
                      value={action.type}
                      onChange={(e) => {
                        const newActions = [...formData.actions];
                        newActions[index].type = e.target.value;
                        setFormData({ ...formData, actions: newActions });
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white"
                    >
                      <option value="send_email">Send Email</option>
                      <option value="send_sms">Send SMS</option>
                      <option value="create_task">Create Task</option>
                      <option value="update_field">Update Field</option>
                      <option value="call_webhook">Call Webhook</option>
                    </select>
                    <button
                      onClick={() => removeAction(index)}
                      className="p-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addAction}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Add Action
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.name || formData.actions.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {automations.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">No automations yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Create your first automation to automate workflows
            </p>
          </div>
        ) : (
          automations.map((automation) => {
            const runs = (automation as any).automation_runs || [];
            const recentRuns = runs.slice(0, 5);

            return (
              <div
                key={automation.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {automation.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        automation.active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {automation.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Trigger: {automation.trigger_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Actions: {automation.actions.length}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTest(automation)}
                      className="p-2 text-blue-600 hover:text-blue-700"
                      title="Test"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(automation.id);
                        setFormData({
                          name: automation.name,
                          trigger_type: automation.trigger_type,
                          trigger_config: automation.trigger_config,
                          actions: automation.actions,
                        });
                        setShowForm(true);
                      }}
                      className="p-2 text-gray-600 hover:text-gray-700"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(automation.id)}
                      className="p-2 text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {recentRuns.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                      Recent Runs
                    </h4>
                    <div className="space-y-2">
                      {recentRuns.map((run: AutomationRun) => (
                        <div
                          key={run.id}
                          className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded"
                        >
                          <div className="flex items-center gap-2">
                            {run.status === 'completed' && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                            {run.status === 'failed' && (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            {(run.status === 'pending' || run.status === 'running') && (
                              <Clock className="w-4 h-4 text-yellow-600" />
                            )}
                            <span className="text-gray-600 dark:text-gray-400">
                              {new Date(run.created_at).toLocaleString()}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            run.status === 'completed'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : run.status === 'failed'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {run.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

