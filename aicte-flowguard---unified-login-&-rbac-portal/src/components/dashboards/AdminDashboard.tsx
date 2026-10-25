/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Users, UserX, UserCheck, ShieldCheck, Key, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { UserProfile, AccountStatus } from '../../types/auth.ts';

interface AdminDashboardProps {
  user: UserProfile;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [userList, setUserList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUserList(data.users || []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (targetUserId: string, newStatus: AccountStatus) => {
    setUpdatingId(targetUserId);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/users/toggle-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStatusMessage(`User operational status updated to ${newStatus}. Active sessions invalidated on server.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Lock className="w-4 h-4 text-zinc-700" />
            <span>e-Governance & System Security Division</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            System Administration & User Provisioning Matrix
          </h2>
          <p className="text-xs text-slate-500">
            Mandate: Technical identity governance, RBAC role assignment, and session revocation
          </p>
        </div>

        <div className="bg-zinc-100 text-zinc-900 border border-zinc-200 px-3.5 py-2 rounded-lg font-mono text-xs">
          Principal Administrator: {user.fullName}
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* User Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Provisioned User Directory & Account Operational States
            </h3>
            <p className="text-xs text-slate-500">
              Altering status to DISABLED or SUSPENDED immediately destroys active sessions on the server.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">Total Accounts: {userList.length}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading user directory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">User ID & Name</th>
                  <th className="px-6 py-3">Designation & Department</th>
                  <th className="px-6 py-3">Assigned Role(s)</th>
                  <th className="px-6 py-3">Operational Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono font-bold text-slate-900">{u.loginId}</div>
                      <div className="text-slate-700">{u.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{u.designation}</div>
                      <div className="text-[11px] text-slate-500">{u.department}</div>
                      {u.institutionName && (
                        <div className="text-[11px] text-slate-600 font-medium">Inst: {u.institutionName}</div>
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono text-[11px]">
                      {u.roles.length === 0 ? (
                        <span className="text-rose-600 font-semibold">[0 Assigned - Access Denied]</span>
                      ) : (
                        u.roles.map((r) => (
                          <div key={r} className="text-slate-800 font-semibold">
                            • {r}
                          </div>
                        ))
                      )}
                    </td>

                    <td className="px-6 py-4 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                        u.status === 'DISABLED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                        'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {u.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right space-x-1 whitespace-nowrap">
                      {u.status === 'ACTIVE' ? (
                        <>
                          <button
                            type="button"
                            disabled={updatingId === u.id || u.id === user.id}
                            onClick={() => handleToggleStatus(u.id, 'SUSPENDED')}
                            className="px-2.5 py-1 text-[11px] bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded font-medium cursor-pointer disabled:opacity-40"
                          >
                            Suspend
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === u.id || u.id === user.id}
                            onClick={() => handleToggleStatus(u.id, 'DISABLED')}
                            className="px-2.5 py-1 text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded font-medium cursor-pointer disabled:opacity-40"
                          >
                            Deactivate
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          disabled={updatingId === u.id}
                          onClick={() => handleToggleStatus(u.id, 'ACTIVE')}
                          className="px-2.5 py-1 text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-medium cursor-pointer disabled:opacity-40"
                        >
                          Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
