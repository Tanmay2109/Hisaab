import React, { useState } from 'react';
import { Repeat, Plus, Calendar, AlertCircle, Trash2, X } from 'lucide-react';
import { Subscription } from '../../types';
import { DEFAULT_CATEGORIES, formatCurrency, formatDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  onCreateSubscription: (data: Omit<Subscription, 'id'>) => Promise<void>;
  onDeleteSubscription: (subId: string) => Promise<void>;
}

export const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({
  subscriptions,
  onCreateSubscription,
  onDeleteSubscription,
}) => {
  const { userProfile, user } = useAuth();
  const currency = userProfile?.preferredCurrency || 'INR';

  const [showAddModal, setShowAddModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly' | 'quarterly'>('monthly');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [category, setCategory] = useState('Subscriptions');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (!serviceName.trim() || isNaN(numAmt) || numAmt <= 0) return;

    setSubmitting(true);
    try {
      await onCreateSubscription({
        userId: user?.uid || '',
        serviceName: serviceName.trim(),
        amount: numAmt,
        currency,
        billingCycle,
        nextPaymentDate: nextPaymentDate || new Date().toISOString().split('T')[0],
        category,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
      setShowAddModal(false);
      setServiceName('');
      setAmount('');
      setNextPaymentDate('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (subId: string) => {
    setDeletingId(subId);
    try {
      await onDeleteSubscription(subId);
    } finally {
      setDeletingId(null);
    }
  };

  const totalMonthlySpend = subscriptions.reduce((acc, s) => {
    if (s.billingCycle === 'monthly') return acc + s.amount;
    if (s.billingCycle === 'yearly') return acc + s.amount / 12;
    if (s.billingCycle === 'quarterly') return acc + s.amount / 3;
    return acc;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#33332d] dark:text-[#e5e5dc] tracking-tight">
            Subscriptions Tracker
          </h1>
          <p className="text-xs text-[#66665c] dark:text-[#a3a395]">
            Manage recurring services, Netflix, Spotify, cloud tools & monthly memberships.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5A5A40] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#484832] shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Add Subscription
        </button>
      </div>

      <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#66665c] dark:text-[#a3a395]">
            Estimated Monthly Recurring Expense
          </span>
          <Repeat className="h-5 w-5 text-[#5A5A40]" />
        </div>
        <h2 className="mt-2 text-3xl font-extrabold text-[#33332d] dark:text-[#e5e5dc]">
          {formatCurrency(totalMonthlySpend, currency)}
        </h2>
        <p className="mt-1 text-xs text-[#66665c] dark:text-[#a3a395]">
          Across {subscriptions.length} active subscription(s)
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {subscriptions.map((s) => (
          <div
            key={s.id}
            className="group relative rounded-2xl border border-[#e2e2d8] bg-white p-5 shadow-2xs dark:border-[#33332c] dark:bg-[#242420] transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  {s.serviceName}
                </h3>
                <span className="inline-block mt-1 rounded-md bg-[#f0f1e8] px-2 py-0.5 text-[10px] font-bold text-[#5A5A40] dark:bg-[#2b2b22] dark:text-[#a1a17a]">
                  {s.category}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-[#f0f4f1] px-2.5 py-1 text-[10px] font-bold text-[#526352] dark:bg-[#222d23] dark:text-[#6b826b] capitalize">
                  {s.billingCycle}
                </span>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="rounded-xl p-1.5 text-[#8c8c7e] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                  title="Delete subscription"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-[#ecece2] pt-3 dark:border-[#2d2d27]">
              <div>
                <p className="text-[10px] font-medium text-[#66665c] dark:text-[#a3a395]">
                  Next Billing
                </p>
                <p className="text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  {formatDate(s.nextPaymentDate)}
                </p>
              </div>
              <p className="text-lg font-extrabold text-[#33332d] dark:text-[#e5e5dc]">
                {formatCurrency(s.amount, currency)}
              </p>
            </div>
          </div>
        ))}

        {subscriptions.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-[#e2e2d8] p-8 text-center dark:border-[#33332c]">
            <Repeat className="mx-auto h-8 w-8 text-[#8c8c7e] mb-2" />
            <p className="text-xs text-[#66665c] dark:text-[#a3a395]">
              No subscriptions tracked yet.
            </p>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#33332d]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#e2e2d8] bg-white p-6 shadow-2xl dark:border-[#33332c] dark:bg-[#242420]">
            <div className="flex items-center justify-between border-b border-[#ecece2] pb-4 dark:border-[#2d2d27]">
              <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">
                Add Subscription
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="rounded-lg p-1 text-[#66665c] hover:bg-[#e6e6dc] dark:hover:bg-[#2a2a25]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Netflix, Spotify, OpenAI"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                    Amount ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 649"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                    Billing Cycle
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                    Next Payment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={nextPaymentDate}
                    onChange={(e) => setNextPaymentDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                  >
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-[#e2e2d8] px-4 py-2 text-xs font-bold text-[#66665c] hover:bg-[#e6e6dc] dark:border-[#33332c] dark:text-[#a3a395]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#484832]"
                >
                  {submitting ? 'Saving...' : 'Add Subscription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
