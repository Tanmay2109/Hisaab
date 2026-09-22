export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'CAD' | 'AUD' | 'SGD';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  country?: string;
  preferredCurrency: CurrencyCode;
  timeZone?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  role: 'user' | 'admin' | 'super_admin';
  createdAt: string;
  lastActiveAt: string;
  notificationPreferences?: {
    email: boolean;
    bills: boolean;
    budgets: boolean;
    groups: boolean;
    settlements: boolean;
  };
}

export type AccountType =
  | 'cash'
  | 'bank'
  | 'savings'
  | 'credit'
  | 'debit'
  | 'wallet'
  | 'investment'
  | 'loan';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  openingBalance: number;
  currentBalance: number;
  description?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt?: string;
}

export type TransactionType = 'expense' | 'income' | 'transfer' | 'refund' | 'adjustment';

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  currency: CurrencyCode;
  type: TransactionType;
  category: string;
  subcategory?: string;
  merchant?: string;
  description: string;
  date: string; // YYYY-MM-DD
  notes?: string;
  tags?: string[];
  receiptUrl?: string;
  isRecurring?: boolean;
  recurringFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  groupId?: string; // Reference if linked to a group expense
  createdAt: string;
  updatedAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income' | 'both';
  subcategories: string[];
  isDefault?: boolean;
}

export interface Budget {
  id: string;
  userId: string;
  category: string;
  period: 'monthly' | 'weekly' | 'custom';
  amount: number;
  warningThreshold: number; // percentage, e.g., 80
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // YYYY-MM-DD
  contributionAmount: number;
  contributionFrequency: 'weekly' | 'monthly' | 'one-time';
  createdAt: string;
}

export interface Bill {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: CurrencyCode;
  dueDate: string; // YYYY-MM-DD
  accountId?: string;
  category: string;
  recurrence: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  status: 'upcoming' | 'due' | 'paid' | 'overdue';
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  serviceName: string;
  amount: number;
  currency: CurrencyCode;
  billingCycle: 'monthly' | 'yearly' | 'quarterly';
  nextPaymentDate: string; // YYYY-MM-DD
  accountId?: string;
  category: string;
  status: 'active' | 'paused' | 'cancelled';
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  currency: CurrencyCode;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupMember {
  id: string; // userId or member doc id
  userId: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares';

export interface ExpenseSplit {
  userId: string;
  userName: string;
  amount: number; // calculated exact monetary share
  percentage?: number;
  shares?: number;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  title: string;
  amount: number;
  currency: CurrencyCode;
  category: string;
  date: string; // YYYY-MM-DD
  paidByUserId: string;
  paidByUserName: string;
  participantIds: string[];
  splitMethod: SplitMethod;
  splits: ExpenseSplit[];
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface GroupSettlement {
  id: string;
  groupId: string;
  payerId: string;
  payerName: string;
  receiverId: string;
  receiverName: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  note?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface GroupActivity {
  id: string;
  groupId: string;
  type: 'member_joined' | 'member_left' | 'expense_added' | 'expense_updated' | 'expense_deleted' | 'settlement_created' | 'settlement_completed' | 'role_changed';
  actorId: string;
  actorName: string;
  description: string;
  timestamp: string;
}

export interface DebtSimplificationPlan {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: CurrencyCode;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'budget' | 'bill' | 'subscription' | 'group' | 'settlement' | 'security';
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail?: string;
  action: string;
  details: string;
  timestamp: string;
}

// GenAI Structured Types
export interface AIParseExpenseResult {
  amount?: number;
  date?: string;
  category?: string;
  subcategory?: string;
  merchant?: string;
  description?: string;
  type?: 'expense' | 'income';
  confidence?: number;
  missingFields?: string[];
}

export interface AIReceiptItem {
  description: string;
  price: number;
  quantity?: number;
}

export interface AIReceiptAnalysisResult {
  merchant?: string;
  date?: string;
  total?: number;
  tax?: number;
  currency?: CurrencyCode;
  items?: AIReceiptItem[];
  suggestedCategory?: string;
  rawNotes?: string;
}

export interface AIMonthlySummaryResult {
  overviewText: string;
  incomeTotal: number;
  expenseTotal: number;
  savingsTotal: number;
  savingsRate: number;
  topCategories: { category: string; amount: number; percentage: number }[];
  keyObservations: string[];
  smartActionableSuggestions: string[];
}
