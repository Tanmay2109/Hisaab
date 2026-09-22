import React, { useState } from 'react';
import { Sparkles, Brain, Lightbulb, MessageSquare, ArrowRight } from 'lucide-react';
import { Account, Budget, Transaction } from '../../types';
import { aiApiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface AIInsightsViewProps {
  transactions: Transaction[];
  accounts: Account[];
  budgets: Budget[];
}

export const AIInsightsView: React.FC<AIInsightsViewProps> = ({
  transactions,
  accounts,
  budgets,
}) => {
  const { userProfile } = useAuth();
  const currency = userProfile?.preferredCurrency || 'INR';

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loadingAnswer, setLoadingAnswer] = useState(false);

  const [summaryResult, setSummaryResult] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoadingAnswer(true);
    setAnswer(null);
    try {
      const res = await aiApiService.askFinancialQuestion(question, {
        transactions: transactions.slice(0, 30),
        accounts,
        budgets,
        currency,
      });
      setAnswer(res);
    } catch (err: any) {
      setAnswer('Failed to retrieve AI analysis. Please verify your connection.');
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
      const incomeTotal = transactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const expenseTotal = transactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const res = await aiApiService.getMonthlySummary({
        incomeTotal,
        expenseTotal,
        accountsCount: accounts.length,
        transactionsCount: transactions.length,
        recentTransactions: transactions.slice(0, 10),
      });
      setSummaryResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#33332d] dark:text-[#e5e5dc] tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[#5A5A40]" />
            Hisaab AI
          </h1>
          <p className="text-xs text-[#66665c] dark:text-[#a3a395]">
            Powered by Hisaab AI for natural language querying & instant budgeting insights.
          </p>
        </div>
        <button
          onClick={handleGenerateSummary}
          disabled={loadingSummary}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5A5A40] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#484832] transition shadow-xs"
        >
          <Brain className="h-4 w-4" />
          {loadingSummary ? 'Analyzing Data...' : 'Generate Monthly Summary'}
        </button>
      </div>

      {summaryResult && (
        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-6 dark:border-[#33332c] dark:bg-[#242420] space-y-4">
          <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc] flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-[#d99b26]" />
            Hisaab AI Executive Overview
          </h3>
          <p className="text-xs text-[#33332d] dark:text-[#e5e5dc] leading-relaxed">
            {summaryResult.overviewText}
          </p>

          {summaryResult.keyObservations?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-[#33332d] dark:text-[#e5e5dc] uppercase tracking-wider mb-2">
                Key Observations
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-[#66665c] dark:text-[#a3a395]">
                {summaryResult.keyObservations.map((obs: string, idx: number) => (
                  <li key={idx}>{obs}</li>
                ))}
              </ul>
            </div>
          )}

          {summaryResult.smartActionableSuggestions?.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-[#33332d] dark:text-[#e5e5dc] uppercase tracking-wider mb-2">
                Actionable Recommendations
              </h4>
              <ul className="list-disc list-inside space-y-1 text-xs text-[#526352] dark:text-[#6b826b] font-medium">
                {summaryResult.smartActionableSuggestions.map((sug: string, idx: number) => (
                  <li key={idx}>{sug}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Ask Question Card */}
      <div className="rounded-2xl border border-[#e2e2d8] bg-white p-6 dark:border-[#33332c] dark:bg-[#242420] space-y-4">
        <h3 className="text-sm font-bold text-[#33332d] dark:text-[#e5e5dc] flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#5A5A40]" />
          Ask Anything About Your Finances
        </h3>
        <p className="text-xs text-[#66665c] dark:text-[#a3a395]">
          Query your actual transaction logs directly in natural language.
        </p>
        <form onSubmit={handleAskQuestion} className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. How much did I spend on food this month vs last month?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="flex-1 rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-4 py-2.5 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
          />
          <button
            type="submit"
            disabled={loadingAnswer}
            className="rounded-xl bg-[#5A5A40] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#484832] transition"
          >
            {loadingAnswer ? 'Asking...' : 'Ask Hisaab AI'}
          </button>
        </form>

        {answer && (
          <div className="mt-4 rounded-xl border border-[#ecece2] bg-[#fafaf6] p-4 text-xs text-[#33332d] dark:border-[#2d2d27] dark:bg-[#1a1a17] dark:text-[#e5e5dc] leading-relaxed">
            {answer}
          </div>
        )}
      </div>
    </div>
  );
};
