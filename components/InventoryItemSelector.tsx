'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryItem } from '@/lib/inventory-service';
import { Search, Package, Check } from 'lucide-react';

interface InventoryItemSelectorProps {
  onSelect: (item: InventoryItem) => void;
  connectionId?: string;
  selectedItemId?: string;
}

export default function InventoryItemSelector({ onSelect, connectionId, selectedItemId }: InventoryItemSelectorProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadItems();
  }, [connectionId, searchTerm]);

  const loadItems = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const params = new URLSearchParams();
      if (connectionId) params.append('connection_id', connectionId);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/inventory?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const result = await res.json();
      if (result.success) {
        setItems(result.data);
      }
    } catch (error) {
      console.error('Error loading inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-600 dark:text-gray-400">Loading items...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search inventory..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="max-h-96 overflow-y-auto space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No inventory items found</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelect(item)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedItemId === item.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{item.name}</h3>
                    {selectedItemId === item.id && (
                      <Check className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  {item.sku && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">SKU: {item.sku}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {item.price && <span>${item.price.toFixed(2)}</span>}
                    <span>Qty: {item.quantity}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

