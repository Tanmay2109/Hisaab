import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Account,
  AuditLog,
  Bill,
  Budget,
  Group,
  GroupActivity,
  GroupExpense,
  GroupMember,
  GroupSettlement,
  SavingsGoal,
  Subscription,
  Transaction,
} from '../types';

/**
 * Deeply removes any key with an `undefined` value so Firestore never throws
 * "Unsupported field value: undefined".
 */
export const cleanForFirestore = <T extends Record<string, any>>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => (typeof item === 'object' && item !== null ? cleanForFirestore(item) : item)) as any;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      cleaned[key] = cleanForFirestore(value);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
};

// Helper for fast local storage caching
const getLocal = <T>(key: string, defaultVal: T): T => {
  try {
    const raw = localStorage.getItem(`hisaab_${key}`);
    return raw ? JSON.parse(raw) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setLocal = <T>(key: string, val: T): void => {
  try {
    localStorage.setItem(`hisaab_${key}`, JSON.stringify(val));
  } catch (e) {
    console.warn('localStorage save failed:', e);
  }
};

// ==========================================
// ACCOUNTS
// ==========================================
export const getAccounts = async (userId: string): Promise<Account[]> => {
  const localKey = `accounts_${userId}`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'accounts'));
    if (!snap.empty) {
      const accounts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Account));
      setLocal(localKey, accounts);
      return accounts;
    } else {
      setLocal(localKey, []);
      return [];
    }
  } catch (e) {
    console.warn('Error reading accounts from Firestore, using local fallback:', e);
    return getLocal<Account[]>(localKey, []);
  }
};

export const createAccount = async (userId: string, data: Omit<Account, 'id'>): Promise<Account> => {
  const newId = 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newAccount: Account = { id: newId, ...data };

  // Optimistic local update
  const localKey = `accounts_${userId}`;
  const existing = getLocal<Account[]>(localKey, []);
  setLocal(localKey, [...existing, newAccount]);

  // Firestore sync
  try {
    await setDoc(doc(db, 'users', userId, 'accounts', newId), cleanForFirestore(newAccount));
    console.log('Account saved to Firestore:', newId);
  } catch (err) {
    console.warn('Account saved locally, Firestore error:', err);
  }

  return newAccount;
};

export const updateAccount = async (userId: string, accountId: string, data: Partial<Account>): Promise<void> => {
  const localKey = `accounts_${userId}`;
  const existing = getLocal<Account[]>(localKey, []);
  const updated = existing.map((a) => (a.id === accountId ? { ...a, ...data, updatedAt: new Date().toISOString() } : a));
  setLocal(localKey, updated);

  try {
    await updateDoc(doc(db, 'users', userId, 'accounts', accountId), cleanForFirestore({
      ...data,
      updatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Update account in Firestore failed:', err);
  }
};

export const deleteAccount = async (userId: string, accountId: string): Promise<void> => {
  const localKey = `accounts_${userId}`;
  const existing = getLocal<Account[]>(localKey, []);
  setLocal(localKey, existing.filter((a) => a.id !== accountId));

  try {
    await deleteDoc(doc(db, 'users', userId, 'accounts', accountId));
    console.log('Account deleted from Firestore:', accountId);
  } catch (err) {
    console.warn('Delete account from Firestore failed:', err);
  }
};

// ==========================================
// TRANSACTIONS
// ==========================================
export const getTransactions = async (userId: string): Promise<Transaction[]> => {
  const localKey = `transactions_${userId}`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'transactions'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Transaction));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLocal(localKey, list);
      return list;
    }
  } catch (e) {
    console.warn('Transactions read from Firestore fallback:', e);
  }

  return getLocal<Transaction[]>(localKey, []);
};

export const createTransaction = async (userId: string, data: Omit<Transaction, 'id'>): Promise<Transaction> => {
  const txId = 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const normalizedType = (data.type ? data.type.toLowerCase() : 'expense') as 'expense' | 'income' | 'transfer' | 'refund';
  
  const newTx: Transaction = {
    ...data,
    type: normalizedType,
    amount: Math.abs(Number(data.amount)) || 0,
    merchant: data.merchant ? data.merchant.trim() : undefined,
    notes: data.notes ? data.notes.trim() : undefined,
    description: data.description ? data.description.trim() : data.category,
    date: data.date || new Date().toISOString().split('T')[0],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
    id: txId,
  };

  // 1. Optimistic Transactions local update
  const txKey = `transactions_${userId}`;
  const existingTxs = getLocal<Transaction[]>(txKey, []);
  setLocal(txKey, [newTx, ...existingTxs]);

  // 2. Optimistic Accounts balance update
  const accKey = `accounts_${userId}`;
  const accounts = getLocal<Account[]>(accKey, []);
  let targetBalance: number | undefined;
  const updatedAccounts = accounts.map((acc) => {
    if (acc.id === data.accountId) {
      let diff = 0;
      if (normalizedType === 'expense') diff = -newTx.amount;
      else if (normalizedType === 'income' || normalizedType === 'refund') diff = newTx.amount;
      const newBal = (acc.currentBalance || 0) + diff;
      targetBalance = newBal;
      return { ...acc, currentBalance: newBal };
    }
    return acc;
  });
  setLocal(accKey, updatedAccounts);

  // 3. Firestore sync with cleaned payload (no undefined values)
  try {
    const cleanedPayload = cleanForFirestore(newTx);
    await setDoc(doc(db, 'users', userId, 'transactions', txId), cleanedPayload);
    
    if (targetBalance !== undefined) {
      await updateDoc(doc(db, 'users', userId, 'accounts', data.accountId), {
        currentBalance: targetBalance,
      });
    }
    console.log('Transaction saved to Firestore:', txId);
  } catch (err) {
    console.warn('Transaction stored locally (Firestore sync error):', err);
  }

  return newTx;
};

export const deleteTransaction = async (
  userId: string,
  transactionId: string,
  accountId: string,
  amount: number,
  type: string
): Promise<void> => {
  const txKey = `transactions_${userId}`;
  const existing = getLocal<Transaction[]>(txKey, []);
  setLocal(txKey, existing.filter((t) => t.id !== transactionId));

  const accKey = `accounts_${userId}`;
  const accounts = getLocal<Account[]>(accKey, []);
  const normType = type ? type.toLowerCase() : 'expense';
  let targetBalance: number | undefined;
  const updatedAccs = accounts.map((acc) => {
    if (acc.id === accountId) {
      let diff = 0;
      if (normType === 'expense') diff = amount;
      if (normType === 'income' || normType === 'refund') diff = -amount;
      const newBal = (acc.currentBalance || 0) + diff;
      targetBalance = newBal;
      return { ...acc, currentBalance: newBal };
    }
    return acc;
  });
  setLocal(accKey, updatedAccs);

  try {
    await deleteDoc(doc(db, 'users', userId, 'transactions', transactionId));
    if (targetBalance !== undefined) {
      await updateDoc(doc(db, 'users', userId, 'accounts', accountId), {
        currentBalance: targetBalance,
      });
    }
    console.log('Transaction deleted from Firestore:', transactionId);
  } catch (err) {
    console.warn('Delete transaction from Firestore failed:', err);
  }
};

// ==========================================
// BUDGETS
// ==========================================
export const getBudgets = async (userId: string): Promise<Budget[]> => {
  const key = `budgets_${userId}`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'budgets'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Budget));
      setLocal(key, list);
      return list;
    } else {
      setLocal(key, []);
      return [];
    }
  } catch (e) {
    console.warn('Budgets fallback:', e);
  }

  return getLocal<Budget[]>(key, []);
};

export const saveBudget = async (userId: string, budget: Omit<Budget, 'id'>): Promise<Budget> => {
  const bId = 'bdg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newBudget: Budget = { id: bId, ...budget };
  const key = `budgets_${userId}`;
  const existing = getLocal<Budget[]>(key, []);
  setLocal(key, [...existing, newBudget]);

  try {
    await setDoc(doc(db, 'users', userId, 'budgets', bId), cleanForFirestore(newBudget));
    console.log('Budget saved to Firestore:', bId);
  } catch (err) {
    console.warn('Save budget to Firestore failed:', err);
  }

  return newBudget;
};

export const deleteBudget = async (userId: string, budgetId: string): Promise<void> => {
  const key = `budgets_${userId}`;
  const existing = getLocal<Budget[]>(key, []);
  setLocal(key, existing.filter((b) => b.id !== budgetId));

  try {
    await deleteDoc(doc(db, 'users', userId, 'budgets', budgetId));
    console.log('Budget deleted from Firestore:', budgetId);
  } catch (err) {
    console.warn('Delete budget failed in Firestore:', err);
  }
};

// ==========================================
// SAVINGS GOALS
// ==========================================
export const getSavingsGoals = async (userId: string): Promise<SavingsGoal[]> => {
  const key = `goals_${userId}`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'goals'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavingsGoal));
      setLocal(key, list);
      return list;
    } else {
      setLocal(key, []);
      return [];
    }
  } catch (e) {
    console.warn('Savings goals fallback:', e);
  }

  return getLocal<SavingsGoal[]>(key, []);
};

export const createSavingsGoal = async (userId: string, goal: Omit<SavingsGoal, 'id'>): Promise<SavingsGoal> => {
  const gId = 'goal_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newGoal: SavingsGoal = { id: gId, ...goal };
  const key = `goals_${userId}`;
  const existing = getLocal<SavingsGoal[]>(key, []);
  setLocal(key, [...existing, newGoal]);

  try {
    await setDoc(doc(db, 'users', userId, 'goals', gId), cleanForFirestore(newGoal));
    console.log('Savings goal saved to Firestore:', gId);
  } catch (err) {
    console.warn('Save savings goal to Firestore failed:', err);
  }

  return newGoal;
};

export const updateGoalProgress = async (
  userId: string,
  goalId: string,
  amountToAdd: number,
  currentAmount: number
): Promise<void> => {
  const key = `goals_${userId}`;
  const existing = getLocal<SavingsGoal[]>(key, []);
  const updated = existing.map((g) => (g.id === goalId ? { ...g, currentAmount: currentAmount + amountToAdd } : g));
  setLocal(key, updated);

  try {
    await updateDoc(doc(db, 'users', userId, 'goals', goalId), cleanForFirestore({
      currentAmount: currentAmount + amountToAdd,
    }));
  } catch (err) {
    console.warn('Update goal in Firestore failed:', err);
  }
};

export const deleteSavingsGoal = async (userId: string, goalId: string): Promise<void> => {
  const key = `goals_${userId}`;
  const existing = getLocal<SavingsGoal[]>(key, []);
  setLocal(key, existing.filter((g) => g.id !== goalId));

  try {
    await deleteDoc(doc(db, 'users', userId, 'goals', goalId));
  } catch (err) {
    console.warn('Delete goal in Firestore failed:', err);
  }
};

// ==========================================
// BILLS & SUBSCRIPTIONS
// ==========================================
export const getBills = async (userId: string): Promise<Bill[]> => {
  const key = `bills_${userId}`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'bills'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bill));
      setLocal(key, list);
      return list;
    } else {
      setLocal(key, []);
      return [];
    }
  } catch (e) {
    console.warn('Bills fallback:', e);
  }

  return getLocal<Bill[]>(key, []);
};

export const createBill = async (userId: string, bill: Omit<Bill, 'id'>): Promise<Bill> => {
  const bId = 'bill_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newBill: Bill = { id: bId, ...bill };
  const key = `bills_${userId}`;
  const existing = getLocal<Bill[]>(key, []);
  setLocal(key, [...existing, newBill]);

  try {
    await setDoc(doc(db, 'users', userId, 'bills', bId), cleanForFirestore(newBill));
    console.log('Bill saved to Firestore:', bId);
  } catch (err) {
    console.warn('Save bill to Firestore failed:', err);
  }

  return newBill;
};

export const markBillAsPaid = async (userId: string, billId: string): Promise<void> => {
  const key = `bills_${userId}`;
  const existing = getLocal<Bill[]>(key, []);
  setLocal(
    key,
    existing.map((b) => (b.id === billId ? { ...b, status: 'paid' as const } : b))
  );

  try {
    await updateDoc(doc(db, 'users', userId, 'bills', billId), { status: 'paid' });
  } catch (err) {
    console.warn('Mark bill as paid in Firestore failed:', err);
  }
};

export const deleteBill = async (userId: string, billId: string): Promise<void> => {
  const key = `bills_${userId}`;
  const existing = getLocal<Bill[]>(key, []);
  setLocal(key, existing.filter((b) => b.id !== billId));

  try {
    await deleteDoc(doc(db, 'users', userId, 'bills', billId));
  } catch (err) {
    console.warn('Delete bill from Firestore failed:', err);
  }
};

export const getSubscriptions = async (userId: string): Promise<Subscription[]> => {
  const key = `subscriptions_${userId}`;
  try {
    const snap = await getDocs(collection(db, 'users', userId, 'subscriptions'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Subscription));
      setLocal(key, list);
      return list;
    } else {
      setLocal(key, []);
      return [];
    }
  } catch (e) {
    console.warn('Subscriptions fallback:', e);
  }

  return getLocal<Subscription[]>(key, []);
};

export const createSubscription = async (userId: string, sub: Omit<Subscription, 'id'>): Promise<Subscription> => {
  const sId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newSub: Subscription = { id: sId, ...sub };
  const key = `subscriptions_${userId}`;
  const existing = getLocal<Subscription[]>(key, []);
  setLocal(key, [...existing, newSub]);

  try {
    await setDoc(doc(db, 'users', userId, 'subscriptions', sId), cleanForFirestore(newSub));
    console.log('Subscription saved to Firestore:', sId);
  } catch (err) {
    console.warn('Save subscription to Firestore failed:', err);
  }

  return newSub;
};

export const deleteSubscription = async (userId: string, subId: string): Promise<void> => {
  const key = `subscriptions_${userId}`;
  const existing = getLocal<Subscription[]>(key, []);
  setLocal(key, existing.filter((s) => s.id !== subId));

  try {
    await deleteDoc(doc(db, 'users', userId, 'subscriptions', subId));
  } catch (err) {
    console.warn('Delete subscription from Firestore failed:', err);
  }
};

// ==========================================
// SHARED FINANCE / GROUPS
// ==========================================
export const getGroupsForUser = async (userId: string): Promise<Group[]> => {
  const key = `groups_${userId}`;
  try {
    const snap = await getDocs(collection(db, 'groups'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
      setLocal(key, list);
      return list;
    } else {
      setLocal(key, []);
      return [];
    }
  } catch (e) {
    console.warn('Groups fallback:', e);
  }

  return getLocal<Group[]>(key, []);
};

export const createGroup = async (
  userId: string,
  userName: string,
  userEmail: string,
  groupData: { name: string; description?: string; currency: any; imageUrl?: string }
): Promise<Group> => {
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const groupId = 'grp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newGroup: Group = {
    id: groupId,
    name: groupData.name,
    description: groupData.description || '',
    currency: groupData.currency || 'INR',
    imageUrl: groupData.imageUrl || '',
    ownerId: userId,
    inviteCode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Optimistic Groups list update
  const key = `groups_${userId}`;
  const existing = getLocal<Group[]>(key, []);
  setLocal(key, [newGroup, ...existing]);

  // 2. Set default creator as member
  const memberKey = `group_members_${groupId}`;
  const ownerMember: GroupMember = {
    id: userId,
    userId,
    name: userName || 'Host',
    email: userEmail,
    role: 'owner',
    joinedAt: new Date().toISOString(),
  };
  setLocal(memberKey, [ownerMember]);
  setLocal(`group_expenses_${groupId}`, []);
  setLocal(`group_settlements_${groupId}`, []);

  // 3. Firestore sync
  try {
    await setDoc(doc(db, 'groups', groupId), cleanForFirestore(newGroup));
    await setDoc(doc(db, 'groups', groupId, 'members', userId), cleanForFirestore(ownerMember));
    console.log('Group created in Firestore:', groupId);
  } catch (e) {
    console.warn('Group saved locally (Firestore error):', e);
  }

  return newGroup;
};

export const deleteGroup = async (userId: string, groupId: string): Promise<void> => {
  const key = `groups_${userId}`;
  const existing = getLocal<Group[]>(key, []);
  setLocal(key, existing.filter((g) => g.id !== groupId));

  try {
    await deleteDoc(doc(db, 'groups', groupId));
    console.log('Group deleted from Firestore:', groupId);
  } catch (e) {
    console.warn('Delete group from Firestore failed:', e);
  }
};

export const joinGroupByInviteCode = async (
  userId: string,
  userName: string,
  userEmail: string,
  inviteCode: string
): Promise<Group | null> => {
  const code = inviteCode.trim().toUpperCase();

  const key = `groups_${userId}`;
  const existingGroups = getLocal<Group[]>(key, []);
  let found = existingGroups.find((g) => g.inviteCode === code);

  if (found) {
    if (!existingGroups.some((g) => g.id === found!.id)) {
      setLocal(key, [found, ...existingGroups]);
    }
    const memKey = `group_members_${found.id}`;
    const members = getLocal<GroupMember[]>(memKey, []);
    if (!members.some((m) => m.userId === userId)) {
      const newM: GroupMember = {
        id: userId,
        userId,
        name: userName,
        email: userEmail,
        role: 'member',
        joinedAt: new Date().toISOString(),
      };
      setLocal(memKey, [...members, newM]);
      setDoc(doc(db, 'groups', found.id, 'members', userId), cleanForFirestore(newM)).catch(() => {});
    }
    return found;
  }

  try {
    const q = query(collection(db, 'groups'), where('inviteCode', '==', code));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0];
      const g = { id: docData.id, ...docData.data() } as Group;
      setLocal(key, [g, ...existingGroups]);
      const newM: GroupMember = {
        id: userId,
        userId,
        name: userName,
        email: userEmail,
        role: 'member',
        joinedAt: new Date().toISOString(),
      };
      setDoc(doc(db, 'groups', g.id, 'members', userId), cleanForFirestore(newM)).catch(() => {});
      return g;
    }
  } catch (e) {
    console.warn('Join group Firestore query failed:', e);
  }

  return null;
};

export const getGroupMembers = async (groupId: string): Promise<GroupMember[]> => {
  const key = `group_members_${groupId}`;
  try {
    const snap = await getDocs(collection(db, 'groups', groupId, 'members'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupMember));
      setLocal(key, list);
      return list;
    }
  } catch (e) {}

  return getLocal<GroupMember[]>(key, []);
};

export const getGroupExpenses = async (groupId: string): Promise<GroupExpense[]> => {
  const key = `group_expenses_${groupId}`;
  try {
    const snap = await getDocs(collection(db, 'groups', groupId, 'expenses'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupExpense));
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setLocal(key, list);
      return list;
    }
  } catch (e) {}

  return getLocal<GroupExpense[]>(key, []);
};

export const createGroupExpense = async (groupId: string, data: Omit<GroupExpense, 'id'>): Promise<GroupExpense> => {
  const expenseId = 'gexp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newExp: GroupExpense = { id: expenseId, ...data };

  const key = `group_expenses_${groupId}`;
  const existing = getLocal<GroupExpense[]>(key, []);
  setLocal(key, [newExp, ...existing]);

  try {
    await setDoc(doc(db, 'groups', groupId, 'expenses', expenseId), cleanForFirestore(newExp));
    console.log('Group expense saved to Firestore:', expenseId);
  } catch (err) {
    console.warn('Save group expense to Firestore failed:', err);
  }

  return newExp;
};

export const deleteGroupExpense = async (groupId: string, expenseId: string): Promise<void> => {
  const key = `group_expenses_${groupId}`;
  const existing = getLocal<GroupExpense[]>(key, []);
  setLocal(key, existing.filter((e) => e.id !== expenseId));

  try {
    await deleteDoc(doc(db, 'groups', groupId, 'expenses', expenseId));
    console.log('Group expense deleted from Firestore:', expenseId);
  } catch (err) {
    console.warn('Delete group expense failed in Firestore:', err);
  }
};

export const getGroupSettlements = async (groupId: string): Promise<GroupSettlement[]> => {
  const key = `group_settlements_${groupId}`;
  try {
    const snap = await getDocs(collection(db, 'groups', groupId, 'settlements'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupSettlement));
      setLocal(key, list);
      return list;
    }
  } catch (e) {}

  return getLocal<GroupSettlement[]>(key, []);
};

export const createGroupSettlement = async (
  groupId: string,
  data: Omit<GroupSettlement, 'id'>
): Promise<GroupSettlement> => {
  const settlementId = 'stl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newSettle: GroupSettlement = { id: settlementId, ...data };

  const key = `group_settlements_${groupId}`;
  const existing = getLocal<GroupSettlement[]>(key, []);
  setLocal(key, [newSettle, ...existing]);

  try {
    await setDoc(doc(db, 'groups', groupId, 'settlements', settlementId), cleanForFirestore(newSettle));
    console.log('Group settlement saved to Firestore:', settlementId);
  } catch (err) {
    console.warn('Save group settlement failed in Firestore:', err);
  }

  return newSettle;
};

export const deleteGroupSettlement = async (groupId: string, settlementId: string): Promise<void> => {
  const key = `group_settlements_${groupId}`;
  const existing = getLocal<GroupSettlement[]>(key, []);
  setLocal(key, existing.filter((s) => s.id !== settlementId));

  try {
    await deleteDoc(doc(db, 'groups', groupId, 'settlements', settlementId));
    console.log('Group settlement deleted from Firestore:', settlementId);
  } catch (err) {
    console.warn('Delete group settlement failed in Firestore:', err);
  }
};

export const removeGroupMember = async (groupId: string, memberId: string): Promise<void> => {
  const key = `group_members_${groupId}`;
  const existing = getLocal<GroupMember[]>(key, []);
  setLocal(key, existing.filter((m) => m.id !== memberId && m.userId !== memberId));

  try {
    await deleteDoc(doc(db, 'groups', groupId, 'members', memberId));
    console.log('Member removed from Firestore:', memberId);
  } catch (err) {
    console.warn('Remove member failed in Firestore:', err);
  }
};

export const getGroupActivities = async (groupId: string): Promise<GroupActivity[]> => {
  try {
    const snap = await getDocs(collection(db, 'groups', groupId, 'activities'));
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupActivity));
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch {
    return [];
  }
};

// ==========================================
// AUDIT LOGGING
// ==========================================
export const createAuditLog = async (log: Omit<AuditLog, 'id'>): Promise<void> => {
  const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  try {
    await setDoc(doc(db, 'auditLogs', logId), cleanForFirestore({ id: logId, ...log }));
  } catch {}
};
