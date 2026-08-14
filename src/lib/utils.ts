import { CategoryItem, CurrencyCode, DebtSimplificationPlan, ExpenseSplit, GroupExpense, GroupMember, GroupSettlement, SplitMethod } from '../types';

export function formatCurrency(amount: number, currency: CurrencyCode = 'INR'): string {
  const isINR = currency === 'INR';
  const locale = isINR ? 'en-IN' : 'en-US';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'cat-1', name: 'Food & Dining', icon: 'Utensils', color: '#ef4444', type: 'expense', subcategories: ['Groceries', 'Restaurants', 'Cafe & Snacks', 'Food Delivery'], isDefault: true },
  { id: 'cat-2', name: 'Transportation', icon: 'Car', color: '#f97316', type: 'expense', subcategories: ['Fuel', 'Public Transit', 'Taxi/Cab', 'Vehicle Maintenance'], isDefault: true },
  { id: 'cat-3', name: 'Housing & Rent', icon: 'Home', color: '#8b5cf6', type: 'expense', subcategories: ['Rent', 'Mortgage', 'Maintenance', 'Furniture'], isDefault: true },
  { id: 'cat-4', name: 'Utilities', icon: 'Zap', color: '#eab308', type: 'expense', subcategories: ['Electricity', 'Water', 'Internet & Wi-Fi', 'Gas', 'Mobile Recharge'], isDefault: true },
  { id: 'cat-5', name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899', type: 'expense', subcategories: ['Clothing', 'Electronics', 'Home Goods', 'Personal Items'], isDefault: true },
  { id: 'cat-6', name: 'Healthcare', icon: 'Activity', color: '#06b6d4', type: 'expense', subcategories: ['Doctor Visit', 'Pharmacy', 'Health Insurance', 'Fitness/Gym'], isDefault: true },
  { id: 'cat-7', name: 'Entertainment', icon: 'Film', color: '#3b82f6', type: 'expense', subcategories: ['Movies', 'Games', 'Concerts', 'Events'], isDefault: true },
  { id: 'cat-8', name: 'Subscriptions', icon: 'Repeat', color: '#6366f1', type: 'expense', subcategories: ['Streaming', 'Software', 'Memberships', 'Cloud Storage'], isDefault: true },
  { id: 'cat-9', name: 'Education', icon: 'BookOpen', color: '#10b981', type: 'expense', subcategories: ['Courses', 'Tuition', 'Books', 'Certifications'], isDefault: true },
  { id: 'cat-10', name: 'Travel', icon: 'Plane', color: '#14b8a6', type: 'expense', subcategories: ['Flights', 'Hotels', 'Sightseeing', 'Car Rental'], isDefault: true },
  { id: 'cat-11', name: 'Finance & Taxes', icon: 'Landmark', color: '#64748b', type: 'expense', subcategories: ['Bank Fees', 'Interest', 'Taxes', 'Investments'], isDefault: true },
  { id: 'cat-12', name: 'Salary / Income', icon: 'DollarSign', color: '#22c55e', type: 'income', subcategories: ['Salary', 'Freelance', 'Investments', 'Bonus', 'Rental Income'], isDefault: true },
  { id: 'cat-13', name: 'Other', icon: 'MoreHorizontal', color: '#94a3b8', type: 'both', subcategories: ['Miscellaneous', 'Adjustments'], isDefault: true },
];

/**
 * Calculates exact Monetary Splits for a group expense based on selected SplitMethod.
 */
export function calculateExpenseSplits(
  totalAmount: number,
  splitMethod: SplitMethod,
  participants: { userId: string; userName: string }[],
  inputValues: Record<string, number> // exact amounts, percentages, or shares per userId
): { splits: ExpenseSplit[]; isValid: boolean; errorMessage?: string } {
  if (!participants.length || totalAmount <= 0) {
    return { splits: [], isValid: false, errorMessage: 'Amount and participants are required.' };
  }

  const count = participants.length;
  const splits: ExpenseSplit[] = [];

  if (splitMethod === 'equal') {
    const share = Math.round((totalAmount / count) * 100) / 100;
    let accumulated = 0;

    participants.forEach((p, idx) => {
      let participantShare = share;
      if (idx === count - 1) {
        // Adjust rounding on last item so exact sum equals totalAmount
        participantShare = Math.round((totalAmount - accumulated) * 100) / 100;
      } else {
        accumulated += share;
      }
      splits.push({
        userId: p.userId,
        userName: p.userName,
        amount: participantShare,
      });
    });

    return { splits, isValid: true };
  }

  if (splitMethod === 'exact') {
    let sum = 0;
    participants.forEach((p) => {
      const val = inputValues[p.userId] || 0;
      sum += val;
      splits.push({
        userId: p.userId,
        userName: p.userName,
        amount: Math.round(val * 100) / 100,
      });
    });

    const diff = Math.abs(sum - totalAmount);
    if (diff > 0.05) {
      return {
        splits,
        isValid: false,
        errorMessage: `Total exact shares (${formatCurrency(sum)}) must equal total expense amount (${formatCurrency(totalAmount)}). Difference: ${formatCurrency(diff)}`,
      };
    }
    return { splits, isValid: true };
  }

  if (splitMethod === 'percentage') {
    let sumPercent = 0;
    participants.forEach((p) => {
      const pct = inputValues[p.userId] || 0;
      sumPercent += pct;
    });

    if (Math.abs(sumPercent - 100) > 0.1) {
      return {
        splits: [],
        isValid: false,
        errorMessage: `Sum of percentages (${sumPercent.toFixed(1)}%) must equal 100%.`,
      };
    }

    let accumulated = 0;
    participants.forEach((p, idx) => {
      const pct = inputValues[p.userId] || 0;
      let calculatedAmt = Math.round(((totalAmount * pct) / 100) * 100) / 100;
      if (idx === count - 1) {
        calculatedAmt = Math.round((totalAmount - accumulated) * 100) / 100;
      } else {
        accumulated += calculatedAmt;
      }
      splits.push({
        userId: p.userId,
        userName: p.userName,
        amount: calculatedAmt,
        percentage: pct,
      });
    });

    return { splits, isValid: true };
  }

  if (splitMethod === 'shares') {
    let totalShares = 0;
    participants.forEach((p) => {
      const sh = inputValues[p.userId] || 1;
      totalShares += sh;
    });

    if (totalShares <= 0) {
      return { splits: [], isValid: false, errorMessage: 'Total shares must be greater than 0.' };
    }

    let accumulated = 0;
    participants.forEach((p, idx) => {
      const sh = inputValues[p.userId] || 1;
      let calculatedAmt = Math.round(((totalAmount * sh) / totalShares) * 100) / 100;
      if (idx === count - 1) {
        calculatedAmt = Math.round((totalAmount - accumulated) * 100) / 100;
      } else {
        accumulated += calculatedAmt;
      }
      splits.push({
        userId: p.userId,
        userName: p.userName,
        amount: calculatedAmt,
        shares: sh,
      });
    });

    return { splits, isValid: true };
  }

  return { splits: [], isValid: false, errorMessage: 'Invalid split method.' };
}

/**
 * Calculates net balances per group member and resolves optimal settlement debts (Greedy algorithm).
 */
export function calculateGroupMemberBalances(
  members: GroupMember[],
  expenses: GroupExpense[],
  settlements: GroupSettlement[]
): {
  balances: Record<string, { totalPaid: number; totalShare: number; netBalance: number }>;
  suggestedPlan: DebtSimplificationPlan[];
} {
  const balances: Record<string, { totalPaid: number; totalShare: number; netBalance: number }> = {};
  const memberMap: Record<string, string> = {};

  members.forEach((m) => {
    balances[m.userId] = { totalPaid: 0, totalShare: 0, netBalance: 0 };
    memberMap[m.userId] = m.name || m.email || 'Member';
  });

  // Calculate total paid & total share from expenses
  expenses.forEach((exp) => {
    if (!balances[exp.paidByUserId]) {
      balances[exp.paidByUserId] = { totalPaid: 0, totalShare: 0, netBalance: 0 };
      memberMap[exp.paidByUserId] = exp.paidByUserName || 'Member';
    }
    balances[exp.paidByUserId].totalPaid += exp.amount;

    exp.splits.forEach((split) => {
      if (!balances[split.userId]) {
        balances[split.userId] = { totalPaid: 0, totalShare: 0, netBalance: 0 };
        memberMap[split.userId] = split.userName || 'Member';
      }
      balances[split.userId].totalShare += split.amount;
    });
  });

  // Compute net balances before settlements: net = paid - share
  Object.keys(balances).forEach((uid) => {
    balances[uid].netBalance = balances[uid].totalPaid - balances[uid].totalShare;
  });

  // Adjust net balances with completed settlements:
  // When payer settles 'amount' to receiver:
  // payer's effective net balance increases by amount (they paid off debt)
  // receiver's effective net balance decreases by amount (they received money)
  settlements.forEach((st) => {
    if (st.status === 'completed') {
      if (balances[st.payerId]) {
        balances[st.payerId].netBalance += st.amount;
      }
      if (balances[st.receiverId]) {
        balances[st.receiverId].netBalance -= st.amount;
      }
    }
  });

  // DEBT SIMPLIFICATION ALGORITHM (Minimizes transactions)
  const creditors: { userId: string; amount: number }[] = [];
  const debtors: { userId: string; amount: number }[] = [];

  Object.keys(balances).forEach((uid) => {
    const net = Math.round(balances[uid].netBalance * 100) / 100;
    if (net > 0.01) {
      creditors.push({ userId: uid, amount: net });
    } else if (net < -0.01) {
      debtors.push({ userId: uid, amount: Math.abs(net) });
    }
  });

  const suggestedPlan: DebtSimplificationPlan[] = [];
  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settledAmt = Math.min(debtor.amount, creditor.amount);
    const roundedAmt = Math.round(settledAmt * 100) / 100;

    if (roundedAmt > 0) {
      suggestedPlan.push({
        fromUserId: debtor.userId,
        fromUserName: memberMap[debtor.userId] || debtor.userId,
        toUserId: creditor.userId,
        toUserName: memberMap[creditor.userId] || creditor.userId,
        amount: roundedAmt,
        currency: 'INR',
      });
    }

    debtor.amount -= settledAmt;
    creditor.amount -= settledAmt;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return { balances, suggestedPlan };
}
