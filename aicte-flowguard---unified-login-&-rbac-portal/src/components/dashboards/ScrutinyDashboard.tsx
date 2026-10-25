/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CheckSquare, AlertTriangle, ArrowRight, ShieldCheck, FileCheck, CheckCircle2 } from 'lucide-react';
import type { UserProfile, ApplicationItem } from '../../types/auth.ts';

interface ScrutinyDashboardProps {
  user: UserProfile;
}

export const ScrutinyDashboard: React.FC<ScrutinyDashboardProps> = ({ user }) => {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<ApplicationItem | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      setApplications(data.applications || []);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleAction = async (appId: string, action: 'RECORD_DEFICIENCY' | 'RECOMMEND_EVC') => {
    setProcessing(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/applications/${appId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: actionNotes || (action === 'RECOMMEND_EVC' ? 'Documents verified. Recommended for physical EVC.' : 'Deficiency observed in cadre ratio.'),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMessage(`Statutory Scrutiny action '${action}' recorded and cryptographically logged.`);
      setSelectedApp(null);
      setActionNotes('');
      fetchApps();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Stat Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Scrutiny & Re-Scrutiny Committee Desk
          </h2>
          <p className="text-xs text-slate-500">
            Mandate: Approval Process Handbook (APH 2026-27) Statutory Document Verification
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
            <span className="text-slate-500">Queue Items: </span>
            <strong className="text-slate-900">{applications.length}</strong>
          </div>
          <div className="bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded border border-emerald-200">
            <span>Committee: Delhi HQ Scrutiny Cell</span>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Applications Queue */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Applications Assigned for Document Scrutiny
          </h3>
          <span className="text-xs text-slate-400 font-mono">APH Clause 4.1 Verification</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading scrutiny queue...</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No applications currently pending scrutiny.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {applications.map((app) => (
              <div key={app.id} className="p-6 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                      <span className="font-bold text-slate-900">{app.applicationNumber}</span>
                      <span aria-hidden="true">·</span>
                      <span>Region: {app.region}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900">{app.institutionName}</div>
                    <div className="text-xs text-slate-600">
                      Program: <span className="font-medium text-slate-800">{app.program}</span> ({app.level}) · Intake: {app.intakeRequested}
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <span className="inline-block px-2.5 py-0.5 rounded text-xs font-mono font-semibold border bg-blue-50 text-blue-800 border-blue-200">
                      {app.currentStatus}
                    </span>
                  </div>
                </div>

                {/* Scrutiny Controls */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    {app.deficiencies.length > 0 ? (
                      <span className="text-amber-700 font-medium">
                        ⚠ {app.deficiencies.length} deficiency recorded
                      </span>
                    ) : (
                      <span>No deficiencies flagged yet.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction(app.id, 'RECORD_DEFICIENCY')}
                      disabled={processing}
                      className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer"
                    >
                      Record APH Deficiency
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(app.id, 'RECOMMEND_EVC')}
                      disabled={processing}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Recommend for EVC Inspection</span>
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
