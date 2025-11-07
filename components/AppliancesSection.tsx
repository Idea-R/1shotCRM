'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Wrench, Edit, Trash2 } from 'lucide-react';
import { Appliance, ApplianceType } from '@/lib/supabase';
import { format } from 'date-fns';

interface AppliancesSectionProps {
  contactId: string;
}

export default function AppliancesSection({ contactId }: AppliancesSectionProps) {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [applianceTypes, setApplianceTypes] = useState<ApplianceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAppliance, setEditingAppliance] = useState<Appliance | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    appliance_type_id: '',
    model_number: '',
    serial_number: '',
    brand: '',
    purchase_date: '',
    install_date: '',
    age_years: '',
    notes: '',
  });

  useEffect(() => {
    loadAppliances();
    loadApplianceTypes();
  }, [contactId]);

  const loadAppliances = async () => {
    try {
      const res = await fetch(`/api/appliances?contact_id=${contactId}`);
      const result = await res.json();
      if (result.success) {
        setAppliances(result.data);
      }
    } catch (error) {
      console.error('Error loading appliances:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApplianceTypes = async () => {
    try {
      const res = await fetch('/api/appliance-types');
      const result = await res.json();
      if (result.success) {
        setApplianceTypes(result.data);
      }
    } catch (error) {
      console.error('Error loading appliance types:', error);
    }
  };

  const handleInstallDateChange = (date: string) => {
    if (date) {
      const installDate = new Date(date);
      const today = new Date();
      const age = Math.floor((today.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
      setFormData({ ...formData, install_date: date, age_years: age.toString() });
    } else {
      setFormData({ ...formData, install_date: '', age_years: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/appliances';
      const method = editingAppliance ? 'PUT' : 'POST';
      const body = {
        ...(editingAppliance && { id: editingAppliance.id }),
        contact_id: contactId,
        name: formData.name,
        category: formData.category,
        appliance_type_id: formData.appliance_type_id || null,
        model_number: formData.model_number || null,
        serial_number: formData.serial_number || null,
        brand: formData.brand || null,
        purchase_date: formData.purchase_date || null,
        install_date: formData.install_date || null,
        age_years: formData.age_years ? parseInt(formData.age_years) : null,
        notes: formData.notes || null,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (result.success) {
        await loadAppliances();
        setShowForm(false);
        setEditingAppliance(null);
        setFormData({
          name: '',
          category: '',
          appliance_type_id: '',
          model_number: '',
          serial_number: '',
          brand: '',
          purchase_date: '',
          install_date: '',
          age_years: '',
          notes: '',
        });
      }
    } catch (error) {
      console.error('Error saving appliance:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this appliance? This will also delete related service history.')) return;

    try {
      const res = await fetch(`/api/appliances?id=${id}`, { method: 'DELETE' });
      if (res.ok) await loadAppliances();
    } catch (error) {
      console.error('Error deleting appliance:', error);
    }
  };

  const categories = Array.from(new Set(appliances.map((a) => a.category))).sort();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appliances & Equipment</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingAppliance(null);
            setFormData({
              name: '',
              category: '',
              appliance_type_id: '',
              model_number: '',
              serial_number: '',
              brand: '',
              purchase_date: '',
              install_date: '',
              age_years: '',
              notes: '',
            });
          }}
          className="flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Appliance
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category *</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="e.g., Kitchen, Laundry, HVAC"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Appliance Type</label>
              <select
                value={formData.appliance_type_id}
                onChange={(e) => setFormData({ ...formData, appliance_type_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Select type...</option>
                {applianceTypes
                  .filter((type) => type.category === formData.category || !formData.category)
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Or Custom Type</label>
              <input
                type="text"
                placeholder="Enter custom type if not listed"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                onBlur={(e) => {
                  if (e.target.value && !formData.appliance_type_id) {
                    // If custom type entered, clear appliance_type_id selection
                    setFormData({ ...formData, appliance_type_id: '' });
                  }
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model Number</label>
              <input
                type="text"
                value={formData.model_number}
                onChange={(e) => setFormData({ ...formData, model_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purchase Date</label>
              <input
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Install Date</label>
              <input
                type="date"
                value={formData.install_date}
                onChange={(e) => handleInstallDateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Age (years)</label>
              <input
                type="number"
                value={formData.age_years}
                onChange={(e) => setFormData({ ...formData, age_years: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                placeholder="Auto-calculated from install date"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              {editingAppliance ? 'Update' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingAppliance(null);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
      ) : appliances.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">No appliances added yet</div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{category}</h3>
              <div className="space-y-2">
                {appliances
                  .filter((a) => a.category === category)
                  .map((appliance) => (
                    <div
                      key={appliance.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Link
                            href={`/contacts/${contactId}/appliances/${appliance.id}`}
                            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {appliance.name}
                          </Link>
                          <div className="mt-1 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                            {appliance.appliance_type?.name && <div>Type: {appliance.appliance_type.name}</div>}
                            {appliance.brand && <div>Brand: {appliance.brand}</div>}
                            {appliance.model_number && <div>Model: {appliance.model_number}</div>}
                            {appliance.serial_number && <div>Serial: {appliance.serial_number}</div>}
                            {appliance.purchase_date && (
                              <div>Purchased: {format(new Date(appliance.purchase_date), 'MMM d, yyyy')}</div>
                            )}
                            {appliance.install_date && (
                              <div>Installed: {format(new Date(appliance.install_date), 'MMM d, yyyy')}</div>
                            )}
                            {appliance.age_years !== null && appliance.age_years !== undefined && (
                              <div>Age: {appliance.age_years} years</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/services/new?contact_id=${contactId}&appliance_id=${appliance.id}`}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Create Service"
                          >
                            <Wrench className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => {
                              setEditingAppliance(appliance);
                              setFormData({
                                name: appliance.name,
                                category: appliance.category,
                                appliance_type_id: appliance.appliance_type_id || '',
                                model_number: appliance.model_number || '',
                                serial_number: appliance.serial_number || '',
                                brand: appliance.brand || '',
                                purchase_date: appliance.purchase_date || '',
                                install_date: appliance.install_date || '',
                                age_years: appliance.age_years?.toString() || '',
                                notes: appliance.notes || '',
                              });
                              setShowForm(true);
                            }}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(appliance.id)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

