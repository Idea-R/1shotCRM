'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Service, Appliance } from '@/lib/supabase';
import { History, Wrench, Calendar, Camera, Upload } from 'lucide-react';

export default function CustomerPortal() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactId, setContactId] = useState<string | null>(null);

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/auth/login');
        return;
      }

      // Find contact by user email
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', session.user.email)
        .single();

      if (!contact) {
        setLoading(false);
        return;
      }

      setContactId(contact.id);

      // Load services for this contact
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('contact_id', contact.id)
        .order('service_date', { ascending: false })
        .limit(10);

      setServices(servicesData || []);

      // Load appliances for this contact
      const { data: appliancesData } = await supabase
        .from('appliances')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: false });

      setAppliances(appliancesData || []);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (applianceId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', 'appliance');
      formData.append('entity_id', applianceId);
      formData.append('appliance_id', applianceId);
      formData.append('upload_source', 'pwa_customer');

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/attachments', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const result = await res.json();
      if (result.success) {
        alert('Image uploaded successfully');
      } else {
        alert(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Account</h1>

      {/* Service History */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5" />
          Service History
        </h2>
        {services.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No service history</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{service.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {service.service_date ? new Date(service.service_date).toLocaleDateString() : 'No date'}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    service.status === 'completed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {service.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Appliances */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Wrench className="w-5 h-5" />
          My Appliances
        </h2>
        {appliances.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No appliances registered</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appliances.map((appliance) => (
              <div
                key={appliance.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{appliance.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {appliance.brand} {appliance.model_number}
                    </p>
                  </div>
                </div>
                <label className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">
                  <Camera className="w-4 h-4 mr-2" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(appliance.id, file);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

