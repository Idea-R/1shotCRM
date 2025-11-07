'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { ContactCategory, ContactCategoryAssignment } from '@/lib/supabase';

interface CategoriesSectionProps {
  contactId: string;
}

export default function CategoriesSection({ contactId }: CategoriesSectionProps) {
  const [categories, setCategories] = useState<ContactCategory[]>([]);
  const [assignments, setAssignments] = useState<ContactCategoryAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');

  useEffect(() => {
    loadData();
  }, [contactId]);

  const loadData = async () => {
    try {
      const [categoriesRes, assignmentsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch(`/api/contact-categories?contact_id=${contactId}`),
      ]);

      const categoriesResult = await categoriesRes.json();
      const assignmentsResult = await assignmentsRes.json();

      if (categoriesResult.success) setCategories(categoriesResult.data);
      if (assignmentsResult.success) setAssignments(assignmentsResult.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedCategoryId) return;

    try {
      const res = await fetch('/api/contact-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          category_id: selectedCategoryId,
        }),
      });

      const result = await res.json();
      if (result.success) {
        await loadData();
        setShowAdd(false);
        setSelectedCategoryId('');
      }
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/contact-categories?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error removing category:', error);
    }
  };

  const availableCategories = categories.filter(
    (cat) => !assignments.some((a) => a.category_id === cat.id)
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Categories</h2>
        {availableCategories.length > 0 && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Category
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex gap-2">
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Select category...</option>
            {availableCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
          >
            Add
          </button>
          <button
            onClick={() => {
              setShowAdd(false);
              setSelectedCategoryId('');
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4 text-gray-600 dark:text-gray-400">Loading...</div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-4 text-gray-600 dark:text-gray-400">No categories assigned</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: assignment.category?.color
                  ? `${assignment.category.color}20`
                  : '#6B728020',
                border: `1px solid ${assignment.category?.color || '#6B7280'}`,
              }}
            >
              <Tag className="w-4 h-4" style={{ color: assignment.category?.color || '#6B7280' }} />
              <span className="font-medium" style={{ color: assignment.category?.color || '#6B7280' }}>
                {assignment.category?.name}
              </span>
              <button
                onClick={() => handleRemove(assignment.id)}
                className="ml-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

