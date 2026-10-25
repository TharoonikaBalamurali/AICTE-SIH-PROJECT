/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { UserProfile } from '../../types/auth.ts';
import { ROLE_CONFIGS } from '../../types/auth.ts';

interface DashboardShellProps {
  user: UserProfile;
  onLogout: () => void;
  onOpenWorkspaceSelector?: () => void;
  onOpenRbacProbe?: () => void;
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({
  user,
  children,
}) => {
  const activeRole = user.activeRole || user.roles[0];
  const roleConfig = ROLE_CONFIGS[activeRole];

  return (
    <div className="min-h-[calc(100vh-60px)] bg-slate-50 flex flex-col">
      {/* Sub-header breadcrumb & title */}
      <div className="bg-white border-b border-slate-200/80 px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Official Portal</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">{roleConfig?.shortTitle || activeRole}</span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-medium">
            Role: {activeRole}
          </span>
        </div>
      </div>

      {/* Main Viewport Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 w-full flex-1">
        {children}
      </main>
    </div>
  );
};
