import React, { useState } from 'react';
import {
  Wallet,
  Sparkles,
  Bell,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Search,
  Menu,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { CurrencyCode } from '../../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toggleSidebar: () => void;
  openAIModal: () => void;
  unreadCount: number;
  openNotifications: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  toggleSidebar,
  openAIModal,
  unreadCount,
  openNotifications,
}) => {
  const { userProfile, logout, updateProfileData, user } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const currencies: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD', 'SGD'];

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurr = e.target.value as CurrencyCode;
    updateProfileData({ preferredCurrency: newCurr });
  };

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') || localStorage.getItem('hisaab_theme') === 'dark';
    }
    return false;
  });

  React.useEffect(() => {
    if (userProfile?.theme) {
      const darkSetting = userProfile.theme === 'dark';
      setIsDark(darkSetting);
      if (darkSetting) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
        localStorage.setItem('hisaab_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
        localStorage.setItem('hisaab_theme', 'light');
      }
    }
  }, [userProfile?.theme]);

  const toggleTheme = () => {
    const nextIsDark = !isDark;
    setIsDark(nextIsDark);
    if (nextIsDark) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('hisaab_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('hisaab_theme', 'light');
    }
    if (userProfile) {
      updateProfileData({ theme: nextIsDark ? 'dark' : 'light' });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e2e2d8] bg-[#f5f5f0]/95 px-4 backdrop-blur dark:border-[#33332c] dark:bg-[#1a1a17]/95 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-2 text-[#66665c] hover:bg-[#e6e6dc] dark:text-[#a3a395] dark:hover:bg-[#2a2a25] lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab('dashboard')}
          className="flex cursor-pointer items-center gap-2.5 font-bold tracking-tight text-[#33332d] dark:text-[#e5e5dc]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#5A5A40] to-[#526352] text-white shadow-xs">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-tight text-[#33332d] dark:text-[#e5e5dc]">
              Hisaab
            </span>
            <span className="hidden text-[10px] font-semibold tracking-widest text-[#5A5A40] dark:text-[#a1a17a] sm:inline">
              FINANCE PLATFORM
            </span>
          </div>
        </div>
      </div>

      {/* Global Quick Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Natural Language AI Entry Button */}
        <button
          onClick={openAIModal}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5A5A40] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#484832] sm:px-4 sm:py-2.5 sm:text-sm shadow-xs"
        >
          <Sparkles className="h-4 w-4 animate-pulse text-[#e6e6dc]" />
          <span className="hidden sm:inline">Quick AI Entry</span>
          <span className="sm:hidden">AI</span>
        </button>

        {/* Currency Picker */}
        <div className="relative">
          <select
            value={userProfile?.preferredCurrency || 'INR'}
            onChange={handleCurrencyChange}
            className="rounded-lg border border-[#e2e2d8] bg-[#fafaf6] py-1.5 px-2 text-xs font-medium text-[#33332d] shadow-2xs transition hover:bg-[#e6e6dc] dark:border-[#33332c] dark:bg-[#242420] dark:text-[#e5e5dc] dark:hover:bg-[#2a2a25] sm:text-sm"
          >
            {currencies.map((c) => (
              <option key={c} value={c}>
                {c === 'INR' ? '₹ INR' : c === 'USD' ? '$ USD' : c === 'EUR' ? '€ EUR' : `${c}`}
              </option>
            ))}
          </select>
        </div>

        {/* Notifications Button */}
        <button
          onClick={openNotifications}
          className="relative rounded-lg border border-[#e2e2d8] bg-[#fafaf6] p-2 text-[#66665c] transition hover:bg-[#e6e6dc] dark:border-[#33332c] dark:bg-[#242420] dark:text-[#a3a395] dark:hover:bg-[#2a2a25]"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#c86d51] text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dark/Light Toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg border border-[#e2e2d8] bg-[#fafaf6] p-2 text-[#66665c] transition hover:bg-[#e6e6dc] dark:border-[#33332c] dark:bg-[#242420] dark:text-[#a3a395] dark:hover:bg-[#2a2a25]"
          title="Toggle Theme"
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-[#d99b26]" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* User Profile Menu */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center gap-2 rounded-xl border border-[#e2e2d8] p-1.5 transition hover:bg-[#fafaf6] dark:border-[#33332c] dark:hover:bg-[#2a2a25]"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f0f1e8] text-xs font-bold text-[#5A5A40] dark:bg-[#2b2b22] dark:text-[#a1a17a]">
                {userProfile?.fullName?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="hidden max-w-[100px] truncate text-xs font-medium text-[#33332d] dark:text-[#e5e5dc] md:inline">
                {userProfile?.fullName}
              </span>
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[#e2e2d8] bg-white p-2 shadow-xl dark:border-[#33332c] dark:bg-[#242420]">
                <div className="px-3 py-2 border-b border-[#ecece2] dark:border-[#2d2d27]">
                  <p className="text-sm font-semibold text-[#33332d] dark:text-[#e5e5dc]">
                    {userProfile?.fullName}
                  </p>
                  <p className="truncate text-xs text-[#66665c] dark:text-[#a3a395]">
                    {userProfile?.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('settings');
                    setShowProfileDropdown(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#33332d] hover:bg-[#f0f1e8] dark:text-[#e5e5dc] dark:hover:bg-[#2b2b22]"
                >
                  <UserIcon className="h-4 w-4" />
                  Account Settings
                </button>
                {userProfile?.role === 'admin' || userProfile?.role === 'super_admin' ? (
                  <button
                    onClick={() => {
                      setActiveTab('admin');
                      setShowProfileDropdown(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#8a7051] hover:bg-[#fdf8eb] dark:text-[#d99b26] dark:hover:bg-[#332b1a]"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Admin Panel
                  </button>
                ) : null}
                <button
                  onClick={() => {
                    logout();
                    setShowProfileDropdown(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-[#c86d51] hover:bg-[#fdf4f1] dark:text-[#d98268] dark:hover:bg-[#33231e]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
};
