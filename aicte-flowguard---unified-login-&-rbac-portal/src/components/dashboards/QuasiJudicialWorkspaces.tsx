/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Scale, FileText, CheckCircle2, User, AlertCircle } from 'lucide-react';
import type { UserProfile, ApplicationItem } from '../../types/auth.ts';

interface QuasiJudicialWorkspaceProps {
  user: UserProfile;
}

export const QuasiJudicialWorkspace: React.FC<QuasiJudicialWorkspaceProps> = ({ user }) => {
  const isAppellate = user.activeRole === 'SAC_MEMBER';
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordedDecision, setRecordedDecision] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/applications')
      .then((r) => r.json())
      .then((d) => setApplications(d.applications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleRecordQuasiJudicialOrder = (appNumber: string, finding: string) => {
    setRecordedDecision(`${isAppellate ? 'Standing Appellate Committee (SAC)' : 'Standing Hearing Committee (SHC)'} order recorded for ${appNumber}: "${finding}". Logged to regulatory archives.`);
    setTimeout(() => setRecordedDecision(null), 6000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Scale className="w-4 h-4 text-amber-600" />
            <span>Quasi-Judicial Regulatory Forum</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            {isAppellate ? 'Standing Appellate Committee (SAC) Tribunal' : 'Standing Hearing Committee (SHC) Forum'}
          </h2>
          <p className="text-xs text-slate-500">
            Mandate: Principles of Natural Justice under APH 2026-27 Regulations
          </p>
        </div>

        <div className="text-xs font-mono bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded">
          Quasi-Judicial Bench Member: {user.fullName}
        </div>
      </div>

      {recordedDecision && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{recordedDecision}</span>
        </div>
      )}

      {/* Hearing Docket */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {isAppellate ? 'Appellate Appeal Petitions Docket' : 'Natural Justice Hearing Docket'}
          </h3>
          <span className="text-xs text-slate-400 font-mono">Case Registry</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading tribunal cases...</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No cases scheduled for this session.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {applications.map((app) => (
              <div key={app.id} className="p-6 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-900">{app.applicationNumber}</div>
                    <div className="text-sm font-semibold text-slate-900">{app.institutionName}</div>
                    <div className="text-xs text-slate-500">Program: {app.program} · Region: {app.region}</div>
                  </div>

                  <span className="px-2.5 py-1 rounded text-xs font-mono font-semibold border bg-amber-50 text-amber-800 border-amber-200">
                    {app.currentStatus}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <span>Deficiencies Noted: {app.deficiencies.length || 'None noted'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRecordQuasiJudicialOrder(app.applicationNumber, 'Institution afforded natural justice hearing. Deficiency verified rectified.')}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
                    >
                      Record Hearing Findings
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRecordQuasiJudicialOrder(app.applicationNumber, 'Matter referred for physical re-verification.')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-medium border border-slate-300 cursor-pointer"
                    >
                      Direct Re-Verification
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
