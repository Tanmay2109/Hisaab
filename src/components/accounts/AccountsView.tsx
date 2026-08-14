import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  ArrowRightLeft,
  Wallet,
  Landmark,
  PiggyBank,
  DollarSign,
  X,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Account, AccountType } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

interface AccountsViewProps {
  accounts: Account[];
  onCreateAccount: (data: Omit<Account, 'id'>) => Promise<void>;
  onTransferFunds: (fromAccountId: string, toAccountId: string, amount: number) => Promise<void>;
  onDeleteAccount: (accountId: string) => Promise<void>;
}

export const AccountsView: React.FC<AccountsViewProps> = ({
  accounts,
  onCreateAccount,
  onTransferFunds,
  onDeleteAccount,
}) => {
  const { userProfile, user } = useAuth();
  const currency = userProfile?.preferredCurrency || 'INR';

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Account Form
  const [accName, setAccName] = useState('');
  const [accType, setAccType] = useState<AccountType>('bank');
  const [balance, setBalance] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Transfer Form
  const [fromAcc, setFromAcc] = useState('');
  const [toAcc, setToAcc] = useState('');
  const [transferAmt, setTransferAmt] = useState('');
  const [transferring, setTransferring] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim()) return;
    const numBal = parseFloat(balance) || 0;

    setSubmitting(true);
    try {
      await onCreateAccount({
        userId: user?.uid || '',
        name: accName.trim(),
        type: accType,
        currency,
        openingBalance: numBal,
        currentBalance: numBal,
        description: desc.trim() || undefined,
        status: 'active',
        createdAt: new Date().toISOString(),
      });
      setShowAddModal(false);
      setAccName('');
      setBalance('');
      setDesc('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(transferAmt);
    if (!fromAcc || !toAcc || fromAcc === toAcc || isNaN(numAmt) || numAmt <= 0) return;

    setTransferring(true);
    try {
      await onTransferFunds(fromAcc, toAcc, numAmt);
      setShowTransferModal(false);
      setTransferAmt('');
    } catch (err) {
      console.error(err);
    } finally {
      setTransferring(false);
    }
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteAccount(accountToDelete.id);
      setAccountToDelete(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'bank':
        return <Landmark className="h-5 w-5 text-[#5A5A40] dark:text-[#a1a17a]" />;
      case 'credit':
        return <CreditCard className="h-5 w-5 text-[#c86d51] dark:text-[#d98268]" />;
      case 'savings':
        return <PiggyBank className="h-5 w-5 text-[#526352] dark:text-[#6b826b]" />;
      case 'cash':
      case 'wallet':
        return <Wallet className="h-5 w-5 text-[#8a7051] dark:text-[#d99b26]" />;
      default:
        return <DollarSign className="h-5 w-5 text-[#66665c] dark:text-[#a3a395]" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#33332d] dark:text-[#e5e5dc] tracking-tight">
            Financial Accounts
          </h1>
          <p className="text-xs text-[#66665c] dark:text-[#a3a395]">
            Manage wallets, bank accounts, and credit cards with real-time balance tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {accounts.length >= 2 && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e2e2d8] bg-white px-3.5 py-2 text-xs font-bold text-[#33332d] hover:bg-[#fafaf6] dark:border-[#33332c] dark:bg-[#242420] dark:text-[#e5e5dc] dark:hover:bg-[#2a2a25] transition"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Transfer Money
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white hover:bg-[#484832] transition shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="group relative rounded-2xl border border-[#e2e2d8] bg-white p-5 shadow-2xs transition hover:shadow-md dark:border-[#33332c] dark:bg-[#242420]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-[#f0f1e8] p-2.5 dark:bg-[#2b2b22]">
                  {getAccountIcon(acc.type)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#33332d] dark:text-[#e5e5dc]">{acc.name}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8c7e] dark:text-[#737365]">
                    {acc.type}
                  </span>
                </div>
              </div>

              {/* Delete Account Trigger */}
              <button
                onClick={() => setAccountToDelete(acc)}
                className="rounded-lg p-1.5 text-[#8c8c7e] hover:bg-[#fdf4f1] hover:text-[#c86d51] dark:text-[#737365] dark:hover:bg-[#33231e] dark:hover:text-[#d98268] transition"
                title="Delete Account"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-[#ecece2] dark:border-[#2d2d27]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#8c8c7e] dark:text-[#737365]">
                Current Balance
              </span>
              <h4
                className={`text-2xl font-black ${
                  acc.currentBalance < 0
                    ? 'text-[#c86d51] dark:text-[#d98268]'
                    : 'text-[#33332d] dark:text-[#e5e5dc]'
                }`}
              >
                {formatCurrency(acc.currentBalance, acc.currency || currency)}
              </h4>
              {acc.description && (
                <p className="mt-1 text-[11px] text-[#66665c] dark:text-[#a3a395] line-clamp-1">
                  {acc.description}
                </p>
              )}
            </div>
          </div>
        ))}

        {accounts.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-[#e2e2d8] p-8 text-center dark:border-[#33332c]">
            <Wallet className="mx-auto h-8 w-8 text-[#8c8c7e] dark:text-[#737365]" />
            <p className="mt-2 text-sm font-bold text-[#33332d] dark:text-[#e5e5dc]">No accounts found</p>
            <p className="text-xs text-[#66665c] dark:text-[#a3a395]">
              Click "Add Account" above to add your first bank account or wallet.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#242420] border border-[#e2e2d8] dark:border-[#33332c]">
            <div className="flex items-center gap-3 text-[#c86d51] dark:text-[#d98268] mb-3">
              <div className="rounded-xl bg-[#fdf4f1] p-2.5 dark:bg-[#33231e]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">Delete Account?</h3>
            </div>

            <p className="text-xs text-[#66665c] dark:text-[#a3a395] leading-relaxed">
              Are you sure you want to delete <strong className="text-[#33332d] dark:text-[#e5e5dc]">"{accountToDelete.name}"</strong>?
              This action will remove the account from your dashboard and Firestore database.
            </p>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-[#e2e2d8] py-2.5 text-xs font-bold text-[#66665c] hover:bg-[#fafaf6] dark:border-[#33332c] dark:text-[#a3a395] dark:hover:bg-[#2a2a25]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-[#c86d51] py-2.5 text-xs font-bold text-white hover:bg-[#b55e44] transition"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#242420] border border-[#e2e2d8] dark:border-[#33332c]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">New Financial Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#8c8c7e] hover:text-[#33332d] dark:hover:text-[#e5e5dc]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc] mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g. HDFC Salary Account"
                  className="w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs text-[#33332d] dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc] mb-1">
                  Account Type
                </label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value as AccountType)}
                  className="w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc] focus:outline-none focus:border-[#5A5A40]"
                >
                  <option value="bank">Bank Account</option>
                  <option value="cash">Cash Wallet</option>
                  <option value="savings">Savings Account</option>
                  <option value="credit">Credit Card</option>
                  <option value="wallet">Digital Wallet / UPI</option>
                  <option value="investment">Investment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc] mb-1">
                  Initial Balance ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-bold text-[#33332d] dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g. Primary salary account"
                  className="w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs text-[#33332d] dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-[#e2e2d8] py-2.5 text-xs font-bold text-[#66665c] hover:bg-[#fafaf6] dark:border-[#33332c] dark:text-[#a3a395] dark:hover:bg-[#2a2a25]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-[#5A5A40] py-2.5 text-xs font-bold text-white hover:bg-[#484832] transition"
                >
                  {submitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Funds Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#242420] border border-[#e2e2d8] dark:border-[#33332c]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">Transfer Between Accounts</h3>
              <button onClick={() => setShowTransferModal(false)} className="text-[#8c8c7e] hover:text-[#33332d] dark:hover:text-[#e5e5dc]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc] mb-1">
                  From Account
                </label>
                <select
                  value={fromAcc}
                  onChange={(e) => setFromAcc(e.target.value)}
                  className="w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc] focus:outline-none focus:border-[#5A5A40]"
                >
                  <option value="">Select source account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc] mb-1">
                  To Account
                </label>
                <select
                  value={toAcc}
                  onChange={(e) => setToAcc(e.target.value)}
                  className="w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc] focus:outline-none focus:border-[#5A5A40]"
                >
                  <option value="">Select destination account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.currentBalance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc] mb-1">
                  Transfer Amount ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={transferAmt}
                  onChange={(e) => setTransferAmt(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-bold text-[#33332d] dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc] focus:outline-none focus:border-[#5A5A40]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 rounded-xl border border-[#e2e2d8] py-2.5 text-xs font-bold text-[#66665c] hover:bg-[#fafaf6] dark:border-[#33332c] dark:text-[#a3a395] dark:hover:bg-[#2a2a25]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={transferring}
                  className="flex-1 rounded-xl bg-[#5A5A40] py-2.5 text-xs font-bold text-white hover:bg-[#484832] transition"
                >
                  {transferring ? 'Processing...' : 'Complete Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
