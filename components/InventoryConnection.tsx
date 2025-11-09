'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { InventoryConnection, InventoryItem } from '@/lib/inventory-service';
import { Plus, RefreshCw, Trash2, Edit, Search, Package } from 'lucide-react';

export default function InventoryConnection() {
  const [connections, setConnections] = useState<InventoryConnection[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    provider: '1shotInventory' as '1shotInventory' | 'custom',
    api_endpoint: '',
    api_key: '',
    organization_id: '',
  });
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    if (selectedConnectionId) {
      loadItems();
    }
  }, [selectedConnectionId, searchTerm]);

  const loadConnections = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/inventory?type=connections', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const result = await res.json();
      if (result.success) {
        setConnections(result.data);
        if (result.data.length > 0 && !selectedConnectionId) {
          setSelectedConnectionId(result.data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    if (!selectedConnectionId) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const params = new URLSearchParams();
      params.append('connection_id', selectedConnectionId);
      if (searchTerm) params.append('search', searchTerm);

      const res = await fetch(`/api/inventory?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const result = await res.json();
      if (result.success) {
        setItems(result.data);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleSave = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Get organization_id from user's organizations
      const { data: orgs } = await supabase.rpc('get_user_organizations', {
        p_user_id: session?.user.id,
      });
      const orgId = orgs?.[0]?.organization_id || formData.organization_id;

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...formData,
          organization_id: orgId,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setShowForm(false);
        setFormData({
          provider: '1shotInventory',
          api_endpoint: '',
          api_key: '',
          organization_id: '',
        });
        loadConnections();
      } else {
        alert(result.error || 'Failed to create connection');
      }
    } catch (error) {
      console.error('Error saving connection:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleSync = async (connectionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'sync',
          connection_id: connectionId,
          sync_type: 'incremental',
        }),
      });

      const result = await res.json();
      if (result.success) {
        alert(`Synced ${result.data.itemsSynced} items`);
        loadItems();
      } else {
        alert(result.error || 'Failed to sync inventory');
      }
    } catch (error) {
      console.error('Error syncing inventory:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/inventory?id=${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const result = await res.json();
      if (result.success) {
        loadConnections();
        if (selectedConnectionId === id) {
          setSelectedConnectionId(null);
          setItems([]);
        }
      } else {
        alert(result.error || 'Failed to delete connection');
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      alert('Network error. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory Connections</h1>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Connection
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Add Inventory Connection
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Provider
              </label>
              <select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="1shotInventory">1shotInventory</option>
                <option value="custom">Custom API</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Endpoint
              </label>
              <input
                type="text"
                value={formData.api_endpoint}
                onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://api.example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                API Key
              </label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter API key"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormData({
                    provider: '1shotInventory',
                    api_endpoint: '',
                    api_key: '',
                    organization_id: '',
                  });
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.api_endpoint || !formData.api_key}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connections List */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Connections</h2>
          <div className="space-y-2">
            {connections.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6 text-center">
                <p className="text-gray-600 dark:text-gray-400">No connections</p>
              </div>
            ) : (
              connections.map((conn) => (
                <div
                  key={conn.id}
                  onClick={() => setSelectedConnectionId(conn.id)}
                  className={`p-4 bg-white dark:bg-gray-800 rounded-lg shadow border cursor-pointer transition-colors ${
                    selectedConnectionId === conn.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{conn.provider}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{conn.api_endpoint}</p>
                      <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                        conn.active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>
                        {conn.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSync(conn.id);
                        }}
                        className="p-1 text-blue-600 hover:text-blue-700"
                        title="Sync"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(conn.id);
                        }}
                        className="p-1 text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inventory Items */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory Items</h2>
            {selectedConnectionId && (
              <div className="relative flex-1 max-w-md ml-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            )}
          </div>

          {!selectedConnectionId ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Select a connection to view inventory</p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-12 text-center">
              <p className="text-gray-600 dark:text-gray-400">No inventory items</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Click sync to load items from the connected inventory system
              </p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Quantity
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{item.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.sku || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {item.price ? `$${item.price.toFixed(2)}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

