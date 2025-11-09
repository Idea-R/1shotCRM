import { redirect } from 'next/navigation';
import { getUserRole } from '@/lib/rbac';
import { supabase } from '@/lib/supabase';
import TechnicianDashboard from '@/components/mobile/TechnicianDashboard';
import CustomerPortal from '@/components/mobile/CustomerPortal';
import CSRDashboard from '@/components/mobile/CSRDashboard';

export default async function MobilePage() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.user) {
    redirect('/auth/login');
  }

  const role = await getUserRole(session.user.id);

  if (role === 'technician') {
    return <TechnicianDashboard />;
  } else if (role === 'customer') {
    return <CustomerPortal />;
  } else if (role === 'csr' || role === 'admin' || role === 'super_admin') {
    return <CSRDashboard />;
  }

  return <CustomerPortal />;
}

