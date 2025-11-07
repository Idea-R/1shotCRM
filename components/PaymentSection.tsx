'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Plus, FileText, CheckCircle, XCircle, Clock, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { loadStripe } from '@stripe/stripe-js';

interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date?: string;
  deal?: { title: string };
  contact?: { name: string };
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_date: string;
  payment_method?: string;
  transaction_id?: string;
}

interface PaymentSectionProps {
  dealId?: string;
  contactId?: string;
}

export default function PaymentSection({ dealId, contactId }: PaymentSectionProps) {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceFormData, setInvoiceFormData] = useState({
    amount: '',
    dueDate: '',
    notes: '',
  });

  useEffect(() => {
    loadInvoices();
    loadPayments();
  }, [dealId, contactId]);

  const loadInvoices = async () => {
    try {
      let url = '/api/invoices?';
      if (dealId) url += `deal_id=${dealId}&`;
      if (contactId) url += `contact_id=${contactId}&`;

      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setInvoices(result.data);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      let url = '/api/payments?';
      if (dealId) url += `deal_id=${dealId}&`;
      if (contactId) url += `contact_id=${contactId}&`;

      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setPayments(result.data);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please sign in to create invoices');
        return;
      }

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          dealId,
          contactId,
          amount: parseFloat(invoiceFormData.amount),
          dueDate: invoiceFormData.dueDate || null,
          notes: invoiceFormData.notes || null,
        }),
      });

      const result = await res.json();

      if (result.success) {
        setInvoiceFormData({ amount: '', dueDate: '', notes: '' });
        setShowInvoiceForm(false);
        loadInvoices();
      } else {
        alert(result.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/invoices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: invoiceId,
          status: 'sent',
        }),
      });

      const result = await res.json();

      if (result.success) {
        loadInvoices();
      } else {
        alert(result.error || 'Failed to update invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Network error. Please try again.');
    }
  };

  const handleCreatePaymentLink = async (invoice: Invoice) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Please sign in to create payment links');
        return;
      }

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          dealId,
          contactId,
          amount: invoice.amount,
          type: 'checkout',
        }),
      });

      const result = await res.json();

      if (result.success && result.checkoutUrl) {
        window.open(result.checkoutUrl, '_blank');
      } else {
        alert(result.error || 'Failed to create payment link');
      }
    } catch (error) {
      console.error('Error creating payment link:', error);
      alert('Network error. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300';
      case 'sent':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300';
      case 'overdue':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300';
      case 'draft':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'sent':
        return <Send className="w-4 h-4" />;
      case 'overdue':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center py-4 text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Invoices & Payments</h3>
          </div>
          {!showInvoiceForm && (
            <button
              onClick={() => setShowInvoiceForm(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              New Invoice
            </button>
          )}
        </div>
      </div>

      {showInvoiceForm && (
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={invoiceFormData.amount}
                onChange={(e) => setInvoiceFormData({ ...invoiceFormData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={invoiceFormData.dueDate}
                onChange={(e) => setInvoiceFormData({ ...invoiceFormData, dueDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={invoiceFormData.notes}
                onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowInvoiceForm(false);
                  setInvoiceFormData({ amount: '', dueDate: '', notes: '' });
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Invoice
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No invoices yet</p>
          </div>
        ) : (
          invoices.map((invoice) => (
            <div key={invoice.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {invoice.invoice_number}
                    </h4>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      {invoice.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Amount: <span className="font-semibold">${invoice.amount.toFixed(2)}</span>
                  </p>
                  {invoice.due_date && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Due: {new Date(invoice.due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {invoice.status === 'draft' && (
                    <button
                      onClick={() => handleSendInvoice(invoice.id)}
                      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Send
                    </button>
                  )}
                  {invoice.status === 'sent' && (
                    <button
                      onClick={() => handleCreatePaymentLink(invoice)}
                      className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Get Payment Link
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {payments.length > 0 && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Payment History</h4>
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    ${payment.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(payment.payment_date).toLocaleDateString()}
                    {payment.payment_method && ` • ${payment.payment_method}`}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded ${
                  payment.status === 'completed'
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}>
                  {payment.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

