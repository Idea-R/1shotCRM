'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, X, Download, Image as ImageIcon, Search, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Attachment } from '@/lib/supabase';

interface PartsDiagramsSectionProps {
  applianceTypeId?: string;
}

export default function PartsDiagramsSection({ applianceTypeId }: PartsDiagramsSectionProps) {
  const [diagrams, setDiagrams] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTags, setSearchTags] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDiagrams();
  }, [applianceTypeId]);

  const loadDiagrams = async () => {
    try {
      const params = new URLSearchParams();
      if (applianceTypeId) params.append('appliance_type_id', applianceTypeId);
      if (searchTags) params.append('tags', searchTags);

      const res = await fetch(`/api/parts-diagrams?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        // Get public URLs for each diagram
        const diagramsWithUrls = await Promise.all(
          result.data.map(async (diagram: Attachment) => {
            const { data } = supabase.storage.from('parts-diagrams').getPublicUrl(diagram.file_path);
            return { ...diagram, url: data.publicUrl };
          })
        );
        setDiagrams(diagramsWithUrls);
      }
    } catch (error) {
      console.error('Error loading parts diagrams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    if (!applianceTypeId) {
      alert('Appliance type ID is required');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('appliance_type_id', applianceTypeId);
      formData.append('title', file.name);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/parts-diagrams', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        loadDiagrams();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        alert(result.error || 'Failed to upload parts diagram');
      }
    } catch (error) {
      console.error('Error uploading parts diagram:', error);
      alert('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this parts diagram?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/parts-diagrams?id=${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const result = await res.json();

      if (result.success) {
        loadDiagrams();
      } else {
        alert(result.error || 'Failed to delete parts diagram');
      }
    } catch (error) {
      console.error('Error deleting parts diagram:', error);
      alert('Network error. Please try again.');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-4 text-gray-600 dark:text-gray-400">Loading parts diagrams...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Parts Diagrams</h3>
          {applianceTypeId && (
            <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Diagram'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by tags..."
              value={searchTags}
              onChange={(e) => {
                setSearchTags(e.target.value);
                setTimeout(() => loadDiagrams(), 500);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        {diagrams.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No parts diagrams yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Upload parts diagrams for this appliance type
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {diagrams.map((diagram) => (
              <div
                key={diagram.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                {diagram.url && diagram.mime_type?.startsWith('image/') ? (
                  <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
                    <img
                      src={diagram.url}
                      alt={diagram.file_name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-2">
                      <a
                        href={diagram.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white/90 dark:bg-gray-800/90 rounded hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      </a>
                      <button
                        onClick={() => handleDelete(diagram.id)}
                        className="p-2 bg-white/90 dark:bg-gray-800/90 rounded hover:bg-white dark:hover:bg-gray-800 transition-colors"
                        title="Delete"
                      >
                        <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {diagram.file_name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatFileSize(diagram.file_size)}
                    </p>
                    {diagram.tags && diagram.tags.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {diagram.tags.slice(0, 2).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

