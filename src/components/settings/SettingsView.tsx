import React, { useState } from 'react';
import { User, Shield, Moon, Sun, DollarSign, Bell, CheckCircle } from 'lucide-react';
import { CurrencyCode } from '../../types';
import { useAuth } from '../../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { userProfile, updateProfileData, user } = useAuth();

  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [currency, setCurrency] = useState<CurrencyCode>(userProfile?.preferredCurrency || 'INR');
  const [theme, setTheme] = useState<'light' | 'dark'>(userProfile?.theme === 'dark' ? 'dark' : 'light');
  const [savedMsg, setSavedMsg] = useState(false);

  React.useEffect(() => {
    if (userProfile) {
      if (userProfile.fullName) setFullName(userProfile.fullName);
      if (userProfile.preferredCurrency) setCurrency(userProfile.preferredCurrency);
      if (userProfile.theme) setTheme(userProfile.theme === 'dark' ? 'dark' : 'light');
    }
  }, [userProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('hisaab_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('hisaab_theme', 'light');
    }
    await updateProfileData({
      fullName,
      preferredCurrency: currency,
      theme,
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-[#33332d] dark:text-[#e5e5dc] tracking-tight">
          Account Settings
        </h1>
        <p className="text-xs text-[#66665c] dark:text-[#a3a395]">
          Manage your personal profile, preferred currency, and theme preferences.
        </p>
      </div>

      <div className="rounded-2xl border border-[#e2e2d8] bg-white p-6 dark:border-[#33332c] dark:bg-[#242420]">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={userProfile?.email || user?.email || ''}
              className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#ecece2] px-3 py-2 text-xs font-medium text-[#66665c] dark:border-[#33332c] dark:bg-[#2a2a25] dark:text-[#a3a395]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                Preferred Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AED">AED (AED)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="SGD">SGD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#33332d] dark:text-[#e5e5dc]">
                Appearance
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="mt-1 w-full rounded-xl border border-[#e2e2d8] bg-[#fafaf6] px-3 py-2 text-xs font-medium text-[#33332d] focus:border-[#5A5A40] focus:outline-none dark:border-[#33332c] dark:bg-[#1a1a17] dark:text-[#e5e5dc]"
              >
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            {savedMsg && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-[#526352] dark:text-[#6b826b]">
                <CheckCircle className="h-4 w-4" /> Changes saved successfully!
              </span>
            )}
            <button
              type="submit"
              className="ml-auto rounded-xl bg-[#5A5A40] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#484832] transition"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
