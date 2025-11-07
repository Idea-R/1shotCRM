'use client';

import { useState } from 'react';
import { Mail, Calendar as CalendarIcon } from 'lucide-react';
import { Deal } from '@/lib/supabase';
import EmailComposer from './EmailComposer';
import CalendarEventCreator from './CalendarEventCreator';

interface DealActionsProps {
  deal: Deal;
}

export default function DealActions({ deal }: DealActionsProps) {
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  const [showCalendarCreator, setShowCalendarCreator] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 mt-4">
        {deal.contact?.email && (
          <button
            onClick={() => setShowEmailComposer(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Email
          </button>
        )}
        <button
          onClick={() => setShowCalendarCreator(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <CalendarIcon className="w-4 h-4 mr-2" />
          Create Event
        </button>
      </div>

      {showEmailComposer && deal.contact && (
        <EmailComposer
          contact={deal.contact}
          deal={deal}
          onClose={() => setShowEmailComposer(false)}
          onSuccess={() => {
            setShowEmailComposer(false);
            window.location.reload();
          }}
        />
      )}

      {showCalendarCreator && (
        <CalendarEventCreator
          contact={deal.contact}
          deal={deal}
          onClose={() => setShowCalendarCreator(false)}
          onSuccess={() => {
            setShowCalendarCreator(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

