'use client';

import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function CalendarSync() {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (user) {
      checkConnection();
    }
  }, [user]);

  const checkConnection = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/calendar/google', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await res.json();
      setConnected(result.success && result.connected);
    } catch (error) {
      console.error('Error checking calendar connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please sign in to connect Google Calendar');
        return;
      }

      const res = await fetch('/api/calendar/google?action=auth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await res.json();
      
      if (result.success && result.authUrl) {
        window.location.href = result.authUrl;
      } else {
        alert('Failed to initiate Google Calendar connection');
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
      alert('Network error. Please try again.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/calendar/google', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await res.json();
      
      if (result.success) {
        setConnected(false);
      } else {
        alert(result.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
      alert('Network error. Please try again.');
    }
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('calendar_code');
    
    if (code && user) {
      handleOAuthCallback(code);
    }
  }, [user]);

  const handleOAuthCallback = async (code: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/calendar/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code }),
      });

      const result = await res.json();
      
      if (result.success) {
        setConnected(true);
        // Remove code from URL
        window.history.replaceState({}, '', '/settings');
      } else {
        alert(result.error || 'Failed to connect Google Calendar');
      }
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      alert('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-4 text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Google Calendar</h2>
        </div>
        {connected ? (
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Not Connected</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {connected
            ? 'Your Google Calendar is connected. You can create events from deals and contacts.'
            : 'Connect your Google Calendar to create and sync events directly from your CRM.'}
        </p>

        <div className="flex items-center gap-2">
          {connected ? (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? 'Connecting...' : 'Connect Google Calendar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

