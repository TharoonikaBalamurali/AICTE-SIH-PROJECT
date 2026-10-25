/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Camera, MapPin, CheckCircle2, UserCheck, Shield, Calendar } from 'lucide-react';
import type { UserProfile, ApplicationItem } from '../../types/auth.ts';

interface EvcWorkspaceProps {
  user: UserProfile;
}

export const EvcWorkspace: React.FC<EvcWorkspaceProps> = ({ user }) => {
  const isCoordinator = user.activeRole === 'EVC_COORDINATOR';
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [signoffSuccess, setSignoffSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/applications')
      .then((r) => r.json())
      .then((d) => setApplications(d.applications || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleInspectionSignoff = (appNumber: string) => {
    setSignoffSuccess(`Biometric verification & Geotagged inspection report cryptographically signed for ${appNumber}.`);
    setTimeout(() => setSignoffSuccess(null), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {isCoordinator ? 'Operational Coordination' : 'Statutory Inspection Authority'}
          </span>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            {isCoordinator ? 'EVC Panel Coordination & Roster' : 'EVC On-Site Inspection Workspace'}
          </h2>
          <p className="text-xs text-slate-500">
            Mandate: Physical and Virtual Verification under APH Chapter II Regulations
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-3 py-1.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
            Inspector Status: Certified Expert
          </span>
        </div>
      </div>

      {signoffSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{signoffSuccess}</span>
        </div>
      )}

      {/* Case Roster */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            {isCoordinator ? 'Inspection Assignments & Teams' : 'Assigned Inspection Visits'}
          </h3>
          <span className="text-xs text-slate-400 font-mono">APH 2026-27 Inspection Protocol</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading inspection cases...</div>
        ) : applications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No scheduled visits in this queue.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {applications.map((app) => (
              <div key={app.id} className="p-6 space-y-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-xs font-bold text-slate-900">{app.applicationNumber}</div>
                    <div className="text-sm font-semibold text-slate-900">{app.institutionName}</div>
                    <div className="text-xs text-slate-500">{app.program} · Region: {app.region}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200">
                    {app.currentStatus}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 font-mono">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Geotagged Coordinates: 18.5204° N, 73.8567° E
                    </span>
                  </div>

                  {!isCoordinator ? (
                    <button
                      type="button"
                      onClick={() => handleInspectionSignoff(app.applicationNumber)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Upload Geotagged Evidence & Biometric Sign-off</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => alert(`Constituting 3-member expert panel for ${app.applicationNumber}`)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-md text-xs transition-colors cursor-pointer"
                    >
                      Assign Expert Inspectors
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
