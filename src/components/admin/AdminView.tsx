import React, { useState } from 'react';
import { ShieldCheck, Users, Database, Activity, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminView: React.FC = () => {
  const { userProfile } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#33332d] dark:text-[#e5e5dc] tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-[#d99b26]" />
          System Administration Panel
        </h1>
        <p className="text-xs text-[#66665c] dark:text-[#a3a395]">
          Manage system configurations, user roles, security rule enforcement and platform audit logs.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66665c] dark:text-[#a3a395]">
              Active Role
            </span>
            <Users className="h-5 w-5 text-[#5A5A40]" />
          </div>
          <h2 className="mt-2 text-2xl font-extrabold text-[#33332d] dark:text-[#e5e5dc] capitalize">
            {userProfile?.role || 'Admin'}
          </h2>
        </div>

        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66665c] dark:text-[#a3a395]">
              Database Status
            </span>
            <Database className="h-5 w-5 text-[#526352]" />
          </div>
          <h2 className="mt-2 text-2xl font-extrabold text-[#526352] dark:text-[#6b826b]">
            Firestore Active
          </h2>
        </div>

        <div className="rounded-2xl border border-[#e2e2d8] bg-white p-5 dark:border-[#33332c] dark:bg-[#242420]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#66665c] dark:text-[#a3a395]">
              GenAI Engine
            </span>
            <Activity className="h-5 w-5 text-[#d99b26]" />
          </div>
          <h2 className="mt-2 text-2xl font-extrabold text-[#33332d] dark:text-[#e5e5dc]">
            Gemini 2.5 Flash
          </h2>
        </div>
      </div>
    </div>
  );
};
