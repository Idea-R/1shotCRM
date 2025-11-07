'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { CustomFieldDefinition, CustomFieldValue } from '@/lib/supabase';

interface CustomFieldsSectionProps {
  contactId: string;
}

export default function CustomFieldsSection({ contactId }: CustomFieldsSectionProps) {
  const [fieldDefinitions, setFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [fieldValues, setFieldValues] = useState<CustomFieldValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingValue, setEditingValue] = useState<CustomFieldValue | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [formValue, setFormValue] = useState('');

  useEffect(() => {
    loadData();
  }, [contactId]);

  const loadData = async () => {
    try {
      const [defsRes, valuesRes] = await Promise.all([
        fetch('/api/custom-fields').then((r) => r.json()),
        fetch(`/api/custom-field-values?contact_id=${contactId}`).then((r) => r.json()),
      ]);

      if (defsRes.success) setFieldDefinitions(defsRes.data);
      if (valuesRes.success) setFieldValues(valuesRes.data);
    } catch (error) {
      console.error('Error loading custom fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFieldId && !editingValue) return;

    try {
      const fieldDefId = editingValue?.field_definition_id || selectedFieldId;
      const res = await fetch('/api/custom-field-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          field_definition_id: fieldDefId,
          value: formValue,
        }),
      });

      const result = await res.json();
      if (result.success) {
        await loadData();
        setShowAddForm(false);
        setEditingValue(null);
        setSelectedFieldId('');
        setFormValue('');
      }
    } catch (error) {
      console.error('Error saving field value:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this value?')) return;

    try {
      const res = await fetch(`/api/custom-field-values?id=${id}`, { method: 'DELETE' });
      if (res.ok) await loadData();
    } catch (error) {
      console.error('Error deleting field value:', error);
    }
  };

  const getValueForField = (fieldId: string) => {
    return fieldValues.find((v) => v.field_definition_id === fieldId);
  };

  const categories = Array.from(new Set(fieldDefinitions.map((f) => f.category))).sort();

  if (loading) {
    return <div className="text-center py-4 text-gray-600 dark:text-gray-400">Loading...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Fields</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Value
        </button>
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-3">
          <select
            value={selectedFieldId}
            onChange={(e) => setSelectedFieldId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Select field...</option>
            {fieldDefinitions
              .filter((f) => !getValueForField(f.id))
              .map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name} ({field.category})
                </option>
              ))}
          </select>
          {selectedFieldId && (
            <>
              {(() => {
                const field = fieldDefinitions.find((f) => f.id === selectedFieldId);
                if (!field) return null;
                if (field.type === 'textarea') {
                  return (
                    <textarea
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      rows={3}
                      required={field.required}
                    />
                  );
                } else if (field.type === 'select') {
                  return (
                    <select
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      required={field.required}
                    >
                      <option value="">Select...</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  );
                } else if (field.type === 'date') {
                  return (
                    <input
                      type="date"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      required={field.required}
                    />
                  );
                } else if (field.type === 'number') {
                  return (
                    <input
                      type="number"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      required={field.required}
                    />
                  );
                } else {
                  return (
                    <input
                      type="text"
                      value={formValue}
                      onChange={(e) => setFormValue(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      required={field.required}
                    />
                  );
                }
              })()}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setSelectedFieldId('');
                    setFormValue('');
                  }}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
          No custom fields defined. Create them in Settings.
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryFields = fieldDefinitions.filter((f) => f.category === category);
            const categoryValues = categoryFields
              .map((f) => getValueForField(f.id))
              .filter((v) => v !== undefined) as CustomFieldValue[];

            if (categoryValues.length === 0) return null;

            return (
              <div key={category}>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{category}</h3>
                <div className="space-y-2">
                  {categoryValues.map((value) => {
                    const field = fieldDefinitions.find((f) => f.id === value.field_definition_id);
                    if (!field) return null;

                    return (
                      <div
                        key={value.id}
                        className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{field.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{value.value || '-'}</div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingValue(value);
                              setFormValue(value.value);
                              setShowAddForm(true);
                            }}
                            className="p-1 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(value.id)}
                            className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

