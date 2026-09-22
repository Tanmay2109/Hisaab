import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Users,
  Menu,
  Sparkles,
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenSidebar: () => void;
  onOpenAIModal: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSidebar,
  onOpenAIModal,
}) => {
  const primaryNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Ledger', icon: Receipt },
    { id: 'budgets', label: 'Budgets', icon: PieChart },
    { id: 'groups', label: 'Groups', icon: Users },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 block border-t border-[#e2e2d8] bg-[#f5f5f0]/95 backdrop-blur-md dark:border-[#33332c] dark:bg-[#1a1a17]/95 lg:hidden">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-1 flex-col items-center justify-center py-1.5 transition-all ${
                isActive
                  ? 'text-[#5A5A40] dark:text-[#a1a17a] font-bold scale-105'
                  : 'text-[#66665c] hover:text-[#33332d] dark:text-[#a3a395] dark:hover:text-[#e5e5dc]'
              }`}
            >
              <div className={`relative flex items-center justify-center rounded-xl p-1 ${isActive ? 'bg-[#5A5A40]/10 dark:bg-[#a1a17a]/15' : ''}`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Quick AI Floating Action inside Bottom Nav */}
        <button
          onClick={onOpenAIModal}
          className="flex flex-1 flex-col items-center justify-center py-1.5 text-[#5A5A40] dark:text-[#a1a17a]"
          title="Quick AI Assistant"
        >
          <div className="flex items-center justify-center rounded-xl bg-gradient-to-tr from-[#5A5A40] to-[#526352] p-1.5 text-white shadow-xs">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <span className="text-[10px] mt-0.5 font-bold tracking-tight text-[#5A5A40] dark:text-[#a1a17a]">
            AI
          </span>
        </button>

        {/* Menu drawer trigger */}
        <button
          onClick={onOpenSidebar}
          className="flex flex-1 flex-col items-center justify-center py-1.5 text-[#66665c] hover:text-[#33332d] dark:text-[#a3a395] dark:hover:text-[#e5e5dc]"
        >
          <div className="flex items-center justify-center rounded-xl p-1">
            <Menu className="h-5 w-5" />
          </div>
          <span className="text-[10px] mt-0.5 font-medium tracking-tight">
            Menu
          </span>
        </button>
      </div>
    </div>
  );
};
