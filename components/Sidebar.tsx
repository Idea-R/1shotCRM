'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Workflow, CheckSquare, Settings, Briefcase, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Pipeline', href: '/pipeline', icon: Briefcase },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, credits, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <>
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col flex-grow border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pt-5">
          <div className="flex items-center flex-shrink-0 px-4 mb-8">
            <Workflow className="w-8 h-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">1shotCRM</span>
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'mr-3 flex-shrink-0 h-5 w-5',
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
            
            {/* User section */}
            <div className="px-2 pb-4 border-t border-gray-200 dark:border-gray-800 pt-4">
              {user ? (
                <>
                  <div className="px-3 py-2 mb-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center mb-1">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.email}
                      </span>
                    </div>
                    {credits && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {credits.credits} AI credits ({credits.plan})
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <User className="w-4 h-4 mr-2" />
                  Sign In / Sign Up
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

