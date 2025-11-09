'use client';

import { useState, useEffect, useRef } from 'react';
import { Upload, File, X, Download, FileText, Search, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Attachment } from '@/lib/supabase';

interface ServiceSheetsSectionProps {
  serviceId?: string;
  applianceId?: string;
}

export default function ServiceSheetsSection({ serviceId, applianceId }: ServiceSheetsSectionProps) {
  const [sheets, setSheets] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTags, setSearchTags] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSheets();
  }, [serviceId, applianceId]);

  const loadSheets = async () => {
    try {
      const params = new URLSearchParams();
      if (serviceId) params.append('service_id', serviceId);
      if (applianceId) params.append('appliance_id', applianceId);
      if (searchTags) params.append('tags', searchTags);

      const res = await fetch(`/api/service-sheets?${params.toString()}`);
      const result = await res.json();
      if (result.success) {
        // Get public URLs for each sheet
        const sheetsWithUrls = await Promise.all(
          result.data.map(async (sheet: Attachment) => {
            const { data } = supabase.storage.from('service-sheets').getPublicUrl(sheet.file_path);
            return { ...sheet, url: data.publicUrl };
          })
        );
        setSheets(sheetsWithUrls);
      }
    } catch (error) {
      console.error('Error loading service sheets:', error);
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

    if (!serviceId) {
      alert('Service ID is required');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('service_id', serviceId);
      if (applianceId) formData.append('appliance_id', applianceId);
      formData.append('title', file.name);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/service-sheets', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        loadSheets();
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        alert(result.error || 'Failed to upload service sheet');
      }
    } catch (error) {
      console.error('Error uploading service sheet:', error);
      alert('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service sheet?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/service-sheets?id=${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const result = await res.json();

      if (result.success) {
        loadSheets();
      } else {
        alert(result.error || 'Failed to delete service sheet');
      }
    } catch (error) {
      console.error('Error deleting service sheet:', error);
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
        <div className="text-center py-4 text-gray-600 dark:text-gray-400">Loading service sheets...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Service Sheets</h3>
          {serviceId && (
            <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Sheet'}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
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
                // Debounce search
                setTimeout(() => loadSheets(), 500);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      <div className="p-6">
        {sheets.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No service sheets yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Upload service sheets to track service documentation
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sheets.map((sheet) => (
              <div
                key={sheet.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0 text-gray-600 dark:text-gray-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {sheet.file_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(sheet.file_size)} • {new Date(sheet.created_at).toLocaleDateString()}
                      </p>
                      {sheet.tags && sheet.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {sheet.tags.slice(0, 3).join(', ')}
                            {sheet.tags.length > 3 && ` +${sheet.tags.length - 3}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {sheet.url && (
                    <a
                      href={sheet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(sheet.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

