'use client';

import { useState, useEffect } from 'react';
import { Mail, ChevronDown, X } from 'lucide-react';
import { EmailTemplate } from '@/lib/supabase';
import { replaceTemplateVariables, buildTemplateVariables } from '@/lib/email-template-utils';
import { Contact, Deal } from '@/lib/supabase';

interface EmailTemplateSelectorProps {
  contact?: Contact;
  deal?: Deal;
  onSelect?: (template: EmailTemplate, filledSubject: string, filledBody: string) => void;
  onClose?: () => void;
}

export default function EmailTemplateSelector({
  contact,
  deal,
  onSelect,
  onClose,
}: EmailTemplateSelectorProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/email-templates');
      const result = await res.json();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter((t) => t.category === selectedCategory);

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  const handleSelect = (template: EmailTemplate) => {
    const variables = buildTemplateVariables(contact, deal);
    const filledSubject = replaceTemplateVariables(template.subject, variables);
    const filledBody = replaceTemplateVariables(template.body, variables);
    
    if (onSelect) {
      onSelect(template, filledSubject, filledBody);
    }
  };

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading templates...</div>
      </div>
    );
  }

  if (previewTemplate) {
    const variables = buildTemplateVariables(contact, deal);
    const previewSubject = replaceTemplateVariables(previewTemplate.subject, variables);
    const previewBody = replaceTemplateVariables(previewTemplate.body, variables);

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Preview: {previewTemplate.name}
          </h3>
          <button
            onClick={() => setPreviewTemplate(null)}
            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject:
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
              {previewSubject}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Body:
            </label>
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white whitespace-pre-wrap min-h-[200px]">
              {previewBody}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => setPreviewTemplate(null)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => handleSelect(previewTemplate)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Use This Template
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Select Email Template
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {categories.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
            </button>
          ))}
        </div>
      )}

      <div className="max-h-[400px] overflow-y-auto space-y-2">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No templates found
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {template.name}
                    </h4>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {template.subject}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2">
                    {template.body}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => handlePreview(template)}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Preview
                </button>
                <button
                  onClick={() => handleSelect(template)}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Use Template
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

