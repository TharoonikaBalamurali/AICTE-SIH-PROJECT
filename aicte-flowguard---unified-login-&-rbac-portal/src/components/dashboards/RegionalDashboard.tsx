/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Building, Calendar, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { UserProfile, ApplicationItem } from '../../types/auth.ts';

interface RegionalDashboardProps {
  user: UserProfile;
}

export const RegionalDashboard: React.FC<RegionalDashboardProps> = ({ user }) => {
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
      {/* Jurisdiction Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-slate-700" />
            <span>Territorial Jurisdiction</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Western Regional Office (WRO) — Mumbai Directorate
          </h2>
          <p className="text-xs text-slate-500">
            States: Maharashtra, Goa, Daman & Diu | Officer: {user.fullName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-center font-mono text-xs">
            <div className="text-slate-500 text-[10px]">Territory Applications</div>
            <div className="text-base font-bold text-slate-900 tabular-nums">{applications.length}</div>
          </div>
        </div>
      </div>

      {/* Territorial Applications Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Institutional Applications in Jurisdictional Queue
          </h3>
          <span className="text-xs text-slate-400 font-mono">Territory: {user.region}</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading territorial applications...</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No applications in this regional queue.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {applications.map((app) => (
              <div key={app.id} className="p-6 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-900">{app.applicationNumber}</div>
                    <div className="text-sm font-semibold text-slate-900">{app.institutionName}</div>
                    <div className="text-xs text-slate-500">
                      {app.program} · Requested: <strong className="text-slate-700 tabular-nums">{app.intakeRequested} seats</strong>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded text-xs font-mono font-semibold border bg-slate-100 text-slate-800 border-slate-200">
                    {app.currentStatus}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Assigned Scrutinizer: {app.assignedScrutinizer || 'Pending Scrutiny Panel'}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => alert(`Forwarding ${app.applicationNumber} to Central Approval Bureau.`)}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
                    >
                      Forward to Bureau
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
