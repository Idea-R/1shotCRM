'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Zap, Shield, Users, BarChart3, Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function PremiumFeatures() {
  const { user, credits } = useAuth();

  if (user) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Premium Features
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Unlock advanced features with a Pro account
            </p>
          </div>
          <Sparkles className="w-6 h-6 text-blue-600" />
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="flex items-center text-sm">
            <Zap className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">
              {credits?.plan === 'free' ? '100' : credits?.plan === 'pro' ? '1,000' : '10,000'} AI credits/month
            </span>
          </div>
          <div className="flex items-center text-sm">
            <BarChart3 className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">Advanced analytics & reports</span>
          </div>
          <div className="flex items-center text-sm">
            <Users className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">Team collaboration features</span>
          </div>
          <div className="flex items-center text-sm">
            <Shield className="w-4 h-4 text-blue-600 mr-2" />
            <span className="text-gray-700 dark:text-gray-300">Priority support</span>
          </div>
        </div>
        
        {credits?.plan === 'free' && (
          <Link
            href="/settings?upgrade=true"
            className="block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Upgrade to Pro
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Sign Up for Free
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Get 100 AI credits per month
          </p>
        </div>
        <Sparkles className="w-6 h-6 text-blue-600" />
      </div>
      
      <div className="space-y-2 mb-4 text-sm text-gray-700 dark:text-gray-300">
        <div className="flex items-center">
          <Zap className="w-4 h-4 text-blue-600 mr-2" />
          <span>100 free AI credits/month</span>
        </div>
        <div className="flex items-center">
          <BarChart3 className="w-4 h-4 text-blue-600 mr-2" />
          <span>Full CRM access</span>
        </div>
        <div className="flex items-center">
          <Shield className="w-4 h-4 text-blue-600 mr-2" />
          <span>Data privacy & security</span>
        </div>
      </div>
      
      <Link
        href="/login"
        className="block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
      >
        Create Free Account
      </Link>
    </div>
  );
}

