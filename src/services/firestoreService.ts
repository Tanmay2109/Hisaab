import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  setDoc,
  documentId,
} from "firebase/firestore";

import { db } from "../config/firebase";

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
} from "../types";

/* =========================================================
   GENERAL HELPERS
========================================================= */

export const cleanForFirestore = <T extends Record<string, any>>(obj: T): T => {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) =>
        typeof item === "object" && item !== null
          ? cleanForFirestore(item)
          : item,
      ) as any;
  }

  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }

    if (
      value !== null &&
      typeof value === "object" &&
      !(value instanceof Date)
    ) {
      cleaned[key] = cleanForFirestore(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned as T;
};

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
    console.warn("localStorage save failed:", e);
  }
};

const generateId = (prefix: string): string => {
  return (
    `${prefix}_${Date.now()}_` + Math.random().toString(36).substring(2, 8)
  );
};

/* =========================================================
   ACCOUNTS
========================================================= */

export const getAccounts = async (userId: string): Promise<Account[]> => {
  const localKey = `accounts_${userId}`;

  try {
    const snap = await getDocs(collection(db, "users", userId, "accounts"));

    const accounts = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Account,
    );

    setLocal(localKey, accounts);
    return accounts;
  } catch (e) {
    console.warn("Error reading accounts from Firestore:", e);

    return getLocal<Account[]>(localKey, []);
  }
};

export const createAccount = async (
  userId: string,
  data: Omit<Account, "id">,
): Promise<Account> => {
  const newId = generateId("acc");

  const newAccount: Account = {
    id: newId,
    ...data,
  };

  const localKey = `accounts_${userId}`;

  const existing = getLocal<Account[]>(localKey, []);

  setLocal(localKey, [...existing, newAccount]);

  await setDoc(
    doc(db, "users", userId, "accounts", newId),
    cleanForFirestore(newAccount),
  );

  return newAccount;
};

export const updateAccount = async (
  userId: string,
  accountId: string,
  data: Partial<Account>,
): Promise<void> => {
  const localKey = `accounts_${userId}`;

  const existing = getLocal<Account[]>(localKey, []);

  const updated = existing.map((account) =>
    account.id === accountId
      ? {
          ...account,
          ...data,
          updatedAt: new Date().toISOString(),
        }
      : account,
  );

  setLocal(localKey, updated);

  await updateDoc(
    doc(db, "users", userId, "accounts", accountId),
    cleanForFirestore({
      ...data,
      updatedAt: new Date().toISOString(),
    }),
  );
};

export const deleteAccount = async (
  userId: string,
  accountId: string,
): Promise<void> => {
  const localKey = `accounts_${userId}`;

  const existing = getLocal<Account[]>(localKey, []);

  setLocal(
    localKey,
    existing.filter((account) => account.id !== accountId),
  );

  await deleteDoc(doc(db, "users", userId, "accounts", accountId));
};

/* =========================================================
   TRANSACTIONS
========================================================= */

export const getTransactions = async (
  userId: string,
): Promise<Transaction[]> => {
  const localKey = `transactions_${userId}`;

  try {
    const snap = await getDocs(collection(db, "users", userId, "transactions"));

    const list = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as Transaction,
    );

    list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    setLocal(localKey, list);

    return list;
  } catch (e) {
    console.warn("Transactions Firestore read failed:", e);

    return getLocal<Transaction[]>(localKey, []);
  }
};

export const createTransaction = async (
  userId: string,
  data: Omit<Transaction, "id">,
): Promise<Transaction> => {
  const txId = generateId("tx");

  const normalizedType = (data.type ? data.type.toLowerCase() : "expense") as
    | "expense"
    | "income"
    | "transfer"
    | "refund";

  const newTx: Transaction = {
    ...data,
    id: txId,
    type: normalizedType,
    amount: Math.abs(Number(data.amount)) || 0,
    merchant: data.merchant ? data.merchant.trim() : undefined,
    notes: data.notes ? data.notes.trim() : undefined,
    description: data.description?.trim() || data.category,
    date: data.date || new Date().toISOString().split("T")[0],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };

  const txKey = `transactions_${userId}`;

  const existingTxs = getLocal<Transaction[]>(txKey, []);

  setLocal(txKey, [newTx, ...existingTxs]);

  const accKey = `accounts_${userId}`;

  const accounts = getLocal<Account[]>(accKey, []);

  let targetBalance: number | undefined;

  const updatedAccounts = accounts.map((account) => {
    if (account.id !== data.accountId) {
      return account;
    }

    let diff = 0;

    if (normalizedType === "expense") {
      diff = -newTx.amount;
    } else if (normalizedType === "income" || normalizedType === "refund") {
      diff = newTx.amount;
    }

    const newBalance = (account.currentBalance || 0) + diff;

    targetBalance = newBalance;

    return {
      ...account,
      currentBalance: newBalance,
    };
  });

  setLocal(accKey, updatedAccounts);

  await setDoc(
    doc(db, "users", userId, "transactions", txId),
    cleanForFirestore(newTx),
  );

  if (targetBalance !== undefined && data.accountId) {
    await updateDoc(doc(db, "users", userId, "accounts", data.accountId), {
      currentBalance: targetBalance,
    });
  }

  return newTx;
};

export const deleteTransaction = async (
  userId: string,
  transactionId: string,
  accountId: string,
  amount: number,
  type: string,
): Promise<void> => {
  const txKey = `transactions_${userId}`;

  const existing = getLocal<Transaction[]>(txKey, []);

  setLocal(
    txKey,
    existing.filter((transaction) => transaction.id !== transactionId),
  );

  const accKey = `accounts_${userId}`;

  const accounts = getLocal<Account[]>(accKey, []);

  const normalizedType = type?.toLowerCase() || "expense";

  let targetBalance: number | undefined;

  const updatedAccounts = accounts.map((account) => {
    if (account.id !== accountId) {
      return account;
    }

    let diff = 0;

    if (normalizedType === "expense") {
      diff = amount;
    }

    if (normalizedType === "income" || normalizedType === "refund") {
      diff = -amount;
    }

    const newBalance = (account.currentBalance || 0) + diff;

    targetBalance = newBalance;

    return {
      ...account,
      currentBalance: newBalance,
    };
  });

  setLocal(accKey, updatedAccounts);

  await deleteDoc(doc(db, "users", userId, "transactions", transactionId));

  if (targetBalance !== undefined) {
    await updateDoc(doc(db, "users", userId, "accounts", accountId), {
      currentBalance: targetBalance,
    });
  }
};

/* =========================================================
   BUDGETS
========================================================= */

export const getBudgets = async (userId: string): Promise<Budget[]> => {
  const key = `budgets_${userId}`;

  try {
    const snap = await getDocs(collection(db, "users", userId, "budgets"));

    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Budget);

    setLocal(key, list);

    return list;
  } catch (e) {
    console.warn("Budgets Firestore read failed:", e);

    return getLocal<Budget[]>(key, []);
  }
};

export const saveBudget = async (
  userId: string,
  budget: Omit<Budget, "id">,
): Promise<Budget> => {
  const id = generateId("bdg");

  const newBudget: Budget = {
    id,
    ...budget,
  };

  const key = `budgets_${userId}`;

  const existing = getLocal<Budget[]>(key, []);

  setLocal(key, [...existing, newBudget]);

  await setDoc(
    doc(db, "users", userId, "budgets", id),
    cleanForFirestore(newBudget),
  );

  return newBudget;
};

export const deleteBudget = async (
  userId: string,
  budgetId: string,
): Promise<void> => {
  const key = `budgets_${userId}`;

  const existing = getLocal<Budget[]>(key, []);

  setLocal(
    key,
    existing.filter((budget) => budget.id !== budgetId),
  );

  await deleteDoc(doc(db, "users", userId, "budgets", budgetId));
};

/* =========================================================
   SAVINGS GOALS
========================================================= */

export const getSavingsGoals = async (
  userId: string,
): Promise<SavingsGoal[]> => {
  const key = `goals_${userId}`;

  try {
    const snap = await getDocs(collection(db, "users", userId, "goals"));

    const list = snap.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as SavingsGoal,
    );

    setLocal(key, list);

    return list;
  } catch (e) {
    console.warn("Savings goals read failed:", e);

    return getLocal<SavingsGoal[]>(key, []);
  }
};

export const createSavingsGoal = async (
  userId: string,
  goal: Omit<SavingsGoal, "id">,
): Promise<SavingsGoal> => {
  const id = generateId("goal");

  const newGoal: SavingsGoal = {
    id,
    ...goal,
  };

  const key = `goals_${userId}`;

  const existing = getLocal<SavingsGoal[]>(key, []);

  setLocal(key, [...existing, newGoal]);

  await setDoc(
    doc(db, "users", userId, "goals", id),
    cleanForFirestore(newGoal),
  );

  return newGoal;
};

export const updateGoalProgress = async (
  userId: string,
  goalId: string,
  amountToAdd: number,
  currentAmount: number,
): Promise<void> => {
  const newAmount = currentAmount + amountToAdd;

  const key = `goals_${userId}`;

  const existing = getLocal<SavingsGoal[]>(key, []);

  setLocal(
    key,
    existing.map((goal) =>
      goal.id === goalId
        ? {
            ...goal,
            currentAmount: newAmount,
          }
        : goal,
    ),
  );

  await updateDoc(doc(db, "users", userId, "goals", goalId), {
    currentAmount: newAmount,
  });
};

export const deleteSavingsGoal = async (
  userId: string,
  goalId: string,
): Promise<void> => {
  const key = `goals_${userId}`;

  const existing = getLocal<SavingsGoal[]>(key, []);

  setLocal(
    key,
    existing.filter((goal) => goal.id !== goalId),
  );

  await deleteDoc(doc(db, "users", userId, "goals", goalId));
};

/* =========================================================
   BILLS
========================================================= */

export const getBills = async (userId: string): Promise<Bill[]> => {
  const key = `bills_${userId}`;

  try {
    const snap = await getDocs(collection(db, "users", userId, "bills"));

    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Bill);

    setLocal(key, list);

    return list;
  } catch (e) {
    console.warn("Bills read failed:", e);

    return getLocal<Bill[]>(key, []);
  }
};

export const createBill = async (
  userId: string,
  bill: Omit<Bill, "id">,
): Promise<Bill> => {
  const id = generateId("bill");

  const newBill: Bill = {
    id,
    ...bill,
  };

  const key = `bills_${userId}`;

  const existing = getLocal<Bill[]>(key, []);

  setLocal(key, [...existing, newBill]);

  await setDoc(
    doc(db, "users", userId, "bills", id),
    cleanForFirestore(newBill),
  );

  return newBill;
};

export const markBillAsPaid = async (
  userId: string,
  billId: string,
): Promise<void> => {
  const key = `bills_${userId}`;

  const existing = getLocal<Bill[]>(key, []);

  setLocal(
    key,
    existing.map((bill) =>
      bill.id === billId
        ? {
            ...bill,
            status: "paid" as const,
          }
        : bill,
    ),
  );

  await updateDoc(doc(db, "users", userId, "bills", billId), {
    status: "paid",
  });
};

export const deleteBill = async (
  userId: string,
  billId: string,
): Promise<void> => {
  const key = `bills_${userId}`;

  const existing = getLocal<Bill[]>(key, []);

  setLocal(
    key,
    existing.filter((bill) => bill.id !== billId),
  );

  await deleteDoc(doc(db, "users", userId, "bills", billId));
};

/* =========================================================
   SUBSCRIPTIONS
========================================================= */

export const getSubscriptions = async (
  userId: string,
): Promise<Subscription[]> => {
  const key = `subscriptions_${userId}`;

  try {
    const snap = await getDocs(
      collection(db, "users", userId, "subscriptions"),
    );

    const list = snap.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as Subscription,
    );

    setLocal(key, list);

    return list;
  } catch (e) {
    console.warn("Subscriptions read failed:", e);

    return getLocal<Subscription[]>(key, []);
  }
};

export const createSubscription = async (
  userId: string,
  sub: Omit<Subscription, "id">,
): Promise<Subscription> => {
  const id = generateId("sub");

  const newSub: Subscription = {
    id,
    ...sub,
  };

  const key = `subscriptions_${userId}`;

  const existing = getLocal<Subscription[]>(key, []);

  setLocal(key, [...existing, newSub]);

  await setDoc(
    doc(db, "users", userId, "subscriptions", id),
    cleanForFirestore(newSub),
  );

  return newSub;
};

export const deleteSubscription = async (
  userId: string,
  subId: string,
): Promise<void> => {
  const key = `subscriptions_${userId}`;

  const existing = getLocal<Subscription[]>(key, []);

  setLocal(
    key,
    existing.filter((sub) => sub.id !== subId),
  );

  await deleteDoc(doc(db, "users", userId, "subscriptions", subId));
};

/* =========================================================
   GROUPS
========================================================= */

/**
 * IMPORTANT:
 *
 * We DO NOT do:
 *
 * getDocs(collection(db, 'groups'))
 *
 * because that exposes every group.
 *
 * Instead:
 * 1. Find groups where current user is owner.
 * 2. Find membership documents belonging to current user.
 * 3. Fetch only those group documents.
 */

export const getGroupsForUser = async (userId: string): Promise<Group[]> => {
  const key = `groups_${userId}`;

  try {
    const groupIds = new Set<string>();

    /* -----------------------------------------
       OWNER GROUPS
    ----------------------------------------- */

    const ownerQuery = query(
      collection(db, "groups"),
      where("ownerId", "==", userId),
    );

    const ownerSnap = await getDocs(ownerQuery);

    ownerSnap.forEach((groupDoc) => {
      groupIds.add(groupDoc.id);
    });

    /* -----------------------------------------
       MEMBER GROUPS
    ----------------------------------------- */

    const memberQuery = query(
      collectionGroup(db, "members"),
      where(documentId(), "==", userId),
    );

    const memberSnap = await getDocs(memberQuery);

    memberSnap.forEach((memberDoc) => {
      const parentGroup = memberDoc.ref.parent.parent;

      if (parentGroup) {
        groupIds.add(parentGroup.id);
      }
    });

    /* -----------------------------------------
       FETCH GROUP DOCUMENTS
    ----------------------------------------- */

    const groups: Group[] = [];

    for (const groupId of groupIds) {
      const groupSnap = await getDoc(doc(db, "groups", groupId));

      if (groupSnap.exists()) {
        groups.push({
          id: groupSnap.id,
          ...groupSnap.data(),
        } as Group);
      }
    }

    groups.sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() -
        new Date(a.createdAt || 0).getTime(),
    );

    setLocal(key, groups);

    return groups;
  } catch (error) {
    console.error("Failed to load user groups:", error);

    return getLocal<Group[]>(key, []);
  }
};

/* =========================================================
   CREATE GROUP
========================================================= */

export const createGroup = async (
  userId: string,
  userName: string,
  userEmail: string,
  groupData: {
    name: string;
    description?: string;
    currency: any;
    imageUrl?: string;
  },
): Promise<Group> => {
  const groupId = generateId("grp");

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const now = new Date().toISOString();

  const newGroup: Group = {
    id: groupId,
    name: groupData.name.trim(),
    description: groupData.description?.trim() || "",
    currency: groupData.currency || "INR",
    imageUrl: groupData.imageUrl || "",
    ownerId: userId,
    inviteCode,
    createdAt: now,
    updatedAt: now,
  };

  const ownerMember: GroupMember = {
    id: userId,
    userId,
    name: userName || "Host",
    email: userEmail || "",
    role: "owner",
    joinedAt: now,
  };

  /* Local cache */

  const groupKey = `groups_${userId}`;

  const existing = getLocal<Group[]>(groupKey, []);

  setLocal(groupKey, [newGroup, ...existing]);

  setLocal(`group_members_${groupId}`, [ownerMember]);

  setLocal(`group_expenses_${groupId}`, []);

  setLocal(`group_settlements_${groupId}`, []);

  /* Firestore */

  await setDoc(doc(db, "groups", groupId), cleanForFirestore(newGroup));

  await setDoc(
    doc(db, "groups", groupId, "members", userId),
    cleanForFirestore(ownerMember),
  );

  return newGroup;
};

/* =========================================================
   JOIN GROUP BY INVITE CODE
========================================================= */

/**
 * IMPORTANT:
 *
 * A non-member should NOT be allowed to read every group
 * just to find an invite code.
 *
 * Therefore invite codes are stored in:
 *
 * inviteCodes/{CODE}
 *
 * Example:
 *
 * inviteCodes/15HW7N
 * {
 *   groupId: "grp_xxx"
 * }
 *
 * This allows a user to resolve an invite code without
 * exposing all groups.
 */

export const joinGroupByInviteCode = async (
  userId: string,
  userName: string,
  userEmail: string,
  inviteCode: string,
): Promise<Group | null> => {
  const code = inviteCode.trim().toUpperCase();

  if (!code) {
    return null;
  }

  try {
    const inviteSnap = await getDoc(doc(db, "inviteCodes", code));

    if (!inviteSnap.exists()) {
      return null;
    }

    const inviteData = inviteSnap.data();

    const groupId = inviteData.groupId;

    if (!groupId) {
      return null;
    }

    const groupSnap = await getDoc(doc(db, "groups", groupId));

    if (!groupSnap.exists()) {
      return null;
    }

    const group = {
      id: groupSnap.id,
      ...groupSnap.data(),
    } as Group;

    const member: GroupMember = {
      id: userId,
      userId,
      name: userName || "User",
      email: userEmail || "",
      role: "member",
      joinedAt: new Date().toISOString(),
    };

    await setDoc(
      doc(db, "groups", groupId, "members", userId),
      cleanForFirestore(member),
    );

    const key = `groups_${userId}`;

    const existing = getLocal<Group[]>(key, []);

    if (!existing.some((g) => g.id === groupId)) {
      setLocal(key, [group, ...existing]);
    }

    return group;
  } catch (error) {
    console.error("Join group failed:", error);

    return null;
  }
};

/* =========================================================
   DELETE GROUP
========================================================= */

export const deleteGroup = async (
  userId: string,
  groupId: string,
): Promise<void> => {
  const key = `groups_${userId}`;

  const existing = getLocal<Group[]>(key, []);

  setLocal(
    key,
    existing.filter((group) => group.id !== groupId),
  );

  const groupSnap = await getDoc(doc(db, "groups", groupId));

  if (!groupSnap.exists()) {
    return;
  }

  const group = groupSnap.data() as Group;

  if (group.ownerId !== userId) {
    throw new Error("Only the group owner can delete this group.");
  }

  await deleteDoc(doc(db, "groups", groupId));

  if (group.inviteCode) {
    await deleteDoc(doc(db, "inviteCodes", group.inviteCode)).catch(() => {});
  }
};

/* =========================================================
   GROUP MEMBERS
========================================================= */

export const getGroupMembers = async (
  groupId: string,
): Promise<GroupMember[]> => {
  const key = `group_members_${groupId}`;

  try {
    const snap = await getDocs(collection(db, "groups", groupId, "members"));

    const list = snap.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as GroupMember,
    );

    setLocal(key, list);

    return list;
  } catch (error) {
    console.warn("Group members read failed:", error);

    return getLocal<GroupMember[]>(key, []);
  }
};

/* =========================================================
   REMOVE GROUP MEMBER
========================================================= */

export const removeGroupMember = async (
  groupId: string,
  memberId: string,
): Promise<void> => {
  await deleteDoc(doc(db, "groups", groupId, "members", memberId));

  const key = `group_members_${groupId}`;

  const existing = getLocal<GroupMember[]>(key, []);

  setLocal(
    key,
    existing.filter(
      (member) => member.userId !== memberId && member.id !== memberId,
    ),
  );
};

/* =========================================================
   GROUP EXPENSES
========================================================= */

export const getGroupExpenses = async (
  groupId: string,
): Promise<GroupExpense[]> => {
  const key = `group_expenses_${groupId}`;

  try {
    const snap = await getDocs(collection(db, "groups", groupId, "expenses"));

    const list = snap.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as GroupExpense,
    );

    list.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    setLocal(key, list);

    return list;
  } catch (error) {
    console.warn("Group expenses read failed:", error);

    return getLocal<GroupExpense[]>(key, []);
  }
};

export const createGroupExpense = async (
  groupId: string,
  data: Omit<GroupExpense, "id">,
): Promise<GroupExpense> => {
  const expenseId = generateId("gexp");

  const newExpense: GroupExpense = {
    id: expenseId,
    ...data,
  };

  const key = `group_expenses_${groupId}`;

  const existing = getLocal<GroupExpense[]>(key, []);

  setLocal(key, [newExpense, ...existing]);

  await setDoc(
    doc(db, "groups", groupId, "expenses", expenseId),
    cleanForFirestore(newExpense),
  );

  return newExpense;
};

export const deleteGroupExpense = async (
  groupId: string,
  expenseId: string,
): Promise<void> => {
  await deleteDoc(doc(db, "groups", groupId, "expenses", expenseId));

  const key = `group_expenses_${groupId}`;

  const existing = getLocal<GroupExpense[]>(key, []);

  setLocal(
    key,
    existing.filter((expense) => expense.id !== expenseId),
  );
};

/* =========================================================
   GROUP SETTLEMENTS
========================================================= */

export const getGroupSettlements = async (
  groupId: string,
): Promise<GroupSettlement[]> => {
  const key = `group_settlements_${groupId}`;

  try {
    const snap = await getDocs(
      collection(db, "groups", groupId, "settlements"),
    );

    const list = snap.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as GroupSettlement,
    );

    setLocal(key, list);

    return list;
  } catch (error) {
    console.warn("Group settlements read failed:", error);

    return getLocal<GroupSettlement[]>(key, []);
  }
};

export const createGroupSettlement = async (
  groupId: string,
  data: Omit<GroupSettlement, "id">,
): Promise<GroupSettlement> => {
  const settlementId = generateId("stl");

  const newSettlement: GroupSettlement = {
    id: settlementId,
    ...data,
  };

  const key = `group_settlements_${groupId}`;

  const existing = getLocal<GroupSettlement[]>(key, []);

  setLocal(key, [newSettlement, ...existing]);

  await setDoc(
    doc(db, "groups", groupId, "settlements", settlementId),
    cleanForFirestore(newSettlement),
  );

  return newSettlement;
};

export const deleteGroupSettlement = async (
  groupId: string,
  settlementId: string,
): Promise<void> => {
  await deleteDoc(doc(db, "groups", groupId, "settlements", settlementId));

  const key = `group_settlements_${groupId}`;

  const existing = getLocal<GroupSettlement[]>(key, []);

  setLocal(
    key,
    existing.filter((settlement) => settlement.id !== settlementId),
  );
};

/* =========================================================
   GROUP ACTIVITIES
========================================================= */

export const getGroupActivities = async (
  groupId: string,
): Promise<GroupActivity[]> => {
  try {
    const snap = await getDocs(collection(db, "groups", groupId, "activities"));

    const list = snap.docs.map(
      (d) =>
        ({
          id: d.id,
          ...d.data(),
        }) as GroupActivity,
    );

    return list.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  } catch (error) {
    console.warn("Group activities read failed:", error);

    return [];
  }
};

/* =========================================================
   AUDIT LOGS
========================================================= */

export const createAuditLog = async (
  log: Omit<AuditLog, "id">,
): Promise<void> => {
  const logId = generateId("log");

  try {
    await setDoc(
      doc(db, "auditLogs", logId),
      cleanForFirestore({
        id: logId,
        ...log,
      }),
    );
  } catch (error) {
    console.warn("Audit log creation failed:", error);
  }
};
