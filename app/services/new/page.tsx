'use client';

import MainLayout from '@/components/MainLayout';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { Contact, Appliance } from '@/lib/supabase';

function NewServiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillContactId = searchParams.get('contact_id');
  const prefillApplianceId = searchParams.get('appliance_id');

  const [formData, setFormData] = useState({
    contact_id: prefillContactId || '',
    appliance_id: prefillApplianceId || '',
    title: '',
    description: '',
    service_date: '',
    status: 'scheduled' as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
    technician: '',
    cost: '',
    notes: '',
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [selectedAppliance, setSelectedAppliance] = useState<Appliance | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.contact_id) {
      loadAppliances(formData.contact_id);
    } else {
      setAppliances([]);
      setSelectedAppliance(null);
    }
  }, [formData.contact_id]);

  useEffect(() => {
    if (formData.appliance_id && appliances.length > 0) {
      const appliance = appliances.find((a) => a.id === formData.appliance_id);
      setSelectedAppliance(appliance || null);
    } else {
      setSelectedAppliance(null);
    }
  }, [formData.appliance_id, appliances]);

  const loadData = async () => {
    try {
      const [contactsRes, appliancesRes] = await Promise.all([
        fetch('/api/contacts').then((r) => r.json()),
        formData.contact_id ? fetch(`/api/appliances?contact_id=${formData.contact_id}`).then((r) => r.json()) : Promise.resolve({ success: true, data: [] }),
      ]);

      setContacts(contactsRes.data || []);
      if (appliancesRes.success) {
        setAppliances(appliancesRes.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAppliances = async (contactId: string) => {
    try {
      const res = await fetch(`/api/appliances?contact_id=${contactId}`);
      const result = await res.json();
      if (result.success) {
        setAppliances(result.data || []);
      }
    } catch (error) {
      console.error('Error loading appliances:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          appliance_id: formData.appliance_id || null,
          cost: formData.cost ? parseFloat(formData.cost) : null,
          service_date: formData.service_date || null,
        }),
      });

      const result = await res.json();
      if (result.success) {
        router.push(`/services/${result.data.id}`);
      } else {
        alert(`Failed to create service: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating service:', error);
      alert('Error creating service');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="text-center py-12">Loading...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Service</h1>
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Contact *
                </label>
                <select
                  value={formData.contact_id}
                  onChange={(e) => setFormData({ ...formData, contact_id: e.target.value, appliance_id: '' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="">Select a contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Appliance (Optional)
                </label>
                <select
                  value={formData.appliance_id}
                  onChange={(e) => setFormData({ ...formData, appliance_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  disabled={!formData.contact_id}
                >
                  <option value="">No appliance</option>
                  {appliances.map((appliance) => (
                    <option key={appliance.id} value={appliance.id}>
                      {appliance.name} ({appliance.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedAppliance && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Selected Appliance</h3>
                <div className="text-sm text-blue-800 dark:text-blue-400">
                  <p><strong>Name:</strong> {selectedAppliance.name}</p>
                  <p><strong>Category:</strong> {selectedAppliance.category}</p>
                  {selectedAppliance.model_number && <p><strong>Model:</strong> {selectedAppliance.model_number}</p>}
                  {selectedAppliance.serial_number && <p><strong>Serial:</strong> {selectedAppliance.serial_number}</p>}
                  {selectedAppliance.brand && <p><strong>Brand:</strong> {selectedAppliance.brand}</p>}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Service Date
                </label>
                <input
                  type="datetime-local"
                  value={formData.service_date}
                  onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Technician
                </label>
                <input
                  type="text"
                  value={formData.technician}
                  onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Service'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}

export default function NewServicePage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="text-center py-12">Loading...</div>
      </MainLayout>
    }>
      <NewServiceForm />
    </Suspense>
  );
}
