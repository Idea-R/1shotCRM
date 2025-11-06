'use client';

import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Contact, Deal, Task } from '@/lib/supabase';

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    contacts: Contact[];
    deals: Deal[];
    tasks: Task[];
  }>({ contacts: [], deals: [], tasks: [] });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ contacts: [], deals: [], tasks: [] });
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const [contactsRes, dealsRes, tasksRes] = await Promise.all([
          supabase.from('contacts').select('*').ilike('name', `%${query}%`).limit(5),
          supabase.from('deals').select('*, contact:contacts(*)').ilike('title', `%${query}%`).limit(5),
          supabase.from('tasks').select('*').ilike('title', `%${query}%`).limit(5),
        ]);

        setResults({
          contacts: contactsRes.data || [],
          deals: dealsRes.data || [],
          tasks: tasksRes.data || [],
        });
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
      <div className="relative w-full max-w-2xl mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts, deals, tasks... (Press Esc to close)"
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
              autoFocus
            />
            <button
              onClick={() => setIsOpen(false)}
              className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {isLoading && (
              <div className="px-4 py-8 text-center text-gray-500">Searching...</div>
            )}
            
            {!isLoading && query.length >= 2 && (
              <>
                {results.contacts.length > 0 && (
                  <div className="px-4 py-2">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Contacts</div>
                    {results.contacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          router.push(`/contacts/${contact.id}`);
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-between"
                      >
                        <span className="text-gray-900 dark:text-white">{contact.name}</span>
                        {contact.email && (
                          <span className="text-xs text-gray-500">{contact.email}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                {results.deals.length > 0 && (
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Deals</div>
                    {results.deals.map((deal) => (
                      <button
                        key={deal.id}
                        onClick={() => {
                          router.push(`/pipeline/${deal.id}`);
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-between"
                      >
                        <span className="text-gray-900 dark:text-white">{deal.title}</span>
                        {deal.value && (
                          <span className="text-xs text-gray-500">${deal.value.toLocaleString()}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
                {results.tasks.length > 0 && (
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Tasks</div>
                    {results.tasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => {
                          router.push('/tasks');
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <span className="text-gray-900 dark:text-white">{task.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {results.contacts.length === 0 && results.deals.length === 0 && results.tasks.length === 0 && (
                  <div className="px-4 py-8 text-center text-gray-500">No results found</div>
                )}
              </>
            )}
            
            {query.length < 2 && (
              <div className="px-4 py-8 text-center text-gray-500">
                Type at least 2 characters to search
              </div>
            )}
          </div>
          
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+K</kbd> or <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Cmd+K</kbd> to open search
          </div>
        </div>
      </div>
    </div>
  );
}

