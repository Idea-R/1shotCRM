import MainLayout from '@/components/MainLayout';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { Mail, Phone, Building, DollarSign, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import ContactInfoPanel from '@/components/ContactInfoPanel';
import ActivityLog from '@/components/ActivityLog';

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .single();

  if (!contact) {
    notFound();
  }

  const { data: relatedDeals } = await supabase
    .from('deals')
    .select('*, stage:pipeline_stages(*)')
    .eq('contact_id', id)
    .order('created_at', { ascending: false });

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('contact_id', id)
    .order('created_at', { ascending: false });

  const { data: relatedTasks } = await supabase
    .from('tasks')
    .select('*, deal:deals(*)')
    .eq('contact_id', id)
    .order('created_at', { ascending: false });

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{contact.name}</h1>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {contact.email && (
              <div className="flex items-center">
                <Mail className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <a
                    href={`mailto:${contact.email}`}
                    className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {contact.email}
                  </a>
                </div>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center">
                <Phone className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  <a
                    href={`tel:${contact.phone}`}
                    className="text-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {contact.phone}
                  </a>
                </div>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center">
                <Building className="w-5 h-5 text-gray-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Company</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {contact.company}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {format(new Date(contact.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Contact Info */}
          <div className="lg:col-span-1">
            <ContactInfoPanel 
              contact={contact} 
              deals={relatedDeals || []} 
              tasks={relatedTasks || []} 
            />
          </div>

          {/* Middle Panel - Activity Log */}
          <div className="lg:col-span-2">
            <ActivityLog contactId={id} activities={activities || []} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

