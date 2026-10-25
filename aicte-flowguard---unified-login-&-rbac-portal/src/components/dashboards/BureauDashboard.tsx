/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Globe, BarChart3, CheckCircle2, Clock, Building } from 'lucide-react';
import type { UserProfile, ApplicationItem } from '../../types/auth.ts';

interface BureauDashboardProps {
  user: UserProfile;
}

export const BureauDashboard: React.FC<BureauDashboardProps> = ({ user }) => {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/applications')
      .then((r) => r.json())
      .then((d) => setApplications(d.applications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Globe className="w-4 h-4 text-sky-600" />
            <span>HQ Strategic Oversight</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Central Approval Bureau — Pan-India Cycle Monitoring
          </h2>
          <p className="text-xs text-slate-500">
            Mandate: All-India approval cycle oversight, macro timeline enforcement, and regional coordination
          </p>
        </div>

        <div className="bg-sky-50 text-sky-900 border border-sky-200 px-3.5 py-2 rounded-lg font-mono text-xs">
          Bureau Officer: {user.fullName}
        </div>
      </div>

      {/* Macro Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Pan-India Submissions</div>
          <div className="text-2xl font-bold text-slate-900 font-mono mt-1 tabular-nums">{applications.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">AY 2026-27 Active</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Under Scrutiny</div>
          <div className="text-2xl font-bold text-blue-700 font-mono mt-1 tabular-nums">
            {applications.filter((a) => a.currentStatus === 'UNDER_SCRUTINY' || a.currentStatus === 'DEFICIENCY_NOTED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Document review phase</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="text-xs text-slate-500 font-medium">EVC / Hearings</div>
          <div className="text-2xl font-bold text-amber-700 font-mono mt-1 tabular-nums">
            {applications.filter((a) => a.currentStatus === 'EVC_SCHEDULED' || a.currentStatus === 'SHC_HEARING').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Inspection / hearing</div>
        </div>

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Sanctioned (EoA/LoA)</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1 tabular-nums">
            {applications.filter((a) => a.currentStatus === 'APPROVED').length}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Council approved</div>
        </div>
      </div>

      {/* National Registry Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            National Regulatory Registry View
          </h3>
          <span className="text-xs text-slate-400 font-mono">Central Approval Bureau HQ</span>
        </div>

        <div className="divide-y divide-slate-100">
          {applications.map((app) => (
            <div key={app.id} className="p-5 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div>
                <span className="font-mono font-bold text-slate-900">{app.applicationNumber}</span>
                <span className="text-slate-400 mx-2">·</span>
                <span className="font-medium text-slate-800">{app.institutionName}</span>
                <div className="text-slate-500 text-[11px] mt-0.5">{app.program} ({app.region})</div>
              </div>

              <span className="px-2.5 py-1 rounded font-mono font-semibold text-slate-800 bg-slate-100 border border-slate-200">
                {app.currentStatus}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
