'use client';

import MainLayout from '@/components/MainLayout';
import { Bell, User, Shield, Palette, Database, Zap, CreditCard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, credits } = useAuth();

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Manage your CRM preferences</p>
        </div>

        <div className="space-y-6">
          {/* Account Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <User className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account Settings</h2>
            </div>
            {user ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Plan
                  </label>
                  <div className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                    <span className="text-gray-900 dark:text-white capitalize font-medium">
                      {credits?.plan || 'Free'}
                    </span>
                    {credits?.plan === 'free' && (
                      <Link
                        href="/settings?upgrade=true"
                        className="ml-4 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Upgrade to Pro
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Sign in to access account settings
                </p>
                <Link
                  href="/login"
                  className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Sign In / Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Credits & Usage */}
          {user && credits && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center mb-4">
                <Zap className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Credits</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Credits Remaining
                    </span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {credits.credits}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          (credits.credits / (credits.plan === 'free' ? 100 : credits.plan === 'pro' ? 1000 : 10000)) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>0</span>
                    <span>{credits.plan === 'free' ? '100' : credits.plan === 'pro' ? '1,000' : '10,000'} credits/month</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Used</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {credits.total_used || 0} credits
                    </span>
                  </div>
                </div>
                {credits.plan === 'free' && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link
                      href="/settings?upgrade=true"
                      className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Upgrade to Pro (1,000 credits/month)
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notifications */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
            </div>
            <div className="space-y-4">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Email notifications for new deals</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Email notifications for task reminders</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Weekly summary report</span>
              </label>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <Palette className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Appearance</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Theme
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                  <option>System</option>
                  <option>Light</option>
                  <option>Dark</option>
                </select>
              </div>
            </div>
          </div>

          {/* Database */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center mb-4">
              <Database className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Database</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Connected to Supabase
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Database management is handled through the Supabase dashboard for security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

