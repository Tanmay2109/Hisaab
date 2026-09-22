import React, { useState } from 'react';
import { FileText, Plus, CheckCircle, Trash2, X } from 'lucide-react';
import { Bill } from '../../types';
import { DEFAULT_CATEGORIES, formatCurrency, formatDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface BillsViewProps {
  bills: Bill[];
  onCreateBill: (data: Omit<Bill, 'id'>) => Promise<void>;
  onMarkPaid: (billId: string) => Promise<void>;
  onDeleteBill: (billId: string) => Promise<void>;
}

export const BillsView: React.FC<BillsViewProps> = ({
  bills,
  onCreateBill,
  onMarkPaid,
  onDeleteBill,
}) => {
  const { userProfile, user } = useAuth();
  const currency = userProfile?.preferredCurrency || 'INR';

  const [showAddModal, setShowAddModal] = useState(false);
  const [billName, setBillName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [recurrence, setRecurrence] = useState<'monthly' | 'quarterly' | 'yearly' | 'one-time'>('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!billName.trim() || isNaN(numAmt) || numAmt <= 0) return;

    setSubmitting(true);
    try {
      await onCreateBill({
        userId: user?.uid || '',
        name: billName.trim(),
        amount: numAmt,
        currency,
        dueDate: dueDate || new Date().toISOString().split('T')[0],
        category,
        recurrence,
        status: 'upcoming',
        createdAt: new Date().toISOString(),
      });
      setShowAddModal(false);
      setBillName('');
      setAmount('');
      setDueDate('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayClick = async (billId: string) => {
    setPayingId(billId);
    try {
      await onMarkPaid(billId);
    } finally {
      setPayingId(null);
    }
  };

  const handleDeleteClick = async (billId: string) => {
    setDeletingId(billId);
    try {
      await onDeleteBill(billId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Bill Reminders
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Never miss electricity, Wi-Fi, rent, or water payments.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Bill
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bills.map((b) => (
          <div
            key={b.id}
            className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{b.name}</h3>
                  <p className="text-[10px] text-slate-400">{b.category} • {b.recurrence}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {b.status !== 'paid' ? (
                  <button
                    onClick={() => handlePayClick(b.id)}
                    disabled={payingId === b.id}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-700 transition active:scale-95 disabled:opacity-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    {payingId === b.id ? 'Saving...' : 'Mark Paid'}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <CheckCircle className="h-3.5 w-3.5" /> Paid
                  </span>
                )}

                <button
                  onClick={() => handleDeleteClick(b.id)}
                  disabled={deletingId === b.id}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                  title="Delete bill"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Due Date</span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatDate(b.dueDate)}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Amount</span>
                <p className="text-lg font-black text-slate-900 dark:text-white">
                  {formatCurrency(b.amount, currency)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {bills.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <FileText className="mx-auto h-8 w-8 text-slate-400 mb-2 stroke-1" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              No bill reminders set.
            </p>
            <p className="text-[11px] text-slate-500 mb-3">
              Add recurring utilities, Wi-Fi, or credit card bill due dates.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Add First Bill
            </button>
          </div>
        )}
      </div>

      {/* Add Bill Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">New Bill Reminder</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bill Name</label>
                <input
                  type="text"
                  required
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                  placeholder="e.g. Electricity Bill"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Amount ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 2450"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  {submitting ? 'Creating...' : 'Save Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
