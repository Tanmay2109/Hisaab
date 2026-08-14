import React, { useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  CreditCard,
  Receipt,
  Users,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Account, Bill, Budget, Group, Subscription, Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface DashboardViewProps {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  bills: Bill[];
  subscriptions: Subscription[];
  groups: Group[];
  onOpenAddTransaction: () => void;
  onOpenAIModal: () => void;
  setActiveTab: (tab: string) => void;
}

const COLORS = ['#5A5A40', '#c86d51', '#526352', '#8a7051', '#d99b26', '#737365', '#33332d', '#8c8c68'];

export const DashboardView: React.FC<DashboardViewProps> = ({
  accounts,
  transactions,
  budgets,
  bills,
  subscriptions,
  groups,
  onOpenAddTransaction,
  onOpenAIModal,
  setActiveTab,
}) => {
  const { userProfile } = useAuth();
  const currency = userProfile?.preferredCurrency || 'INR';

  // Calculate totals
  const totalBalance = useMemo(() => {
    return accounts.reduce((acc, a) => acc + (a.currentBalance || 0), 0);
  }, [accounts]);

  const currentMonthTransactions = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    return transactions.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === curYear && d.getMonth() === curMonth;
    });
  }, [transactions]);

  const monthlyIncome = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [currentMonthTransactions]);

  const monthlyExpense = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [currentMonthTransactions]);

  const netSavings = monthlyIncome - monthlyExpense;
  const savingsRate = monthlyIncome > 0 ? Math.max(0, Math.round((netSavings / monthlyIncome) * 100)) : 0;

  // Chart Data: Last 6 months spending vs income
  const monthlyComparisonData = useMemo(() => {
    const monthsMap: Record<string, { month: string; Income: number; Expense: number }> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear().toString().slice(-2)}`;
      monthsMap[key] = { month: key, Income: 0, Expense: 0 };
    }

    transactions.forEach((t) => {
      const d = new Date(t.date);
      const key = `${d.toLocaleString('default', { month: 'short' })} ${d.getFullYear().toString().slice(-2)}`;
      if (monthsMap[key]) {
        if (t.type === 'income') monthsMap[key].Income += t.amount;
        if (t.type === 'expense') monthsMap[key].Expense += t.amount;
      }
    });

    return Object.values(monthsMap);
  }, [transactions]);

  // Category Pie Data
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    currentMonthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        catMap[t.category] = (catMap[t.category] || 0) + t.amount;
      });

    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [currentMonthTransactions]);

  // Upcoming Bills & Subscriptions
  const upcomingBills = useMemo(() => {
    return bills.filter((b) => b.status !== 'paid').slice(0, 3);
  }, [bills]);

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#33332d] dark:text-[#e5e5dc] tracking-tight">
            Financial Overview
          </h1>
          <p className="text-xs text-[#66665c] dark:text-[#a3a395]">
            Welcome back, {userProfile?.fullName || 'User'}! Here is your real-time Hisaab dashboard.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddTransaction}
            className="inline-flex items-center gap-2 rounded-xl bg-[#33332d] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#242420] dark:bg-[#e5e5dc] dark:text-[#33332d] dark:hover:bg-white shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </button>
          <button
            onClick={onOpenAIModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5A5A40] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#484832] shadow-xs"
          >
            <Sparkles className="h-4 w-4 text-[#e6e6dc]" />
            Natural AI Entry
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Net Balance */}
        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 shadow-2xs dark:border-[#33332c] dark:bg-[#242420]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66665c] dark:text-[#a3a395]">
              Total Balance
            </span>
            <div className="rounded-xl bg-[#f0f1e8] p-2 text-[#5A5A40] dark:bg-[#2b2b22] dark:text-[#a1a17a]">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-[#33332d] dark:text-[#e5e5dc]">
              {formatCurrency(totalBalance, currency)}
            </h3>
            <p className="mt-1 text-[11px] font-medium text-[#66665c] dark:text-[#a3a395]">Across {accounts.length} linked account(s)</p>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 shadow-2xs dark:border-[#33332c] dark:bg-[#242420]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66665c] dark:text-[#a3a395]">
              Monthly Income
            </span>
            <div className="rounded-xl bg-[#f0f4f1] p-2 text-[#526352] dark:bg-[#222d23] dark:text-[#6b826b]">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-[#33332d] dark:text-[#e5e5dc]">
              {formatCurrency(monthlyIncome, currency)}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#526352] dark:text-[#6b826b]">
              <ArrowUpRight className="h-3.5 w-3.5" />
              This Month
            </p>
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 shadow-2xs dark:border-[#33332c] dark:bg-[#242420]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66665c] dark:text-[#a3a395]">
              Monthly Expenses
            </span>
            <div className="rounded-xl bg-[#fdf4f1] p-2 text-[#c86d51] dark:bg-[#33231e] dark:text-[#d98268]">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-[#33332d] dark:text-[#e5e5dc]">
              {formatCurrency(monthlyExpense, currency)}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-[#c86d51] dark:text-[#d98268]">
              <ArrowDownRight className="h-3.5 w-3.5" />
              {currentMonthTransactions.filter((t) => t.type === 'expense').length} expense item(s)
            </p>
          </div>
        </div>

        {/* Net Savings & Savings Rate */}
        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 shadow-2xs dark:border-[#33332c] dark:bg-[#242420]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66665c] dark:text-[#a3a395]">
              Net Savings
            </span>
            <div className="rounded-xl bg-[#fdf8eb] p-2 text-[#d99b26] dark:bg-[#332b1a] dark:text-[#d99b26]">
              <PiggyBank className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-[#33332d] dark:text-[#e5e5dc]">
              {formatCurrency(netSavings, currency)}
            </h3>
            <p className="mt-1 text-[11px] font-semibold text-[#8a7051] dark:text-[#d99b26]">
              {savingsRate}% Savings Rate
            </p>
          </div>
        </div>
      </div>

      {/* Alert Banners if Bills exceed warning threshold */}
      {upcomingBills.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-[#e5c2a1] bg-[#fdf8eb] p-4 dark:border-[#332b1a] dark:bg-[#282115]">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#d99b26]/20 p-2 text-[#8a7051] dark:text-[#d99b26]">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                You have {upcomingBills.length} upcoming bill(s) due soon!
              </p>
              <p className="text-[11px] text-[#66665c] dark:text-[#a3a395]">
                Next: {upcomingBills[0].name} ({formatCurrency(upcomingBills[0].amount, currency)}) due on {formatDate(upcomingBills[0].dueDate)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('bills')}
            className="rounded-xl bg-[#5A5A40] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#484832] transition shrink-0"
          >
            View Bills
          </button>
        </div>
      )}

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Income vs Expenses Chart */}
        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420] lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#33332d] dark:text-[#e5e5dc]">
                Income vs Spending Trend
              </h3>
              <p className="text-[11px] text-[#66665c] dark:text-[#a3a395]">6-Month historical comparison</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#66665c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#66665c' }} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} />
                <Bar dataKey="Income" fill="#526352" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#c86d51" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Category Breakdown */}
        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420]">
          <h3 className="text-sm font-bold text-[#33332d] dark:text-[#e5e5dc] mb-1">
            Category Breakdown
          </h3>
          <p className="text-[11px] text-[#66665c] dark:text-[#a3a395] mb-4">This month's expenses</p>

          {categoryData.length > 0 ? (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value), currency)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-2 justify-center max-h-16 overflow-y-auto">
                {categoryData.slice(0, 4).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-1.5 text-[10px] text-[#66665c] dark:text-[#a3a395]">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-center text-[#8c8c7e]">
              <Receipt className="h-8 w-8 mb-2 stroke-1 text-[#8c8c7e]" />
              <p className="text-xs">No expenses recorded this month yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions & Groups Widgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Transactions List */}
        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420] lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-[#33332d] dark:text-[#e5e5dc]">
              Recent Transactions
            </h3>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-xs font-bold text-[#5A5A40] hover:underline dark:text-[#a1a17a]"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-[#ecece2] dark:divide-[#2d2d27]">
            {transactions.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-xs ${
                      t.type === 'income'
                        ? 'bg-[#f0f4f1] text-[#526352] dark:bg-[#222d23] dark:text-[#6b826b]'
                        : 'bg-[#fdf4f1] text-[#c86d51] dark:bg-[#33231e] dark:text-[#d98268]'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                      {t.description || t.category}
                    </p>
                    <p className="text-[10px] text-[#66665c] dark:text-[#a3a395]">
                      {t.category} • {formatDate(t.date)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs font-extrabold ${
                      t.type === 'income' ? 'text-[#526352] dark:text-[#6b826b]' : 'text-[#33332d] dark:text-[#e5e5dc]'
                    }`}
                  >
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, currency)}
                  </p>
                  <p className="text-[10px] text-[#8c8c7e] uppercase">{t.type}</p>
                </div>
              </div>
            ))}

            {transactions.length === 0 && (
              <p className="py-8 text-center text-xs text-[#8c8c7e]">
                No transactions yet. Click "Add Transaction" or use "Quick AI Entry" above.
              </p>
            )}
          </div>
        </div>

        {/* Group Finance Quick Overview */}
        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#33332d] dark:text-[#e5e5dc] flex items-center gap-2">
              <Users className="h-4 w-4 text-[#5A5A40]" />
              Shared Groups
            </h3>
            <button
              onClick={() => setActiveTab('groups')}
              className="text-xs font-bold text-[#5A5A40] hover:underline dark:text-[#a1a17a]"
            >
              Manage
            </button>
          </div>

          <p className="text-xs text-[#66665c] dark:text-[#a3a395] mb-4">
            Track split expenses for trips, roommates, or team events.
          </p>

          <div className="space-y-3">
            {groups.slice(0, 3).map((g) => (
              <div
                key={g.id}
                onClick={() => setActiveTab('groups')}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-[#ecece2] p-3 hover:bg-[#fafaf6] dark:border-[#2d2d27] dark:hover:bg-[#2a2a25] transition"
              >
                <div>
                  <p className="text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">{g.name}</p>
                  <p className="text-[10px] text-[#8c8c7e]">Code: {g.inviteCode}</p>
                </div>
                <span className="rounded-lg bg-[#f0f1e8] px-2 py-1 text-[10px] font-bold text-[#5A5A40] dark:bg-[#2b2b22] dark:text-[#a1a17a]">
                  Active
                </span>
              </div>
            ))}

            {groups.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#e2e2d8] p-4 text-center dark:border-[#33332c]">
                <p className="text-xs text-[#66665c] dark:text-[#a3a395] mb-2">You aren't in any groups yet.</p>
                <button
                  onClick={() => setActiveTab('groups')}
                  className="rounded-lg bg-[#5A5A40] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#484832] transition"
                >
                  Create or Join Group
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
