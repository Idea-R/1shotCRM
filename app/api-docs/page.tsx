'use client';

import { useState } from 'react';
import { Book, Code, Key, AlertCircle } from 'lucide-react';

interface APIEndpoint {
  path: string;
  method: string;
  description: string;
  authRequired: boolean;
  params?: Array<{ name: string; type: string; required: boolean; description: string }>;
  body?: Record<string, any>;
  response?: Record<string, any>;
}

const endpoints: APIEndpoint[] = [
  {
    path: '/api/contacts',
    method: 'GET',
    description: 'List all contacts',
    authRequired: true,
    params: [
      { name: 'organization_id', type: 'string', required: false, description: 'Filter by organization' },
      { name: 'search', type: 'string', required: false, description: 'Search contacts by name or email' },
    ],
    response: { success: true, data: [{ id: '...', name: '...', email: '...' }] },
  },
  {
    path: '/api/contacts',
    method: 'POST',
    description: 'Create a new contact',
    authRequired: true,
    body: { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
    response: { success: true, data: { id: '...', ... } },
  },
  {
    path: '/api/deals',
    method: 'GET',
    description: 'List all deals',
    authRequired: true,
    params: [
      { name: 'stage_id', type: 'string', required: false, description: 'Filter by pipeline stage' },
      { name: 'contact_id', type: 'string', required: false, description: 'Filter by contact' },
    ],
    response: { success: true, data: [{ id: '...', title: '...', value: 1000 }] },
  },
  {
    path: '/api/service-sheets',
    method: 'GET',
    description: 'List service sheets',
    authRequired: true,
    params: [
      { name: 'service_id', type: 'string', required: false, description: 'Filter by service ID' },
      { name: 'appliance_id', type: 'string', required: false, description: 'Filter by appliance ID' },
      { name: 'tags', type: 'string', required: false, description: 'Comma-separated tags' },
    ],
    response: { success: true, data: [{ id: '...', file_name: '...', url: '...' }] },
  },
  {
    path: '/api/webhooks',
    method: 'POST',
    description: 'Create a webhook subscription',
    authRequired: true,
    body: {
      url: 'https://example.com/webhook',
      events: ['service_created', 'contact_created'],
      organization_id: 'optional-org-id',
    },
    response: { success: true, data: { id: '...', secret: '...' } },
  },
  {
    path: '/api/automations',
    method: 'POST',
    description: 'Create an automation',
    authRequired: true,
    body: {
      name: 'Auto-assign service',
      trigger_type: 'service_created',
      trigger_config: {},
      actions: [
        { type: 'send_email', config: { to: '{{contact.email}}', subject: 'Service Created', body: '...' } },
      ],
    },
    response: { success: true, data: { id: '...' } },
  },
];

export default function APIDocsPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <Book className="w-8 h-8" />
          API Documentation
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Complete API reference for integrating with 1shotCRM
        </p>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-200 mb-1">Authentication</h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              All API requests require authentication. Include your access token in the Authorization header:
            </p>
            <code className="block mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded text-sm">
              Authorization: Bearer YOUR_ACCESS_TOKEN
            </code>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Endpoints List */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Endpoints</h2>
          <div className="space-y-2">
            {endpoints.map((endpoint, index) => (
              <button
                key={`${endpoint.path}-${endpoint.method}-${index}`}
                onClick={() => setSelectedEndpoint(endpoint)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedEndpoint === endpoint
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    endpoint.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {endpoint.method}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{endpoint.path}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">{endpoint.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Endpoint Details */}
        <div className="lg:col-span-2">
          {selectedEndpoint ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      selectedEndpoint.method === 'GET' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      selectedEndpoint.method === 'POST' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      selectedEndpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {selectedEndpoint.method}
                    </span>
                    <code className="text-lg font-mono text-gray-900 dark:text-white">{selectedEndpoint.path}</code>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">{selectedEndpoint.description}</p>
                </div>
              </div>

              {selectedEndpoint.authRequired && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-200">
                    <Key className="w-4 h-4" />
                    <span>Authentication required</span>
                  </div>
                </div>
              )}

              {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Query Parameters</h3>
                  <div className="space-y-2">
                    {selectedEndpoint.params.map((param) => (
                      <div key={param.name} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-gray-900 dark:text-white">{param.name}</code>
                            <span className="text-xs text-gray-500 dark:text-gray-400">({param.type})</span>
                            {param.required && (
                              <span className="text-xs text-red-600 dark:text-red-400">Required</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{param.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEndpoint.body && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Request Body</h3>
                  <div className="relative">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedEndpoint.body, null, 2), 'body')}
                      className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      {copied === 'body' ? 'Copied!' : 'Copy'}
                    </button>
                    <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
                      {JSON.stringify(selectedEndpoint.body, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {selectedEndpoint.response && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Response</h3>
                  <div className="relative">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedEndpoint.response, null, 2), 'response')}
                      className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      {copied === 'response' ? 'Copied!' : 'Copy'}
                    </button>
                    <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
                      {JSON.stringify(selectedEndpoint.response, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-12 text-center">
              <Code className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Select an endpoint to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

