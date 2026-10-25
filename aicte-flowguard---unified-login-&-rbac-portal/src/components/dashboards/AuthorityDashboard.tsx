/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, XCircle, ShieldCheck, FileCheck } from 'lucide-react';
import type { UserProfile, ApplicationItem } from '../../types/auth.ts';

interface AuthorityDashboardProps {
  user: UserProfile;
}

export const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({ user }) => {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      setApplications(data.applications || []);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleStatutoryDecision = async (appId: string, action: 'APPROVE_EOA' | 'REJECT_APPLICATION') => {
    setProcessingId(appId);
    setStatusMessage(null);
    try {
      const res = await fetch(`/api/applications/${appId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: action === 'APPROVE_EOA' ? 'Statutory sanction granted by Competent Authority under APH 2026-27.' : 'Rejected due to unrectified essential infrastructure shortfall.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStatusMessage(`Statutory sanction successfully recorded: Application ${action === 'APPROVE_EOA' ? 'APPROVED' : 'REJECTED'}.`);
      fetchApps();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Award className="w-4 h-4 text-purple-600" />
            <span>Statutory Sanctioning Authority</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Competent Authority — Statutory Approval Desk
          </h2>
          <p className="text-xs text-slate-500">
            Mandate: Final Approval Sanction under powers delegated by the Council
          </p>
        </div>

        <div className="bg-purple-50 text-purple-900 border border-purple-200 px-3.5 py-2 rounded-lg font-mono text-xs">
          Executive Authority: {user.fullName}
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Decision Roster */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Proposals Requiring Statutory Sanction (EoA / LoA)
          </h3>
          <span className="text-xs text-slate-400 font-mono">Final Decision Matrix</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading statutory cases...</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No applications pending final sanction.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {applications.map((app) => (
              <div key={app.id} className="p-6 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-900">{app.applicationNumber}</div>
                    <div className="text-sm font-semibold text-slate-900">{app.institutionName}</div>
                    <div className="text-xs text-slate-500">
                      {app.program} · Requested Intake: <strong className="text-slate-800 tabular-nums">{app.intakeRequested} seats</strong>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-semibold border ${
                    app.currentStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    app.currentStatus === 'REJECTED' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                    'bg-purple-50 text-purple-800 border-purple-200'
                  }`}>
                    {app.currentStatus}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Region: {app.region} · Permanent ID: {app.institutionId}</span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={processingId === app.id || app.currentStatus === 'REJECTED'}
                      onClick={() => handleStatutoryDecision(app.id, 'REJECT_APPLICATION')}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded text-xs font-semibold cursor-pointer disabled:opacity-40"
                    >
                      Issue Rejection
                    </button>
                    <button
                      type="button"
                      disabled={processingId === app.id || app.currentStatus === 'APPROVED'}
                      onClick={() => handleStatutoryDecision(app.id, 'APPROVE_EOA')}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Sanction Approval (EoA / LoA)</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
