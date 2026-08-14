import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Receipt,
  Camera,
  X,
  Bell,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { LoginModal } from './components/auth/LoginModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { AccountsView } from './components/accounts/AccountsView';
import { BudgetsView } from './components/budgets/BudgetsView';
import { SavingsGoalsView } from './components/goals/SavingsGoalsView';
import { BillsView } from './components/bills/BillsView';
import { SubscriptionsView } from './components/subscriptions/SubscriptionsView';
import { GroupsView } from './components/groups/GroupsView';
import { ReportsView } from './components/reports/ReportsView';
import { AIInsightsView } from './components/ai/AIInsightsView';
import { SettingsView } from './components/settings/SettingsView';
import { AdminView } from './components/admin/AdminView';

import {
  Account,
  Bill,
  Budget,
  Group,
  NotificationItem,
  SavingsGoal,
  Subscription,
  Transaction,
} from './types';
import {
  createAccount,
  deleteAccount,
  createBill,
  deleteBill,
  createSavingsGoal,
  deleteSavingsGoal,
  createSubscription,
  deleteSubscription,
  createTransaction,
  deleteBudget,
  deleteTransaction,
  getAccounts,
  getBills,
  getBudgets,
  getGroupsForUser,
  getSavingsGoals,
  getSubscriptions,
  getTransactions,
  markBillAsPaid,
  saveBudget,
  updateGoalProgress,
} from './services/firestoreService';
import { aiApiService } from './services/api';

function MainAppContent() {
  const { user, userProfile, loading: authLoading, enterDemoMode } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Core Firestore State
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Quick Add Transaction Modal State
  const [isOpenAddModal, setIsOpenAddModal] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Quick AI Natural Language Entry Modal
  const [showAIModal, setShowAIModal] = useState(false);
  const [nlInput, setNlInput] = useState('');
  const [parsingAI, setParsingAI] = useState(false);
  const [savingAITransaction, setSavingAITransaction] = useState(false);
  const [parsedResult, setParsedResult] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Notifications Drawer
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserData(user.uid);
    }
  }, [user]);

  const fetchUserData = async (uid: string) => {
    setDataLoading(true);
    try {
      const [accs, txs, bdgs, gls, bls, subs, grps] = await Promise.all([
        getAccounts(uid),
        getTransactions(uid),
        getBudgets(uid),
        getSavingsGoals(uid),
        getBills(uid),
        getSubscriptions(uid),
        getGroupsForUser(uid),
      ]);

      setAccounts(accs);
      setTransactions(txs);
      setBudgets(bdgs);
      setGoals(gls);
      setBills(bls);
      setSubscriptions(subs);
      setGroups(grps);

      // Generate notification badges from overdue bills or budget limits
      const notifs: NotificationItem[] = [];
      bdgs.forEach((b) => {
        const spent = txs
          .filter((t) => t.category === b.category && t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        if (spent >= b.amount) {
          notifs.push({
            id: `b-over-${b.id}`,
            userId: uid,
            title: 'Budget Threshold Exceeded',
            message: `You've exceeded your monthly budget for ${b.category}.`,
            type: 'budget',
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      });
      setNotifications(notifs);
    } catch (err) {
      console.error('Failed to load user financial data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // HANDLERS
  const handleAddTransaction = async (data: Omit<Transaction, 'id'>): Promise<boolean> => {
    if (!user) {
      showToast('Authentication required to save transaction.', 'error');
      return false;
    }

    // Validation checks
    if (!data.accountId || !data.accountId.trim()) {
      showToast('Validation Error: Please select or create an account for this transaction.', 'error');
      return false;
    }

    if (!data.amount || isNaN(data.amount) || data.amount <= 0) {
      showToast('Validation Error: Please enter a valid positive amount.', 'error');
      return false;
    }

    if (!data.category || !data.category.trim()) {
      showToast('Validation Error: Please select a category for this transaction.', 'error');
      return false;
    }

    try {
      const newTx = await createTransaction(user.uid, data);
      setTransactions((prev) => [newTx, ...prev]);
      showToast(`Transaction of ₹${data.amount} saved successfully!`, 'success');

      // Refresh accounts to sync current balance
      const updatedAccs = await getAccounts(user.uid);
      setAccounts(updatedAccs);
      return true;
    } catch (err: any) {
      console.error('Failed to add transaction:', err);
      showToast(`Failed to add transaction: ${err?.message || 'Unknown error'}`, 'error');
      return false;
    }
  };

  const handleDeleteTransaction = async (
    txId: string,
    accId: string,
    amount: number,
    type: string
  ) => {
    if (!user) return;
    await deleteTransaction(user.uid, txId, accId, amount, type);
    setTransactions((prev) => prev.filter((t) => t.id !== txId));
    const updatedAccs = await getAccounts(user.uid);
    setAccounts(updatedAccs);
  };

  const handleCreateAccount = async (data: Omit<Account, 'id'>) => {
    if (!user) return;
    const newAcc = await createAccount(user.uid, data);
    setAccounts((prev) => [...prev, newAcc]);
    showToast(`Account "${data.name}" added successfully!`, 'success');
  };

  const handleDeleteAccount = async (accountId: string) => {
    if (!user) return;
    const target = accounts.find((a) => a.id === accountId);
    await deleteAccount(user.uid, accountId);
    setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    showToast(`Account "${target?.name || 'Account'}" deleted successfully.`, 'info');
  };

  const handleTransferFunds = async (
    fromAccId: string,
    toAccId: string,
    amount: number
  ) => {
    if (!user) return;
    const fromAcc = accounts.find((a) => a.id === fromAccId);
    const toAcc = accounts.find((a) => a.id === toAccId);
    if (!fromAcc || !toAcc) return;

    await handleAddTransaction({
      userId: user.uid,
      accountId: fromAccId,
      amount,
      currency: userProfile?.preferredCurrency || 'INR',
      type: 'expense',
      category: 'Transfer',
      description: `Transfer to ${toAcc.name}`,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await handleAddTransaction({
      userId: user.uid,
      accountId: toAccId,
      amount,
      currency: userProfile?.preferredCurrency || 'INR',
      type: 'income',
      category: 'Transfer',
      description: `Transfer from ${fromAcc.name}`,
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCreateBudget = async (data: Omit<Budget, 'id'>) => {
    if (!user) return;
    const b = await saveBudget(user.uid, data);
    setBudgets((prev) => [...prev, b]);
    showToast(`Budget for ${data.category} created!`, 'success');
  };

  const handleDeleteBudget = async (id: string) => {
    if (!user) return;
    await deleteBudget(user.uid, id);
    setBudgets((prev) => prev.filter((b) => b.id !== id));
    showToast('Budget removed.', 'info');
  };

  const handleCreateGoal = async (data: Omit<SavingsGoal, 'id'>) => {
    if (!user) return;
    const g = await createSavingsGoal(user.uid, data);
    setGoals((prev) => [...prev, g]);
    showToast(`Goal "${data.name}" created!`, 'success');
  };

  const handleDeleteGoal = async (id: string) => {
    if (!user) return;
    const target = goals.find((g) => g.id === id);
    await deleteSavingsGoal(user.uid, id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
    showToast(`Goal "${target?.name || 'Goal'}" deleted.`, 'info');
  };

  const handleAddContribution = async (goalId: string, added: number) => {
    if (!user) return;
    const targetGoal = goals.find((g) => g.id === goalId);
    const current = targetGoal?.currentAmount || 0;
    await updateGoalProgress(user.uid, goalId, added, current);
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, currentAmount: g.currentAmount + added } : g))
    );
    showToast(`Added ₹${added} to ${targetGoal?.name || 'goal'}!`, 'success');
  };

  const handleCreateBill = async (data: Omit<Bill, 'id'>) => {
    if (!user) return;
    const b = await createBill(user.uid, data);
    setBills((prev) => [...prev, b]);
    showToast(`Bill "${data.name}" added!`, 'success');
  };

  const handleDeleteBill = async (id: string) => {
    if (!user) return;
    const target = bills.find((b) => b.id === id);
    await deleteBill(user.uid, id);
    setBills((prev) => prev.filter((b) => b.id !== id));
    showToast(`Bill "${target?.name || 'Bill'}" deleted.`, 'info');
  };

  const handleMarkBillPaid = async (billId: string) => {
    if (!user) return;
    await markBillAsPaid(user.uid, billId);
    setBills((prev) => prev.map((b) => (b.id === billId ? { ...b, status: 'paid' } : b)));
    showToast('Bill marked as paid!', 'success');
  };

  const handleCreateSubscription = async (data: Omit<Subscription, 'id'>) => {
    if (!user) return;
    const sub = await createSubscription(user.uid, data);
    setSubscriptions((prev) => [...prev, sub]);
    showToast(`Subscription "${data.serviceName}" added!`, 'success');
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!user) return;
    const target = subscriptions.find((s) => s.id === id);
    await deleteSubscription(user.uid, id);
    setSubscriptions((prev) => prev.filter((s) => s.id !== id));
    showToast(`Subscription "${target?.serviceName || 'Subscription'}" deleted.`, 'info');
  };

  const handleRefreshGroups = async () => {
    if (user) {
      const grps = await getGroupsForUser(user.uid);
      setGroups(grps);
    }
  };

  // AI Quick Parse Submission
  const handleAIParseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlInput.trim()) return;

    setParsingAI(true);
    setAiError(null);
    setParsedResult(null);

    try {
      const result = await aiApiService.parseExpense(
        nlInput,
        accounts.map((a) => a.name)
      );
      setParsedResult(result);
    } catch (err: any) {
      setAiError(err.message || 'Failed to parse text input.');
    } finally {
      setParsingAI(false);
    }
  };

  const handleConfirmAITransaction = async () => {
    if (!parsedResult || !user) return;
    setSavingAITransaction(true);
    setAiError(null);

    try {
      let targetAccId = accounts[0]?.id;
      if (!targetAccId) {
        const newAcc = await createAccount(user.uid, {
          userId: user.uid,
          name: 'Main Bank Account',
          type: 'bank',
          currency: userProfile?.preferredCurrency || 'INR',
          openingBalance: 10000,
          currentBalance: 10000,
          description: 'Primary salary and savings account',
          status: 'active',
          createdAt: new Date().toISOString(),
        });
        setAccounts([newAcc]);
        targetAccId = newAcc.id;
      }

      const rawAmount = typeof parsedResult.amount === 'string' 
        ? parseFloat(parsedResult.amount.replace(/[^0-9.]/g, '')) 
        : Number(parsedResult.amount);
      const parsedAmount = isNaN(rawAmount) || rawAmount <= 0 ? 100 : rawAmount;
      const rawType = (parsedResult.type || 'expense').toString().toLowerCase().trim();
      const normType = rawType === 'income' ? 'income' : 'expense';

      const success = await handleAddTransaction({
        userId: user.uid,
        accountId: targetAccId,
        amount: parsedAmount,
        currency: userProfile?.preferredCurrency || 'INR',
        type: normType,
        category: parsedResult.category || 'Food & Dining',
        merchant: parsedResult.merchant || '',
        description: parsedResult.description || nlInput,
        date: parsedResult.date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (success) {
        setShowAIModal(false);
        setNlInput('');
        setParsedResult(null);
      }
    } catch (err: any) {
      console.error('Error saving AI parsed transaction:', err);
      setAiError(err?.message || 'Failed to save transaction.');
    } finally {
      setSavingAITransaction(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f0] dark:bg-[#1a1a17]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#5A5A40] border-t-transparent" />
          <p className="text-xs font-bold text-[#5A5A40] dark:text-[#a1a17a]">
            Loading Hisaab Finance Engine...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="relative min-h-screen bg-[#f5f5f0] text-[#33332d] dark:bg-[#1a1a17] dark:text-[#e5e5dc]">
        <LoginModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#33332d] dark:bg-[#1a1a17] dark:text-[#e5e5dc]">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        openAIModal={() => setShowAIModal(true)}
        unreadCount={notifications.filter((n) => !n.read).length}
        openNotifications={() => setShowNotificationsDrawer(true)}
      />

      <div className="flex">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSidebarOpen(false);
          }}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              accounts={accounts}
              transactions={transactions}
              budgets={budgets}
              bills={bills}
              subscriptions={subscriptions}
              groups={groups}
              onOpenAddTransaction={() => {
                setActiveTab('transactions');
                setIsOpenAddModal(true);
              }}
              onOpenAIModal={() => setShowAIModal(true)}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'transactions' && (
            <TransactionsView
              transactions={transactions}
              accounts={accounts}
              onAddTransaction={handleAddTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              isOpenAddModal={isOpenAddModal}
              setIsOpenAddModal={setIsOpenAddModal}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              accounts={accounts}
              onCreateAccount={handleCreateAccount}
              onTransferFunds={handleTransferFunds}
              onDeleteAccount={handleDeleteAccount}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetsView
              budgets={budgets}
              transactions={transactions}
              onCreateBudget={handleCreateBudget}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {activeTab === 'goals' && (
            <SavingsGoalsView
              goals={goals}
              onCreateGoal={handleCreateGoal}
              onAddContribution={handleAddContribution}
              onDeleteGoal={handleDeleteGoal}
            />
          )}

          {activeTab === 'bills' && (
            <BillsView
              bills={bills}
              onCreateBill={handleCreateBill}
              onMarkPaid={handleMarkBillPaid}
              onDeleteBill={handleDeleteBill}
            />
          )}

          {activeTab === 'subscriptions' && (
            <SubscriptionsView
              subscriptions={subscriptions}
              onCreateSubscription={handleCreateSubscription}
              onDeleteSubscription={handleDeleteSubscription}
            />
          )}

          {activeTab === 'groups' && (
            <GroupsView groups={groups} onRefreshGroups={handleRefreshGroups} />
          )}

          {activeTab === 'reports' && (
            <ReportsView transactions={transactions} accounts={accounts} />
          )}

          {activeTab === 'ai-insights' && (
            <AIInsightsView
              transactions={transactions}
              accounts={accounts}
              budgets={budgets}
            />
          )}

          {activeTab === 'settings' && <SettingsView />}

          {activeTab === 'admin' && <AdminView />}
        </main>
      </div>

      {/* Quick AI Entry Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#33332d]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-[#e2e2d8] bg-white p-6 shadow-2xl dark:border-[#33332c] dark:bg-[#242420]">
            <div className="flex items-center justify-between border-b border-[#ecece2] pb-4 dark:border-[#2d2d27]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#5A5A40]" />
                <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  Quick AI Expense Logging
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAIModal(false);
                  setParsedResult(null);
                }}
                className="rounded-lg p-1 text-[#66665c] hover:bg-[#e6e6dc] dark:hover:bg-[#2a2a25]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-2 text-xs text-[#66665c] dark:text-[#a3a395]">
              Type or speak any natural sentence like: <br />
              <span className="italic font-medium text-[#33332d] dark:text-[#e5e5dc]">
                "Paid 1200 rupees for grocers at Reliance Fresh today"
              </span>
            </p>

            <form onSubmit={handleAIParseSubmit} className="mt-4 space-y-4">
              <textarea
                rows={3}
                required
                placeholder="Describe your transaction in natural language..."
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                className="w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] p-3 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  disabled={parsingAI}
                  className="rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#484832]"
                >
                  {parsingAI ? 'Analyzing with Hisaab AI...' : 'Parse Transaction'}
                </button>
              </div>
            </form>

            {aiError && (
              <div className="mt-3 rounded-xl bg-[#fdf4f1] p-3 text-xs text-[#c86d51] dark:bg-[#33231e]">
                {aiError}
              </div>
            )}

            {parsedResult && (
              <div className="mt-4 space-y-3 rounded-xl border border-[#ecece2] bg-[#fafaf6] p-4 text-xs dark:border-[#2d2d27] dark:bg-[#1a1a17]">
                <h4 className="font-bold text-[#33332d] dark:text-[#e5e5dc] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="h-4 w-4 text-[#526352]" />
                    Extracted Details
                  </span>
                  <span className="text-[10px] text-[#66665c] dark:text-[#a3a395]">
                    Verify & save
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[#33332d] dark:text-[#e5e5dc]">
                  <div>
                    <label className="block text-[10px] text-[#66665c] dark:text-[#a3a395]">Amount (₹)</label>
                    <input
                      type="number"
                      value={parsedResult.amount || ''}
                      onChange={(e) => setParsedResult({ ...parsedResult, amount: e.target.value })}
                      className="mt-0.5 w-full rounded-lg border border-[#e2e2d8] bg-white p-1.5 text-xs font-bold text-[#33332d] dark:border-[#33332c] dark:bg-[#242420] dark:text-[#e5e5dc]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#66665c] dark:text-[#a3a395]">Category</label>
                    <input
                      type="text"
                      value={parsedResult.category || ''}
                      onChange={(e) => setParsedResult({ ...parsedResult, category: e.target.value })}
                      className="mt-0.5 w-full rounded-lg border border-[#e2e2d8] bg-white p-1.5 text-xs font-semibold text-[#33332d] dark:border-[#33332c] dark:bg-[#242420] dark:text-[#e5e5dc]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#66665c] dark:text-[#a3a395]">Type</label>
                    <select
                      value={parsedResult.type || 'expense'}
                      onChange={(e) => setParsedResult({ ...parsedResult, type: e.target.value })}
                      className="mt-0.5 w-full rounded-lg border border-[#e2e2d8] bg-white p-1.5 text-xs font-semibold text-[#33332d] dark:border-[#33332c] dark:bg-[#242420] dark:text-[#e5e5dc]"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#66665c] dark:text-[#a3a395]">Merchant / Store</label>
                    <input
                      type="text"
                      value={parsedResult.merchant || ''}
                      onChange={(e) => setParsedResult({ ...parsedResult, merchant: e.target.value })}
                      placeholder="e.g. Swiggy, Amazon"
                      className="mt-0.5 w-full rounded-lg border border-[#e2e2d8] bg-white p-1.5 text-xs font-semibold text-[#33332d] dark:border-[#33332c] dark:bg-[#242420] dark:text-[#e5e5dc]"
                    />
                  </div>
                </div>

                <button
                  id="btn-confirm-save-ai-tx"
                  disabled={savingAITransaction}
                  onClick={handleConfirmAITransaction}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#526352] py-2.5 text-xs font-bold text-white transition hover:bg-[#415041] disabled:opacity-50"
                >
                  {savingAITransaction ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Saving Transaction...</span>
                    </>
                  ) : (
                    <span>Confirm & Save Transaction</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 bg-white text-[#33332d] border-[#e2e2d8] dark:bg-[#242420] dark:text-[#e5e5dc] dark:border-[#33332c]">
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-[#c86d51] shrink-0" />}
          {toast.type === 'success' && <CheckCircle className="h-4 w-4 text-[#526352] shrink-0" />}
          {toast.type === 'info' && <Sparkles className="h-4 w-4 text-[#5A5A40] shrink-0" />}
          <span className="pr-2">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="rounded-md p-1 hover:bg-[#f0f0ea] dark:hover:bg-[#33332c]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Notifications Drawer */}
      {showNotificationsDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#33332d]/50 backdrop-blur-xs">
          <div className="h-full w-full max-w-sm border-l border-[#e2e2d8] bg-white p-6 shadow-2xl dark:border-[#33332c] dark:bg-[#242420]">
            <div className="flex items-center justify-between border-b border-[#ecece2] pb-4 dark:border-[#2d2d27]">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[#5A5A40]" />
                <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  Notifications
                </h3>
              </div>
              <button
                onClick={() => setShowNotificationsDrawer(false)}
                className="rounded-lg p-1 text-[#66665c] hover:bg-[#e6e6dc] dark:hover:bg-[#2a2a25]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-[#e2e2d8] bg-[#fafaf6] p-3 text-xs dark:border-[#33332c] dark:bg-[#1a1a17]"
                >
                  <p className="font-bold text-[#33332d] dark:text-[#e5e5dc]">{n.title}</p>
                  <p className="text-[#66665c] dark:text-[#a3a395] mt-0.5">{n.message}</p>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="py-8 text-center text-xs text-[#8c8c7e]">
                  No active alerts. All budgets and bills are on track!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
