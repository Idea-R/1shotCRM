'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Tag } from 'lucide-react';
import { ContactProfileType, ContactProfileTypeAssignment } from '@/lib/supabase';

interface ProfileTypesSectionProps {
  contactId: string;
}

export default function ProfileTypesSection({ contactId }: ProfileTypesSectionProps) {
  const [profileTypes, setProfileTypes] = useState<ContactProfileType[]>([]);
  const [assignments, setAssignments] = useState<ContactProfileTypeAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');

  useEffect(() => {
    loadData();
  }, [contactId]);

  const loadData = async () => {
    try {
      const [typesRes, assignmentsRes] = await Promise.all([
        fetch('/api/profile-types'),
        fetch(`/api/contact-profile-types?contact_id=${contactId}`),
      ]);

      const typesResult = await typesRes.json();
      const assignmentsResult = await assignmentsRes.json();

      if (typesResult.success) setProfileTypes(typesResult.data);
      if (assignmentsResult.success) setAssignments(assignmentsResult.data);
    } catch (error) {
      console.error('Error loading profile types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedTypeId) return;

    try {
      const res = await fetch('/api/contact-profile-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: contactId,
          profile_type_id: selectedTypeId,
          is_primary: assignments.length === 0, // First one is primary
        }),
      });

      const result = await res.json();
      if (result.success) {
        await loadData();
        setShowAdd(false);
        setSelectedTypeId('');
      }
    } catch (error) {
      console.error('Error adding profile type:', error);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/contact-profile-types?id=${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error removing profile type:', error);
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const res = await fetch('/api/contact-profile-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_primary: true }),
      });

      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error setting primary:', error);
    }
  };

  const availableTypes = profileTypes.filter(
    (type) => !assignments.some((a) => a.profile_type_id === type.id)
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Types</h2>
        {availableTypes.length > 0 && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Type
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex gap-2">
          <select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="">Select profile type...</option>
            {availableTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
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
              setSelectedTypeId('');
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
        <div className="text-center py-4 text-gray-600 dark:text-gray-400">No profile types assigned</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
              style={{
                backgroundColor: assignment.profile_type?.color
                  ? `${assignment.profile_type.color}20`
                  : '#3B82F620',
                border: `1px solid ${assignment.profile_type?.color || '#3B82F6'}`,
              }}
            >
              <Tag className="w-4 h-4" style={{ color: assignment.profile_type?.color || '#3B82F6' }} />
              <span className="font-medium" style={{ color: assignment.profile_type?.color || '#3B82F6' }}>
                {assignment.profile_type?.name}
              </span>
              {assignment.is_primary && (
                <span className="text-xs px-1.5 py-0.5 bg-blue-600 text-white rounded">Primary</span>
              )}
              {!assignment.is_primary && (
                <button
                  onClick={() => handleSetPrimary(assignment.id)}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  title="Set as primary"
                >
                  Set Primary
                </button>
              )}
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

