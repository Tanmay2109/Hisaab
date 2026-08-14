import React, { useState, useEffect } from 'react';
import { Users, Plus, UserPlus, ArrowRightLeft, DollarSign, Calendar, Sparkles, Send, CheckCircle, X, Trash2, UserMinus } from 'lucide-react';
import { Group, GroupExpense, GroupMember, GroupSettlement } from '../../types';
import { DEFAULT_CATEGORIES, formatCurrency, formatDate } from '../../lib/utils';
import {
  createGroup,
  createGroupExpense,
  createGroupSettlement,
  deleteGroup,
  deleteGroupExpense,
  deleteGroupSettlement,
  getGroupExpenses,
  getGroupMembers,
  getGroupSettlements,
  joinGroupByInviteCode,
  removeGroupMember,
} from '../../services/firestoreService';
import { aiApiService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface GroupsViewProps {
  groups: Group[];
  onRefreshGroups: () => Promise<void>;
  onDeleteGroup?: (groupId: string) => Promise<void>;
}

export const GroupsView: React.FC<GroupsViewProps> = ({ groups, onRefreshGroups, onDeleteGroup }) => {
  const { userProfile, user } = useAuth();
  const currency = userProfile?.preferredCurrency || 'INR';

  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [settlements, setSettlements] = useState<GroupSettlement[]>([]);
  const [loadingGroupData, setLoadingGroupData] = useState(false);

  // Modals
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);

  // AI Group Assistant State
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Forms
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  // Expense Form
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('Food & Dining');
  const [paidByUserId, setPaidByUserId] = useState(user?.uid || '');
  const [submittingExp, setSubmittingExp] = useState(false);

  // Settlement Form
  const [receiverId, setReceiverId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [submittingSettle, setSubmittingSettle] = useState(false);

  // Action feedback
  const [deletingExpId, setDeletingExpId] = useState<string | null>(null);
  const [deletingSettleId, setDeletingSettleId] = useState<string | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);

  const selectedGroup = groups.find((g) => g.id === selectedGroupId) || groups[0];

  useEffect(() => {
    if (selectedGroup) {
      loadGroupDetails(selectedGroup.id);
    }
  }, [selectedGroupId, groups]);

  const loadGroupDetails = async (gId: string) => {
    setLoadingGroupData(true);
    try {
      const [mList, eList, sList] = await Promise.all([
        getGroupMembers(gId),
        getGroupExpenses(gId),
        getGroupSettlements(gId),
      ]);
      setMembers(mList);
      setExpenses(eList);
      setSettlements(sList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGroupData(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !user) return;
    try {
      const created = await createGroup(user.uid, userProfile?.fullName || 'User', user.email || '', {
        name: groupName.trim(),
        description: groupDesc.trim(),
        currency,
      });
      setShowCreateGroup(false);
      setGroupName('');
      setGroupDesc('');
      await onRefreshGroups();
      setSelectedGroupId(created.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !user) return;
    setJoinError(null);
    try {
      const joined = await joinGroupByInviteCode(user.uid, userProfile?.fullName || 'User', user.email || '', inviteCode.trim());
      if (joined) {
        setShowJoinGroup(false);
        setInviteCode('');
        await onRefreshGroups();
        setSelectedGroupId(joined.id);
      } else {
        setJoinError('Invalid invite code. Try "GOA26X" or "FLAT40".');
      }
    } catch (err) {
      console.error(err);
      setJoinError('Failed to join group. Please try again.');
    }
  };

  const handleDeleteGroupAction = async () => {
    if (!selectedGroup || !user) return;
    setDeletingGroup(true);
    try {
      if (onDeleteGroup) {
        await onDeleteGroup(selectedGroup.id);
      } else {
        await deleteGroup(user.uid, selectedGroup.id);
      }
      setShowDeleteGroupModal(false);
      await onRefreshGroups();
      const remaining = groups.filter((g) => g.id !== selectedGroup.id);
      if (remaining.length > 0) {
        setSelectedGroupId(remaining[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingGroup(false);
    }
  };

  const handleAddCustomMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !selectedGroup) return;
    const newM: GroupMember = {
      id: 'usr_' + Date.now(),
      userId: 'usr_' + Date.now(),
      name: newMemberName.trim(),
      email: newMemberEmail.trim() || `${newMemberName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      role: 'member',
      joinedAt: new Date().toISOString(),
    };
    const updated = [...members, newM];
    setMembers(updated);
    try {
      localStorage.setItem(`group_members_${selectedGroup.id}`, JSON.stringify(updated));
    } catch {}
    setShowAddMemberModal(false);
    setNewMemberName('');
    setNewMemberEmail('');
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedGroup) return;
    setMembers((prev) => prev.filter((m) => m.id !== memberId && m.userId !== memberId));
    await removeGroupMember(selectedGroup.id, memberId);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(expAmount);
    if (!selectedGroup || !expTitle.trim() || isNaN(numAmt) || numAmt <= 0) return;

    setSubmittingExp(true);
    try {
      const paidMember = members.find((m) => m.userId === paidByUserId) || {
        userId: user?.uid || '',
        name: userProfile?.fullName || 'User',
      };

      const participantIds = members.map((m) => m.userId);
      const equalShare = numAmt / (participantIds.length || 1);

      const splits = members.map((m) => ({
        userId: m.userId,
        userName: m.name,
        amount: equalShare,
      }));

      const newExp = await createGroupExpense(selectedGroup.id, {
        groupId: selectedGroup.id,
        title: expTitle.trim(),
        amount: numAmt,
        currency,
        category: expCategory,
        date: new Date().toISOString().split('T')[0],
        paidByUserId: paidMember.userId,
        paidByUserName: paidMember.name,
        participantIds,
        splitMethod: 'equal',
        splits,
        createdAt: new Date().toISOString(),
      });

      setExpenses((prev) => [newExp, ...prev]);
      setShowAddExpense(false);
      setExpTitle('');
      setExpAmount('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingExp(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!selectedGroup) return;
    setDeletingExpId(expenseId);
    try {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
      await deleteGroupExpense(selectedGroup.id, expenseId);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingExpId(null);
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(settleAmount);
    if (!selectedGroup || !receiverId || isNaN(numAmt) || numAmt <= 0 || !user) return;

    setSubmittingSettle(true);
    try {
      const receiver = members.find((m) => m.userId === receiverId);
      const newSettle = await createGroupSettlement(selectedGroup.id, {
        groupId: selectedGroup.id,
        payerId: user.uid,
        payerName: userProfile?.fullName || 'User',
        receiverId,
        receiverName: receiver?.name || 'Member',
        amount: numAmt,
        currency,
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        createdAt: new Date().toISOString(),
      });

      setSettlements((prev) => [newSettle, ...prev]);
      setShowSettleModal(false);
      setSettleAmount('');
      setReceiverId('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingSettle(false);
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (!selectedGroup) return;
    setDeletingSettleId(settlementId);
    try {
      setSettlements((prev) => prev.filter((s) => s.id !== settlementId));
      await deleteGroupSettlement(selectedGroup.id, settlementId);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingSettleId(null);
    }
  };

  const handleAskGroupAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim() || !selectedGroup) return;

    setAiLoading(true);
    setAiAnswer(null);
    try {
      const ans = await aiApiService.askGroupQuestion(aiQuestion, {
        groupName: selectedGroup.name,
        members,
        expenses,
        settlements,
      });
      setAiAnswer(ans);
    } catch (err: any) {
      setAiAnswer('Sorry, failed to generate AI insight for this group.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#33332d] dark:text-[#e5e5dc] tracking-tight">
            Group Expense Splits
          </h1>
          <p className="text-xs text-[#66665c] dark:text-[#a3a395]">
            Split trip costs, roommate rent & dining bills with automated debt balancing.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowJoinGroup(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#e2e2d8] bg-white px-3 py-2 text-xs font-bold text-[#33332d] transition hover:bg-[#fafaf6] dark:border-[#33332c] dark:bg-[#242420] dark:text-[#e5e5dc]"
          >
            <UserPlus className="h-4 w-4" />
            Join with Code
          </button>
          <button
            onClick={() => setShowCreateGroup(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#484832] shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Group
          </button>
        </div>
      </div>

      {groups.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Group Selector Sidebar */}
          <div className="space-y-2 lg:col-span-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#66665c] dark:text-[#a3a395] px-1">
              Your Groups ({groups.length})
            </h3>
            <div className="space-y-1.5">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGroupId(g.id)}
                  className={`w-full text-left rounded-xl p-3 transition ${
                    g.id === selectedGroup?.id
                      ? 'bg-[#5A5A40] text-white shadow-xs'
                      : 'bg-white text-[#33332d] border border-[#e2e2d8] hover:bg-[#fafaf6] dark:bg-[#242420] dark:border-[#33332c] dark:text-[#e5e5dc]'
                  }`}
                >
                  <p className="text-xs font-bold">{g.name}</p>
                  <p
                    className={`text-[10px] mt-0.5 ${
                      g.id === selectedGroup?.id ? 'text-[#e6e6dc]' : 'text-[#66665c] dark:text-[#a3a395]'
                    }`}
                  >
                    Invite: {g.inviteCode}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Group Content Main Area */}
          <div className="space-y-6 lg:col-span-3">
            {selectedGroup && (
              <>
                <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold text-[#33332d] dark:text-[#e5e5dc]">
                      {selectedGroup.name}
                    </h2>
                    <p className="text-xs text-[#66665c] dark:text-[#a3a395]">
                      {selectedGroup.description || 'Shared group expenses'} • Invite Code:{' '}
                      <span className="font-bold text-[#5A5A40] dark:text-[#a1a17a]">
                        {selectedGroup.inviteCode}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setShowAddMemberModal(true)}
                      className="rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-bold text-[#33332d] transition hover:bg-[#e6e6dc] dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                    >
                      + Member
                    </button>
                    <button
                      onClick={() => setShowSettleModal(true)}
                      className="rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-bold text-[#33332d] transition hover:bg-[#e6e6dc] dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                    >
                      Settle Debt
                    </button>
                    <button
                      onClick={() => setShowAddExpense(true)}
                      className="rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#484832]"
                    >
                      + Add Group Expense
                    </button>
                    <button
                      onClick={() => setShowDeleteGroupModal(true)}
                      className="rounded-xl p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Delete this entire group"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Group Members List */}
                <div className="rounded-2xl border border-[#e2e2d8] bg-white p-4 dark:border-[#33332c] dark:bg-[#242420]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#66665c] dark:text-[#a3a395]">
                      Group Members ({members.length})
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => (
                      <div
                        key={m.userId || m.id}
                        className="flex items-center gap-2 rounded-xl border border-[#ecece2] bg-[#fafaf6] px-3 py-1.5 text-xs text-[#33332d] dark:border-[#2d2d27] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                      >
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#5A5A40] text-[10px] font-bold text-white">
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold">{m.name}</span>
                        {m.role === 'owner' && (
                          <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Host
                          </span>
                        )}
                        {m.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(m.id || m.userId)}
                            className="text-[#8c8c7e] hover:text-rose-600 transition"
                            title="Remove member"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Group Assistant Card */}
                <div className="rounded-2xl border border-[#ecece2] bg-[#fafaf6] p-4 dark:border-[#2d2d27] dark:bg-[#1a1a17]">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-[#5A5A40]" />
                    <h3 className="text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                      Ask Hisaab Group AI
                    </h3>
                  </div>
                  <form onSubmit={handleAskGroupAI} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Who paid the most for dinner or who owes whom?"
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                      className="flex-1 rounded-xl border border-[#e2e2d8] bg-white px-3 py-1.5 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#242420] dark:text-[#e5e5dc]"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading}
                      className="rounded-xl bg-[#5A5A40] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#484832]"
                    >
                      {aiLoading ? 'Thinking...' : 'Ask AI'}
                    </button>
                  </form>
                  {aiAnswer && (
                    <div className="mt-3 rounded-xl border border-[#e2e2d8] bg-white p-3 text-xs text-[#33332d] dark:border-[#33332c] dark:bg-[#242420] dark:text-[#e5e5dc]">
                      {aiAnswer}
                    </div>
                  )}
                </div>

                {/* Expenses List */}
                <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420]">
                  <h3 className="text-sm font-bold text-[#33332d] dark:text-[#e5e5dc] mb-3">
                    Group Expenses ({expenses.length})
                  </h3>
                  <div className="divide-y divide-[#ecece2] dark:divide-[#2d2d27]">
                    {expenses.map((e) => (
                      <div key={e.id} className="group flex items-center justify-between py-3">
                        <div>
                          <p className="text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                            {e.title}
                          </p>
                          <p className="text-[10px] text-[#66665c] dark:text-[#a3a395]">
                            Paid by <span className="font-semibold">{e.paidByUserName}</span> • {formatDate(e.date)} • {e.category}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-xs font-extrabold text-[#33332d] dark:text-[#e5e5dc]">
                            {formatCurrency(e.amount, currency)}
                          </p>
                          <button
                            onClick={() => handleDeleteExpense(e.id)}
                            disabled={deletingExpId === e.id}
                            className="rounded-lg p-1.5 text-[#8c8c7e] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                            title="Delete this expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {expenses.length === 0 && (
                      <p className="py-6 text-center text-xs text-[#8c8c7e]">
                        No group expenses added yet. Click "+ Add Group Expense" above.
                      </p>
                    )}
                  </div>
                </div>

                {/* Settlements List */}
                {settlements.length > 0 && (
                  <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420]">
                    <h3 className="text-sm font-bold text-[#33332d] dark:text-[#e5e5dc] mb-3">
                      Recorded Settlements ({settlements.length})
                    </h3>
                    <div className="divide-y divide-[#ecece2] dark:divide-[#2d2d27]">
                      {settlements.map((s) => (
                        <div key={s.id} className="flex items-center justify-between py-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-[#33332d] dark:text-[#e5e5dc]">
                                <span className="font-bold">{s.payerName}</span> paid{' '}
                                <span className="font-bold">{s.receiverName}</span>
                              </p>
                              <p className="text-[10px] text-[#66665c] dark:text-[#a3a395]">
                                {formatDate(s.date)} • Completed
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(s.amount, currency)}
                            </p>
                            <button
                              onClick={() => handleDeleteSettlement(s.id)}
                              disabled={deletingSettleId === s.id}
                              className="rounded-lg p-1.5 text-[#8c8c7e] hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 transition"
                              title="Delete settlement record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#e2e2d8] p-12 text-center dark:border-[#33332c]">
          <Users className="mx-auto h-10 w-10 text-[#8c8c7e] mb-3" />
          <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">
            No Groups Joined Yet
          </h3>
          <p className="text-xs text-[#66665c] dark:text-[#a3a395] mt-1 max-w-sm mx-auto">
            Create a group for trips, outings, or roommates to split expenses seamlessly.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              onClick={() => setShowJoinGroup(true)}
              className="rounded-xl border border-[#e2e2d8] px-4 py-2 text-xs font-bold text-[#33332d] dark:border-[#33332c] dark:text-[#e5e5dc]"
            >
              Join with Code
            </button>
            <button
              onClick={() => setShowCreateGroup(true)}
              className="rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white hover:bg-[#484832]"
            >
              Create New Group
            </button>
          </div>
        </div>
      )}

      {/* Delete Group Modal */}
      {showDeleteGroupModal && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#33332d]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[#e2e2d8] bg-white p-6 shadow-2xl dark:border-[#33332c] dark:bg-[#242420]">
            <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">
              Delete Group "{selectedGroup.name}"?
            </h3>
            <p className="mt-2 text-xs text-[#66665c] dark:text-[#a3a395]">
              This will permanently delete this group, its member records, and all expense splits.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteGroupModal(false)}
                className="rounded-xl border border-[#e2e2d8] px-4 py-2 text-xs font-bold text-[#66665c] hover:bg-[#e6e6dc] dark:border-[#33332c] dark:text-[#a3a395]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingGroup}
                onClick={handleDeleteGroupAction}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                {deletingGroup ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#33332d]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#e2e2d8] bg-white p-6 shadow-2xl dark:border-[#33332c] dark:bg-[#242420]">
            <div className="flex items-center justify-between border-b border-[#ecece2] pb-3 dark:border-[#2d2d27]">
              <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">
                Create Group
              </h3>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="rounded-lg p-1 text-[#66665c] hover:bg-[#e6e6dc] dark:hover:bg-[#2a2a25]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Goa Trip 2026, Flat 402 Rent"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional description"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="rounded-xl border border-[#e2e2d8] px-4 py-2 text-xs font-bold text-[#66665c] hover:bg-[#e6e6dc] dark:border-[#33332c] dark:text-[#a3a395]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white hover:bg-[#484832]"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#33332d]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#e2e2d8] bg-white p-6 shadow-2xl dark:border-[#33332c] dark:bg-[#242420]">
            <div className="flex items-center justify-between border-b border-[#ecece2] pb-3 dark:border-[#2d2d27]">
              <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">
                Join Group with Code
              </h3>
              <button
                onClick={() => setShowJoinGroup(false)}
                className="rounded-lg p-1 text-[#66665c] hover:bg-[#e6e6dc] dark:hover:bg-[#2a2a25]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleJoinGroup} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  6-Character Invite Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GOA26X or FLAT40"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] uppercase focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                />
              </div>

              {joinError && (
                <div className="rounded-xl bg-[#fdf4f1] p-3 text-xs text-[#c86d51] dark:bg-[#33231e]">
                  {joinError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinGroup(false)}
                  className="rounded-xl border border-[#e2e2d8] px-4 py-2 text-xs font-bold text-[#66665c] hover:bg-[#e6e6dc] dark:border-[#33332c] dark:text-[#a3a395]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white hover:bg-[#484832]"
                >
                  Join Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#33332d]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#e2e2d8] bg-white p-6 shadow-2xl dark:border-[#33332c] dark:bg-[#242420]">
            <div className="flex items-center justify-between border-b border-[#ecece2] pb-3 dark:border-[#2d2d27]">
              <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">
                Add Member to {selectedGroup.name}
              </h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="rounded-lg p-1 text-[#66665c] hover:bg-[#e6e6dc] dark:hover:bg-[#2a2a25]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddCustomMember} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  Member Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="rounded-xl border border-[#e2e2d8] px-4 py-2 text-xs font-bold text-[#66665c] hover:bg-[#e6e6dc] dark:border-[#33332c] dark:text-[#a3a395]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white hover:bg-[#484832]"
                >
                  Add to Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#33332d]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#e2e2d8] bg-white p-6 shadow-2xl dark:border-[#33332c] dark:bg-[#242420]">
            <div className="flex items-center justify-between border-b border-[#ecece2] pb-3 dark:border-[#2d2d27]">
              <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">
                Add Expense to {selectedGroup.name}
              </h3>
              <button
                onClick={() => setShowAddExpense(false)}
                className="rounded-lg p-1 text-[#66665c] hover:bg-[#e6e6dc] dark:hover:bg-[#2a2a25]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  Title / Description
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hotel Booking, Dinner"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                    Amount ({currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                    Category
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                  >
                    {DEFAULT_CATEGORIES.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  Paid By
                </label>
                <select
                  value={paidByUserId}
                  onChange={(e) => setPaidByUserId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                >
                  {members.map((m) => (
                    <option key={m.userId || m.id} value={m.userId || m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="rounded-xl border border-[#e2e2d8] px-4 py-2 text-xs font-bold text-[#66665c] hover:bg-[#e6e6dc] dark:border-[#33332c] dark:text-[#a3a395]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExp}
                  className="rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white hover:bg-[#484832]"
                >
                  {submittingExp ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settle Debt Modal */}
      {showSettleModal && selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#33332d]/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-[#e2e2d8] bg-white p-6 shadow-2xl dark:border-[#33332c] dark:bg-[#242420]">
            <div className="flex items-center justify-between border-b border-[#ecece2] pb-3 dark:border-[#2d2d27]">
              <h3 className="text-base font-bold text-[#33332d] dark:text-[#e5e5dc]">
                Settle Group Debt
              </h3>
              <button
                onClick={() => setShowSettleModal(false)}
                className="rounded-lg p-1 text-[#66665c] hover:bg-[#e6e6dc] dark:hover:bg-[#2a2a25]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSettle} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  Pay To Member
                </label>
                <select
                  required
                  value={receiverId}
                  onChange={(e) => setReceiverId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                >
                  <option value="">Select Member</option>
                  {members
                    .filter((m) => (m.userId || m.id) !== user?.uid)
                    .map((m) => (
                      <option key={m.userId || m.id} value={m.userId || m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                  Amount ({currency})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="rounded-xl border border-[#e2e2d8] px-4 py-2 text-xs font-bold text-[#66665c] hover:bg-[#e6e6dc] dark:border-[#33332c] dark:text-[#a3a395]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSettle}
                  className="rounded-xl bg-[#5A5A40] px-4 py-2 text-xs font-bold text-white hover:bg-[#484832]"
                >
                  {submittingSettle ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
