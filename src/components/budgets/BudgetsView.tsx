import React, { useState, useMemo } from 'react';
import { PieChart, Plus, AlertTriangle, CheckCircle, Trash2, X } from 'lucide-react';
import { Budget, Transaction } from '../../types';
import { DEFAULT_CATEGORIES, formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface BudgetsViewProps {
  budgets: Budget[];
  transactions: Transaction[];
  onCreateBudget: (data: Omit<Budget, 'id'>) => Promise<void>;
  onDeleteBudget: (budgetId: string) => Promise<void>;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({
  budgets,
  transactions,
  onCreateBudget,
  onDeleteBudget,
}) => {
  const { userProfile, user } = useAuth();
  const currency = userProfile?.preferredCurrency || 'INR';

  const [showAddModal, setShowAddModal] = useState(false);
  const [category, setCategory] = useState('Food & Dining');
  const [amount, setAmount] = useState('');
  const [threshold, setThreshold] = useState('80');
  const [submitting, setSubmitting] = useState(false);

  // Calculate actual spending per category for current month
  const categorySpending = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    const spendingMap: Record<string, number> = {};

    transactions
      .filter((t) => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getFullYear() === curYear && d.getMonth() === curMonth;
      })
      .forEach((t) => {
        spendingMap[t.category] = (spendingMap[t.category] || 0) + t.amount;
      });

    return spendingMap;
  }, [transactions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(amount);
    if (isNaN(numAmt) || numAmt <= 0) return;

    setSubmitting(true);
    try {
      await onCreateBudget({
        userId: user?.uid || '',
        category,
        period: 'monthly',
        amount: numAmt,
        warningThreshold: parseInt(threshold, 10) || 80,
        createdAt: new Date().toISOString(),
      });
      setShowAddModal(false);
      setAmount('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Category Budgets
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Set monthly spending limits and get automated threshold alerts.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create Budget Limit
        </button>
      </div>

      {/* Budget Gauges Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {budgets.map((b) => {
          const spent = categorySpending[b.category] || 0;
          const pct = Math.min(100, Math.round((spent / b.amount) * 100));
          const isWarning = pct >= b.warningThreshold && pct < 100;
          const isExceeded = pct >= 100;

          return (
            <div
              key={b.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
                    <PieChart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">{b.category}</h3>
                    <span className="text-[10px] text-slate-400">Monthly Budget</span>
                  </div>
                </div>

                <button
                  onClick={() => onDeleteBudget(b.id)}
                  className="rounded-lg p-1 text-slate-400 hover:text-rose-600"
                  title="Delete budget"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1 font-bold">
                  <span className="text-slate-500">
                    Spent: {formatCurrency(spent, currency)}
                  </span>
                  <span className="text-slate-900 dark:text-white">
                    Limit: {formatCurrency(b.amount, currency)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isExceeded ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{pct}% Used</span>
                  {isExceeded ? (
                    <span className="flex items-center gap-1 font-bold text-rose-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> Budget Exceeded!
                    </span>
                  ) : isWarning ? (
                    <span className="flex items-center gap-1 font-bold text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> Approaching Limit
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="h-3.5 w-3.5" /> Within Budget
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {budgets.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <PieChart className="mx-auto h-8 w-8 text-slate-400 mb-2 stroke-1" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              No category budgets set yet.
            </p>
            <p className="text-[11px] text-slate-500 mb-3">
              Set spending budgets for Food, Shopping, or Travel to prevent overspending.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Create First Budget
            </button>
          </div>
        )}
      </div>

      {/* Add Budget Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Monthly Budget</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
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

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Limit ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 15000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Warning Alert Threshold (%)
                </label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="80"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
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
                  {submitting ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
