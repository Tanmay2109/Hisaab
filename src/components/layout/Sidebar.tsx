import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  PieChart,
  Target,
  FileText,
  Repeat,
  Users,
  BarChart3,
  Sparkles,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
}) => {
  const { userProfile } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'accounts', label: 'Accounts', icon: CreditCard },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'goals', label: 'Savings Goals', icon: Target },
    { id: 'bills', label: 'Bills', icon: FileText },
    { id: 'subscriptions', label: 'Subscriptions', icon: Repeat },
    { id: 'groups', label: 'Group Finance', icon: Users, badge: 'Shared' },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'ai-insights', label: 'AI Insights', icon: Sparkles, highlight: true },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (userProfile?.role === 'admin' || userProfile?.role === 'super_admin') {
    navItems.push({ id: 'admin', label: 'Admin Panel', icon: ShieldCheck, badge: 'Admin' });
  }

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between py-4 px-3">
      <div className="space-y-1">
        <div className="mb-4 flex items-center justify-between px-3 lg:hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8c8c7e]">
            Navigation
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-[#66665c] hover:bg-[#e6e6dc] dark:hover:bg-[#2a2a25]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-[#5A5A40] text-white shadow-xs'
                    : 'text-[#66665c] hover:bg-[#f0f1e8] hover:text-[#33332d] dark:text-[#a3a395] dark:hover:bg-[#2b2b22] dark:hover:text-[#e5e5dc]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 ${
                      isActive
                        ? 'text-white'
                        : item.highlight
                        ? 'text-[#5A5A40] dark:text-[#a1a17a]'
                        : 'text-[#8c8c7e] dark:text-[#737365]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isActive
                        ? 'bg-[#484832] text-white'
                        : 'bg-[#f0f1e8] text-[#5A5A40] dark:bg-[#2b2b22] dark:text-[#a1a17a]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer info */}
      <div className="border-t border-[#e2e2d8] px-3 pt-3 dark:border-[#33332c]">
        <div className="rounded-xl border border-[#ecece2] bg-[#fafaf6] p-3 dark:border-[#2d2d27] dark:bg-[#242420]">
          <p className="text-[11px] font-bold text-[#33332d] dark:text-[#e5e5dc]">
            Hisaab Engine v1.0
          </p>
          <p className="text-[10px] text-[#66665c] dark:text-[#a3a395]">
            Secure GenAI Finance & Group Splits
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-[#e2e2d8] bg-[#f5f5f0] dark:border-[#33332c] dark:bg-[#1a1a17] lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-[#33332d]/50 backdrop-blur-xs"
            onClick={onClose}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#f5f5f0] dark:bg-[#1a1a17] shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
