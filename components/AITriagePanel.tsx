'use client';

import { useState, useEffect } from 'react';
import { Sparkles, AlertCircle, CheckCircle, FileText, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TriageResult } from '@/lib/ai-triage';

interface AITriagePanelProps {
  serviceId: string;
  serviceData: {
    title: string;
    description?: string;
    contactName?: string;
    applianceType?: string;
    applianceBrand?: string;
    applianceModel?: string;
  };
}

export default function AITriagePanel({ serviceId, serviceData }: AITriagePanelProps) {
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadTriageResult();
  }, [serviceId]);

  const loadTriageResult = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch(`/api/ai-triage?service_id=${serviceId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const result = await res.json();
      if (result.success && result.data) {
        setTriageResult(result.data);
      }
    } catch (error) {
      console.error('Error loading triage result:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/ai-triage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          service_id: serviceId,
          service_data: serviceData,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setTriageResult(result.data);
      } else {
        alert(result.error || 'Failed to analyze service request');
      }
    } catch (error) {
      console.error('Error analyzing service request:', error);
      alert('Network error. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'high':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      default:
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-4 text-gray-600 dark:text-gray-400">Loading triage results...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Triage Analysis</h3>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Request
              </>
            )}
          </button>
        </div>
      </div>

      {triageResult ? (
        <div className="p-6 space-y-6">
          {/* Extracted Information */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Extracted Information</h4>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
              {triageResult.extractedInfo.applianceType && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Appliance Type:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {triageResult.extractedInfo.applianceType}
                  </span>
                </div>
              )}
              {triageResult.extractedInfo.applianceBrand && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Brand:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {triageResult.extractedInfo.applianceBrand}
                  </span>
                </div>
              )}
              {triageResult.extractedInfo.applianceModel && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Model:</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {triageResult.extractedInfo.applianceModel}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Issue:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {triageResult.extractedInfo.issueDescription}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Urgency:</span>
                <span className={`text-sm font-medium px-2 py-1 rounded ${getUrgencyColor(triageResult.extractedInfo.urgency)}`}>
                  {triageResult.extractedInfo.urgency.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Missing Fields */}
          {triageResult.missingFields.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                Missing Information
              </h4>
              <div className="space-y-2">
                {triageResult.missingFields.map((field, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {field.field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {field.required && (
                          <span className="ml-2 text-xs text-red-600 dark:text-red-400">Required</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{field.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Matched Service Sheets */}
          {triageResult.matchedServiceSheets.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Related Service Sheets ({triageResult.matchedServiceSheets.length})
              </h4>
              <div className="space-y-2">
                {triageResult.matchedServiceSheets.map((sheet) => (
                  <a
                    key={sheet.id}
                    href={sheet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="text-sm text-gray-900 dark:text-white truncate">{sheet.file_name}</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      {Math.round(sheet.relevance_score * 100)}% match
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {triageResult.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                Recommendations
              </h4>
              <ul className="space-y-2">
                {triageResult.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-900 dark:text-white">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center">
          <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">No triage analysis yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Click "Analyze Request" to get AI-powered insights about this service request
          </p>
        </div>
      )}
    </div>
  );
}

