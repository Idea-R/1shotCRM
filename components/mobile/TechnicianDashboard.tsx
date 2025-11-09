'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Service } from '@/lib/supabase';
import { Wrench, CheckCircle, Clock, Camera, Upload } from 'lucide-react';

export default function TechnicianDashboard() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadAssignedServices();
  }, []);

  const loadAssignedServices = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/auth/login');
        return;
      }

      setUserId(session.user.id);

      // Load services assigned to this technician
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('assigned_technician_id', session.user.id)
        .in('status', ['scheduled', 'in_progress'])
        .order('service_date', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (serviceId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entity_type', 'service');
      formData.append('entity_id', serviceId);
      formData.append('upload_source', 'pwa_technician');

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
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading services...</div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Services</h1>

      {services.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No assigned services</p>
        </div>
      ) : (
        <div className="space-y-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{service.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {service.service_date ? new Date(service.service_date).toLocaleDateString() : 'No date set'}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded ${
                  service.status === 'in_progress' 
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                }`}>
                  {service.status}
                </span>
              </div>

              {service.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{service.description}</p>
              )}

              <div className="flex gap-2">
                <label className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">
                  <Camera className="w-4 h-4 mr-2" />
                  Upload Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(service.id, file);
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  onClick={() => router.push(`/services/${service.id}`)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

