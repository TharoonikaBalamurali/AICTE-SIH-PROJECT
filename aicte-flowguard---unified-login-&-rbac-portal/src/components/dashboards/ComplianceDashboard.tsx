/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, CheckCircle2, Clock, Eye } from 'lucide-react';
import type { UserProfile } from '../../types/auth.ts';

interface ComplianceDashboardProps {
  user: UserProfile;
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ user }) => {
  const [surpriseVisits, setSurpriseVisits] = useState([
    {
      id: 'sv_01',
      institution: 'Trinity Engineering Academy, Pune',
      clause: 'Biometric Faculty Attendance Regularity',
      status: 'UNDER_INVESTIGATION',
      initiatedDate: '2026-03-01',
    },
    {
      id: 'sv_02',
      institution: 'Apex Polytechnic Institute, Nagpur',
      clause: 'Mandatory Land Title & Non-Encumbrance Audit',
      status: 'NOTICE_ISSUED',
      initiatedDate: '2026-02-20',
    },
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-cyan-600" />
            <span>Vigilance & Post-Approval Cell</span>
          </div>
          <h2 className="text-lg font-bold text-slate-900 mt-1">
            Compliance Monitoring & Surprise Inspection Desk
          </h2>
          <p className="text-xs text-slate-500">
            Mandate: Post-approval conditions verification and annual biometric returns audit
          </p>
        </div>

        <div className="bg-cyan-50 text-cyan-900 border border-cyan-200 px-3.5 py-2 rounded-lg font-mono text-xs">
          Monitoring Officer: {user.fullName}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">
            Active Vigilance & Post-Approval Inquiries
          </h3>
          <span className="text-xs text-slate-400 font-mono">Continuous Compliance Monitoring</span>
        </div>

        <div className="divide-y divide-slate-100">
          {surpriseVisits.map((item) => (
            <div key={item.id} className="p-6 space-y-2 hover:bg-slate-50/50 transition-colors">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">{item.institution}</div>
                  <div className="text-xs text-slate-600 font-medium">Flagged Item: {item.clause}</div>
                  <div className="text-xs text-slate-400 font-mono">Initiated: {item.initiatedDate}</div>
                </div>

                <span className="px-2.5 py-1 rounded text-xs font-mono font-semibold border bg-cyan-50 text-cyan-800 border-cyan-200">
                  {item.status}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => alert(`Issued Show-Cause Notice to ${item.institution}`)}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
                >
                  Issue Formal Notice
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
