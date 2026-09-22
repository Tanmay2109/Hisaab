import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Download, PieChart as PieIcon } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { Account, Transaction } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface ReportsViewProps {
  transactions: Transaction[];
  accounts: Account[];
}

const COLORS = ['#5A5A40', '#c86d51', '#526352', '#8a7051', '#d99b26', '#737365', '#33332d', '#8c8c68'];

export const ReportsView: React.FC<ReportsViewProps> = ({ transactions, accounts }) => {
  const { userProfile } = useAuth();
  const currency = userProfile?.preferredCurrency || 'INR';

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount;
      });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const monthlyTotals = useMemo(() => {
    const monthsMap: Record<string, { income: number; expense: number }> = {};
    transactions.forEach((t) => {
      const date = new Date(t.date);
      const mKey = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
      if (!monthsMap[mKey]) monthsMap[mKey] = { income: 0, expense: 0 };
      if (t.type === 'income') monthsMap[mKey].income += t.amount;
      if (t.type === 'expense') monthsMap[mKey].expense += t.amount;
    });

    return Object.entries(monthsMap).map(([month, val]) => ({
      month,
      Income: val.income,
      Expense: val.expense,
      Net: val.income - val.expense,
    }));
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#33332d] dark:text-[#e5e5dc] tracking-tight">
            Financial Analytics & Reports
          </h1>
          <p className="text-xs text-[#66665c] dark:text-[#a3a395]">
            Visual breakdown of spending habits, income flows and account distributions.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420]">
          <h3 className="text-sm font-bold text-[#33332d] dark:text-[#e5e5dc] mb-4">
            Income vs Expense Monthly Distribution
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTotals}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#66665c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#66665c' }} />
                <Tooltip formatter={(v: any) => formatCurrency(Number(v), currency)} />
                <Bar dataKey="Income" fill="#526352" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#c86d51" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420]">
          <h3 className="text-sm font-bold text-[#33332d] dark:text-[#e5e5dc] mb-4">
            Expense Category Breakdown
          </h3>
          {categoryBreakdown.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v), currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-xs text-[#8c8c7e]">
              No expense data recorded to generate pie chart.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
