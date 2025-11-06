'use client';

import { useState, useEffect } from 'react';
import { Tag as TagType } from '@/lib/supabase';
import { X, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface TagBadgeProps {
  tag: TagType;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function TagBadge({ tag, onRemove, size = 'md' }: TagBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]}`}
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
    >
      {tag.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:opacity-70 transition-opacity"
          aria-label={`Remove ${tag.name} tag`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

interface TagSelectorProps {
  selectedTags: TagType[];
  onTagsChange: (tags: TagType[]) => void;
  entityType: 'contact' | 'deal';
  entityId: string;
}

export function TagSelector({ selectedTags, onTagsChange, entityType, entityId }: TagSelectorProps) {
  const [allTags, setAllTags] = useState<TagType[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    const { data } = await supabase.from('tags').select('*').order('name');
    if (data) setAllTags(data);
  };

  const handleAddTag = async (tag: TagType) => {
    if (selectedTags.find(t => t.id === tag.id)) return;

    const tableName = entityType === 'contact' ? 'contact_tags' : 'deal_tags';
    const { error } = await supabase
      .from(tableName)
      .insert({ [`${entityType}_id`]: entityId, tag_id: tag.id });

    if (!error) {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleRemoveTag = async (tag: TagType) => {
    const tableName = entityType === 'contact' ? 'contact_tags' : 'deal_tags';
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq(`${entityType}_id`, entityId)
      .eq('tag_id', tag.id);

    if (!error) {
      onTagsChange(selectedTags.filter(t => t.id !== tag.id));
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    const { data, error } = await supabase
      .from('tags')
      .insert({ name: newTagName.trim(), color: newTagColor })
      .select()
      .single();

    if (!error && data) {
      setAllTags([...allTags, data]);
      await handleAddTag(data);
      setNewTagName('');
      setIsOpen(false);
    }
  };

  const availableTags = allTags.filter(t => !selectedTags.find(st => st.id === t.id));
  const presetColors = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#10B981', '#EC4899', '#6366F1'];

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map(tag => (
          <TagBadge key={tag.id} tag={tag} onRemove={() => handleRemoveTag(tag)} />
        ))}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Tag
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="space-y-4">
            {/* Existing Tags */}
            {availableTags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Tag
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleAddTag(tag)}
                      className="px-2.5 py-1 text-sm rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      style={{ borderColor: tag.color }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Create New Tag */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Create New Tag
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Color:</span>
                  <div className="flex gap-1">
                    {presetColors.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          newTagColor === color ? 'border-gray-900 dark:border-white scale-110' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                </div>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  Create & Add Tag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

