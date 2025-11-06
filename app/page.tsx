import MainLayout from '@/components/MainLayout';
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard');
}

