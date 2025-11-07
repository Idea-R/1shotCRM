import MainLayout from '@/components/MainLayout';
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { Wrench, Calendar, ArrowLeft, Plus, Edit } from 'lucide-react';
import Link from 'next/link';
import ServiceHistorySection from '@/components/ServiceHistorySection';

export default async function ApplianceDetailPage({
  params,
}: {
  params: Promise<{ id: string; applianceId: string }>;
}) {
  const { id, applianceId } = await params;

  const { data: appliance } = await supabase
    .from('appliances')
    .select('*, contact:contacts(*)')
    .eq('id', applianceId)
    .eq('contact_id', id)
    .single();

  if (!appliance) {
    notFound();
  }

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('appliance_id', applianceId)
    .order('service_date', { ascending: false });

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <Link
          href={`/contacts/${id}`}
          className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Contact
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{appliance.name}</h1>
              <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">{appliance.category}</p>
            </div>
            <Link
              href={`/services/new?contact_id=${id}&appliance_id=${applianceId}`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              New Service
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Details</h3>
              <div className="space-y-3">
                {appliance.brand && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Brand:</span>
                    <span className="ml-2 text-sm text-gray-900 dark:text-white">{appliance.brand}</span>
                  </div>
                )}
                {appliance.model_number && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Model Number:</span>
                    <span className="ml-2 text-sm text-gray-900 dark:text-white">{appliance.model_number}</span>
                  </div>
                )}
                {appliance.serial_number && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Serial Number:</span>
                    <span className="ml-2 text-sm text-gray-900 dark:text-white">{appliance.serial_number}</span>
                  </div>
                )}
                {appliance.purchase_date && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Purchase Date:</span>
                    <span className="ml-2 text-sm text-gray-900 dark:text-white">
                      {format(new Date(appliance.purchase_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                <div className="flex items-center">
                  <Wrench className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Owner:</span>
                  <Link
                    href={`/contacts/${id}`}
                    className="ml-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {appliance.contact?.name}
                  </Link>
                </div>
              </div>
            </div>

            {appliance.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Notes</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{appliance.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Related Services */}
        {services && services.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Related Services</h2>
            <div className="space-y-2">
              {services.map((service) => (
                <Link
                  key={service.id}
                  href={`/services/${service.id}`}
                  className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{service.title}</div>
                      {service.service_date && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {format(new Date(service.service_date), 'MMM d, yyyy')}
                        </div>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      service.status === 'completed' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                      service.status === 'in_progress' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                      service.status === 'scheduled' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                      'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                    }`}>
                      {service.status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Service History for this Appliance */}
        <ServiceHistorySection contactId={id} applianceId={applianceId} />
      </div>
    </MainLayout>
  );
}

