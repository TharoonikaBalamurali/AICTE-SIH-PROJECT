/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LogOut, Layers, ShieldCheck } from 'lucide-react';
import type { UserProfile } from '../types/auth.ts';
import { ROLE_CONFIGS } from '../types/auth.ts';

interface HeaderProps {
  user: UserProfile | null;
  onLogout: () => void;
  onOpenWorkspaceSelector?: () => void;
  onOpenRbacProbe?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenWorkspaceSelector,
  onOpenRbacProbe,
}) => {
  const currentRoleConfig = user?.activeRole ? ROLE_CONFIGS[user.activeRole] : null;
  const hasMultipleRoles = user && user.roles.length > 1;

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
        {/* Brand with emblem */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-lg font-serif shrink-0 shadow-xs">
            अ
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-slate-900 leading-tight">
              AICTE FlowGuard
            </div>
            <div className="text-[11px] text-slate-500 font-normal leading-tight">
              Approval Process Portal
            </div>
          </div>
        </div>

        {/* Right Actions & User Identity */}
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-3">
              {hasMultipleRoles && onOpenWorkspaceSelector && (
                <button
                  type="button"
                  onClick={onOpenWorkspaceSelector}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  title="Switch assigned role workspace"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-600" />
                  <span>Switch Workspace ({user.roles.length})</span>
                </button>
              )}

              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-900 truncate max-w-[200px]">
                  {user.fullName}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {currentRoleConfig?.shortTitle || user.activeRole}
                </div>
              </div>

              {/* User Avatar Circle */}
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200 shrink-0">
                {user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'AI'}
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ml-1"
                title="Sign out of portal"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
