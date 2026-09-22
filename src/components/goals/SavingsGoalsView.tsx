import React, { useState } from 'react';
import { Target, Plus, PiggyBank, Calendar, X, ArrowUpRight, Trash2 } from 'lucide-react';
import { SavingsGoal } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface SavingsGoalsViewProps {
  goals: SavingsGoal[];
  onCreateGoal: (data: Omit<SavingsGoal, 'id'>) => Promise<void>;
  onAddContribution: (goalId: string, amount: number) => Promise<void>;
  onDeleteGoal: (goalId: string) => Promise<void>;
}

export const SavingsGoalsView: React.FC<SavingsGoalsViewProps> = ({
  goals,
  onCreateGoal,
  onAddContribution,
  onDeleteGoal,
}) => {
  const { userProfile, user } = useAuth();
  const currency = userProfile?.preferredCurrency || 'INR';

  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [showContribModal, setShowContribModal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // New Goal Form
  const [goalName, setGoalName] = useState('');
  const [targetAmt, setTargetAmt] = useState('');
  const [currentAmt, setCurrentAmt] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [contribAmt, setContribAmt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Contribution Form
  const [addedAmount, setAddedAmount] = useState('');

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const tAmt = parseFloat(targetAmt);
    if (!goalName.trim() || isNaN(tAmt) || tAmt <= 0) return;

    setSubmitting(true);
    try {
      await onCreateGoal({
        userId: user?.uid || '',
        name: goalName.trim(),
        targetAmount: tAmt,
        currentAmount: parseFloat(currentAmt) || 0,
        targetDate: targetDate || new Date().toISOString().split('T')[0],
        contributionAmount: parseFloat(contribAmt) || 0,
        contributionFrequency: 'monthly',
        createdAt: new Date().toISOString(),
      });
      setShowAddGoalModal(false);
      setGoalName('');
      setTargetAmt('');
      setCurrentAmt('0');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddContributionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const addAmt = parseFloat(addedAmount);
    if (!selectedGoalId || isNaN(addAmt) || addAmt <= 0) return;

    setSubmitting(true);
    try {
      await onAddContribution(selectedGoalId, addAmt);
      setShowContribModal(false);
      setAddedAmount('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    setDeletingId(goalId);
    try {
      await onDeleteGoal(goalId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Savings Goals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track progress towards your long-term financial milestones.
          </p>
        </div>

        <button
          onClick={() => setShowAddGoalModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Create Goal
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {goals.map((g) => {
          const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));
          return (
            <div
              key={g.id}
              className="group relative rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-2.5 dark:bg-emerald-950/60 text-emerald-600">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{g.name}</h3>
                    <p className="text-[10px] text-slate-400">Target: {formatDate(g.targetDate)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSelectedGoalId(g.id);
                      setShowContribModal(true);
                    }}
                    className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 transition"
                  >
                    + Add Funds
                  </button>
                  <button
                    onClick={() => handleDeleteGoal(g.id)}
                    disabled={deletingId === g.id}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                    title="Delete goal"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-slate-500">Saved: {formatCurrency(g.currentAmount, currency)}</span>
                  <span className="text-slate-900 dark:text-white">{formatCurrency(g.targetAmount, currency)}</span>
                </div>

                <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>

                <p className="mt-2 text-right text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {pct}% Achieved
                </p>
              </div>
            </div>
          );
        })}

        {goals.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
            <PiggyBank className="mx-auto h-8 w-8 text-slate-400 mb-2 stroke-1" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              No savings goals created yet.
            </p>
            <p className="text-[11px] text-slate-500 mb-3">
              Set goals for Emergency Fund, Vacation, or New Car.
            </p>
            <button
              onClick={() => setShowAddGoalModal(true)}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              Set First Savings Goal
            </button>
          </div>
        )}
      </div>

      {/* Add Goal Modal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">New Savings Goal</h3>
              <button onClick={() => setShowAddGoalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Goal Name</label>
                <input
                  type="text"
                  required
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="e.g. Emergency Fund"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Amount ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={targetAmt}
                  onChange={(e) => setTargetAmt(e.target.value)}
                  placeholder="e.g. 100000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  required
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  {submitting ? 'Creating...' : 'Create Goal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contribution Modal */}
      {showContribModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add Goal Contribution</h3>
              <button onClick={() => setShowContribModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddContributionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Added Amount ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={addedAmount}
                  onChange={(e) => setAddedAmount(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContribModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  {submitting ? 'Saving...' : 'Add Funds'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
