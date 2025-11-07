'use client';

import MainLayout from '@/components/MainLayout';
import { Bell, User, Shield, Palette, Database, Zap, CreditCard, Plus, Edit, Trash2, Settings2, Tag, Users, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CustomFieldDefinition, ContactProfileType, ContactCategory } from '@/lib/supabase';
import EmailTemplatesSection from '@/components/EmailTemplatesSection';
import CalendarSync from '@/components/CalendarSync';

export default function SettingsPage() {
  const { user, credits } = useAuth();
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [profileTypes, setProfileTypes] = useState<ContactProfileType[]>([]);
  const [categories, setCategories] = useState<ContactCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showProfileTypeForm, setShowProfileTypeForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);
  const [editingProfileType, setEditingProfileType] = useState<ContactProfileType | null>(null);
  const [editingCategory, setEditingCategory] = useState<ContactCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as 'text' | 'number' | 'date' | 'select' | 'textarea',
    category: 'General',
    order: 0,
    required: false,
    options: '',
  });
  const [profileTypeFormData, setProfileTypeFormData] = useState({
    name: '',
    icon: '',
    color: '#3B82F6',
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
    icon: '',
    color: '#6B7280',
  });

  useEffect(() => {
    loadCustomFields();
    loadProfileTypes();
    loadCategories();
  }, []);

  const loadCustomFields = async () => {
    try {
      const res = await fetch('/api/custom-fields');
      const result = await res.json();
      if (result.success) {
        setCustomFields(result.data.map((field: any) => ({
          ...field,
          options: field.options ? JSON.parse(field.options) : undefined,
        })));
      }
    } catch (error) {
      console.error('Error loading custom fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfileTypes = async () => {
    try {
      const res = await fetch('/api/profile-types');
      const result = await res.json();
      if (result.success) {
        setProfileTypes(result.data);
      }
    } catch (error) {
      console.error('Error loading profile types:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const result = await res.json();
      if (result.success) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingField ? '/api/custom-fields' : '/api/custom-fields';
      const method = editingField ? 'PUT' : 'POST';
      const body = {
        ...(editingField && { id: editingField.id }),
        name: formData.name,
        type: formData.type,
        category: formData.category,
        order: formData.order,
        required: formData.required,
        options: formData.type === 'select' && formData.options ? formData.options.split(',').map((o: string) => o.trim()) : undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (result.success) {
        await loadCustomFields();
        setShowForm(false);
        setEditingField(null);
        setFormData({
          name: '',
          type: 'text',
          category: 'General',
          order: 0,
          required: false,
          options: '',
        });
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving custom field:', error);
      alert('Error saving custom field');
    }
  };

  const handleEdit = (field: CustomFieldDefinition) => {
    setEditingField(field);
    setFormData({
      name: field.name,
      type: field.type,
      category: field.category,
      order: field.order,
      required: field.required,
      options: field.options ? field.options.join(', ') : '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom field? This will also delete all values for this field.')) {
      return;
    }

    try {
      const res = await fetch(`/api/custom-fields?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        await loadCustomFields();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting custom field:', error);
      alert('Error deleting custom field');
    }
  };

  const handleProfileTypeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/profile-types';
      const method = editingProfileType ? 'PUT' : 'POST';
      const body = {
        ...(editingProfileType && { id: editingProfileType.id }),
        ...profileTypeFormData,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (result.success) {
        await loadProfileTypes();
        setShowProfileTypeForm(false);
        setEditingProfileType(null);
        setProfileTypeFormData({ name: '', icon: '', color: '#3B82F6' });
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving profile type:', error);
      alert('Error saving profile type');
    }
  };

  const handleProfileTypeDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this profile type? This will remove it from all contacts.')) {
      return;
    }

    try {
      const res = await fetch(`/api/profile-types?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        await loadProfileTypes();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting profile type:', error);
      alert('Error deleting profile type');
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/categories';
      const method = editingCategory ? 'PUT' : 'POST';
      const body = {
        ...(editingCategory && { id: editingCategory.id }),
        ...categoryFormData,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();
      if (result.success) {
        await loadCategories();
        setShowCategoryForm(false);
        setEditingCategory(null);
        setCategoryFormData({ name: '', description: '', icon: '', color: '#6B7280' });
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error saving category');
    }
  };

  const handleCategoryDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category? This will remove it from all contacts.')) {
      return;
    }

    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        await loadCategories();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Error deleting category');
    }
  };

  const fieldCategories = Array.from(new Set(customFields.map(f => f.category))).sort();

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

          {/* Custom Fields */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Settings2 className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Fields</h2>
              </div>
              <button
                onClick={() => {
                  setShowForm(true);
                  setEditingField(null);
                  setFormData({
                    name: '',
                    type: 'text',
                    category: 'General',
                    order: 0,
                    required: false,
                    options: '',
                  });
                }}
                className="flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Field
              </button>
            </div>

            {showForm && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <h3 className="text-md font-semibold mb-4 text-gray-900 dark:text-white">
                  {editingField ? 'Edit Custom Field' : 'New Custom Field'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Field Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Type *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any, options: '' })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        required
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="select">Select (Dropdown)</option>
                        <option value="textarea">Textarea</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        placeholder="e.g., Customer Profile, Service Info"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Order
                      </label>
                      <input
                        type="number"
                        value={formData.order}
                        onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  </div>
                  {formData.type === 'select' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Options (comma-separated) *
                      </label>
                      <input
                        type="text"
                        value={formData.options}
                        onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        placeholder="Option 1, Option 2, Option 3"
                        required={formData.type === 'select'}
                      />
                    </div>
                  )}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.required}
                        onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Required field</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      {editingField ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingField(null);
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>
            ) : customFields.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                No custom fields defined. Create one to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {fieldCategories.map((category) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{category}</h4>
                    <div className="space-y-2">
                      {customFields
                        .filter((f) => f.category === category)
                        .sort((a, b) => a.order - b.order)
                        .map((field) => (
                          <div
                            key={field.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-white">{field.name}</span>
                                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                  {field.type}
                                </span>
                                {field.required && (
                                  <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                                    Required
                                  </span>
                                )}
                              </div>
                              {field.type === 'select' && field.options && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Options: {field.options.join(', ')}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(field)}
                                className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(field.id)}
                                className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Profile Types */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Tag className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Types</h2>
              </div>
              <button
                onClick={() => {
                  setShowProfileTypeForm(true);
                  setEditingProfileType(null);
                  setProfileTypeFormData({ name: '', icon: '', color: '#3B82F6' });
                }}
                className="flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Profile Type
              </button>
            </div>

            {showProfileTypeForm && (
              <form onSubmit={handleProfileTypeSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                    <input
                      type="text"
                      value={profileTypeFormData.name}
                      onChange={(e) => setProfileTypeFormData({ ...profileTypeFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                    <input
                      type="color"
                      value={profileTypeFormData.color}
                      onChange={(e) => setProfileTypeFormData({ ...profileTypeFormData, color: e.target.value })}
                      className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</label>
                  <input
                    type="text"
                    value={profileTypeFormData.icon}
                    onChange={(e) => setProfileTypeFormData({ ...profileTypeFormData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="e.g., Wrench, Zap"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {editingProfileType ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileTypeForm(false);
                      setEditingProfileType(null);
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {profileTypes.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">No profile types defined</div>
            ) : (
              <div className="space-y-2">
                {profileTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: type.color }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white">{type.name}</span>
                      {type.icon && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Icon: {type.icon}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingProfileType(type);
                          setProfileTypeFormData({
                            name: type.name,
                            icon: type.icon || '',
                            color: type.color,
                          });
                          setShowProfileTypeForm(true);
                        }}
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleProfileTypeDelete(type.id)}
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Categories */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Users className="w-5 h-5 text-gray-600 dark:text-gray-400 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Categories</h2>
              </div>
              <button
                onClick={() => {
                  setShowCategoryForm(true);
                  setEditingCategory(null);
                  setCategoryFormData({ name: '', description: '', icon: '', color: '#6B7280' });
                }}
                className="flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Category
              </button>
            </div>

            {showCategoryForm && (
              <form onSubmit={handleCategorySubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                    <input
                      type="text"
                      value={categoryFormData.name}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                    <input
                      type="color"
                      value={categoryFormData.color}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                      className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <input
                    type="text"
                    value={categoryFormData.description}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Icon</label>
                  <input
                    type="text"
                    value={categoryFormData.icon}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                    placeholder="e.g., UserPlus, Building"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {editingCategory ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryForm(false);
                      setEditingCategory(null);
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {categories.length === 0 ? (
              <div className="text-center py-8 text-gray-600 dark:text-gray-400">No categories defined</div>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: category.color }}
                      />
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">{category.name}</span>
                        {category.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingCategory(category);
                          setCategoryFormData({
                            name: category.name,
                            description: category.description || '',
                            icon: category.icon || '',
                            color: category.color,
                          });
                          setShowCategoryForm(true);
                        }}
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleCategoryDelete(category.id)}
                        className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email Templates */}
          <EmailTemplatesSection />

          {/* Calendar Integration */}
          <CalendarSync />

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

