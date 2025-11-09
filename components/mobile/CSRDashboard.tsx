'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Service, Contact } from '@/lib/supabase';
import { Users, Clock, CheckCircle, Phone, Mail } from 'lucide-react';

export default function CSRDashboard() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/auth/login');
        return;
      }

      // Load pending services
      const { data: servicesData } = await supabase
        .from('services')
        .select('*, contact:contacts(*)')
        .in('status', ['scheduled'])
        .order('service_date', { ascending: true })
        .limit(20);

      setServices(servicesData || []);

      // Load recent contacts
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CSR Dashboard</h1>

      {/* Service Queue */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Service Queue ({services.length})
        </h2>
        {services.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No pending services</p>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{service.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {(service.contact as Contact)?.name || 'Unknown contact'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {service.service_date ? new Date(service.service_date).toLocaleDateString() : 'No date'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(service.contact as Contact)?.phone && (
                    <a
                      href={`tel:${(service.contact as Contact).phone}`}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Call
                    </a>
                  )}
                  {(service.contact as Contact)?.email && (
                    <a
                      href={`mailto:${(service.contact as Contact).email}`}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </a>
                  )}
                  <button
                    onClick={() => router.push(`/services/${service.id}`)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Contacts */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Recent Contacts
        </h2>
        {contacts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">No contacts</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => router.push(`/contacts/${contact.id}`)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">{contact.name}</h3>
                {contact.email && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{contact.email}</p>
                )}
                {contact.phone && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{contact.phone}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

