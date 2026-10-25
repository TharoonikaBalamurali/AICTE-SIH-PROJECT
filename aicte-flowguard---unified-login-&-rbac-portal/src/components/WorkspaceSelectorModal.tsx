/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Layers, ShieldCheck, ArrowRight, X, AlertTriangle } from 'lucide-react';
import type { UserRole, UserProfile } from '../types/auth.ts';
import { ROLE_CONFIGS } from '../types/auth.ts';

interface WorkspaceSelectorModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose?: () => void;
  onSelectRole: (role: UserRole) => Promise<void>;
  isMandatoryInitialSelection?: boolean;
}

export const WorkspaceSelectorModal: React.FC<WorkspaceSelectorModalProps> = ({
  user,
  isOpen,
  onClose,
  onSelectRole,
  isMandatoryInitialSelection = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-modal-title"
    >
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-amber-400" />
            <div>
              <h3 id="workspace-modal-title" className="text-base font-bold leading-tight">
                Authorised Workspace Selection
              </h3>
              <p className="text-xs text-slate-300">
                Identity verified: <span className="font-semibold text-white">{user.fullName}</span> ({user.loginId})
              </p>
            </div>
          </div>
          {!isMandatoryInitialSelection && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-600 leading-relaxed bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-900">Multi-Role Delegated Access: </span>
              Your account has been granted multiple statutory roles. Select the operational workspace for this active session. Server-side RBAC will strictly restrict permissions to the selected statutory boundary.
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Assigned Regulatory Roles ({user.roles.length}):
            </div>

            <div className="space-y-2">
              {user.roles.map((role) => {
                const config = ROLE_CONFIGS[role];
                const isActive = user.activeRole === role;

                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => onSelectRole(role)}
                    className={`w-full text-left p-4 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isActive
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {config?.title || role}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {config?.description}
                      </p>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Statutory Basis: {config?.statutoryAuthority}
                      </div>
                    </div>

                    <div className="shrink-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 hover:bg-slate-900 hover:text-white transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Role switching is securely recorded in the audit log.</span>
          {!isMandatoryInitialSelection && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-700 hover:text-slate-900 font-medium cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
