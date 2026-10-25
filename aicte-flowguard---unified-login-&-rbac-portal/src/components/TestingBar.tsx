/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserCheck, Key, ShieldAlert, AlertTriangle, Users, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import type { UserRole } from '../types/auth.ts';

export interface PersonaSeed {
  loginId: string;
  role: UserRole | 'MULTI_ROLE' | 'DISABLED' | 'UNASSIGNED';
  roleName: string;
  label: string;
  name: string;
  notes: string;
}

export const TEST_PERSONAS: PersonaSeed[] = [
  {
    loginId: 'INST-MH-1004',
    role: 'INSTITUTION_APPLICANT',
    roleName: 'Applicant / Representative',
    label: '1. Institution Applicant',
    name: 'Dr. Rajesh Deshmukh',
    notes: 'IIIT Pune (ID: 1-332910401). Isolated data view.',
  },
  {
    loginId: 'SCRU-HQ-2041',
    role: 'SCRUTINY_OFFICIAL',
    roleName: 'Scrutiny Official',
    label: '2. Scrutiny Official',
    name: 'Prof. Ananya Sharma',
    notes: 'Document verification & APH clause compliance.',
  },
  {
    loginId: 'RO-WRO-3011',
    role: 'REGIONAL_OFFICER',
    roleName: 'Regional Officer',
    label: '3. Regional Officer',
    name: 'Shri Vikram Patil',
    notes: 'Western Regional Office (WRO) jurisdiction.',
  },
  {
    loginId: 'EVCC-HQ-4019',
    role: 'EVC_COORDINATOR',
    roleName: 'EVC Coordinator',
    label: '4. EVC Coordinator',
    name: 'Dr. Ramesh Sundaram',
    notes: 'Constitute inspection teams & schedules.',
  },
  {
    loginId: 'EVCM-EXP-5022',
    role: 'EVC_MEMBER',
    roleName: 'EVC Member / Inspector',
    label: '5. EVC Member / Inspector',
    name: 'Prof. Meenakshi Iyer',
    notes: 'On-site infrastructure & geotagged audits.',
  },
  {
    loginId: 'SHC-JUD-6014',
    role: 'SHC_MEMBER',
    roleName: 'SHC Member',
    label: '6. SHC Member',
    name: 'Hon. Justice Verma',
    notes: 'Quasi-judicial Standing Hearing Committee.',
  },
  {
    loginId: 'SAC-APP-7008',
    role: 'SAC_MEMBER',
    roleName: 'SAC Member',
    label: '7. SAC Member',
    name: 'Dr. B. N. Roy',
    notes: 'Standing Appellate Committee appellate forum.',
  },
  {
    loginId: 'CA-EXE-8001',
    role: 'COMPETENT_AUTHORITY',
    roleName: 'Competent Authority',
    label: '8. Competent Authority',
    name: 'Prof. T. G. Chandrasekhar',
    notes: 'Final statutory sanctioning authority (EoA/LoA).',
  },
  {
    loginId: 'COMP-VIG-9017',
    role: 'COMPLIANCE_OFFICIAL',
    roleName: 'Compliance Official',
    label: '9. Compliance Official',
    name: 'Smt. Kavita Nambiar',
    notes: 'Post-approval vigilance & biometric compliance.',
  },
  {
    loginId: 'BUR-CEN-0103',
    role: 'BUREAU_OFFICER',
    roleName: 'Central Bureau Officer',
    label: '10. Bureau Officer',
    name: 'Dr. Rajiv Mukhopadhyay',
    notes: 'Pan-India monitoring & cycle management.',
  },
  {
    loginId: 'SYS-ADM-1100',
    role: 'SYSTEM_ADMIN',
    roleName: 'System Administrator',
    label: '11. System Admin',
    name: 'Arun K. Srivastava',
    notes: 'User provisioning, RBAC matrix & audit viewing.',
  },
  {
    loginId: 'AUDIT-GOV-1205',
    role: 'RULES_AUDIT_OFFICER',
    roleName: 'Rules & Audit Governance',
    label: '12. Rules & Audit Officer',
    name: 'Dr. Sunita Banerjee',
    notes: 'Immutable cryptographic audit trails & APH rules.',
  },
];

export const EDGE_PERSONAS: PersonaSeed[] = [
  {
    loginId: 'MULTI-ROLE-9901',
    role: 'MULTI_ROLE',
    roleName: 'Multi-Role User',
    label: 'Multi-Role Persona',
    name: 'Dr. Sanjeev Khurana',
    notes: 'Assigned 2 roles: Regional Officer + Compliance Official. Triggers Workspace Selector.',
  },
  {
    loginId: 'INST-REVOKED-8821',
    role: 'DISABLED',
    roleName: 'Deactivated Account',
    label: 'Disabled Persona',
    name: 'Prof. Harish Chawla',
    notes: 'Status = DISABLED. Verifies server rejects deactivated credentials.',
  },
  {
    loginId: 'NEW-USER-UNASSIGNED',
    role: 'UNASSIGNED',
    roleName: 'Unassigned Account',
    label: '0-Role Persona',
    name: 'Pooja V. Nair',
    notes: 'Status = ACTIVE but roles = []. Verifies access denied with support notice.',
  },
];

interface TestingBarProps {
  onSelectPersona: (loginId: string, password?: string) => void;
  onSimulateBruteForce: () => void;
  onOpenRbacProbe?: () => void;
}

export const TestingBar: React.FC<TestingBarProps> = ({
  onSelectPersona,
  onSimulateBruteForce,
  onOpenRbacProbe,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const defaultPassword = 'AICTE@FlowGuard2026';

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(defaultPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 text-white shadow-xs">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-amber-400 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" />
            SIH26262 EVALUATOR QUICK-TEST CONSOLE:
          </span>
          <span className="text-slate-300 hidden md:inline">
            Single Unified Login Page with server-enforced RBAC for all 12 regulatory roles.
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300 bg-slate-800 px-2 py-1 rounded font-mono text-[11px] border border-slate-700">
            <span>Universal Password:</span>
            <span className="text-emerald-400 font-bold">{defaultPassword}</span>
            <button
              onClick={handleCopyPassword}
              className="text-slate-400 hover:text-white ml-1 cursor-pointer"
              title="Copy Password"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>

          {onOpenRbacProbe && (
            <button
              onClick={onOpenRbacProbe}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium text-xs transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Security Probe</span>
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium text-xs border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>{isExpanded ? 'Hide Test Personas' : 'Quick Fill Roles (15)'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Grid of 12 Roles + 3 Edge Cases */}
      {isExpanded && (
        <div className="border-t border-slate-800 bg-slate-950 px-6 py-3">
          <div className="max-w-7xl mx-auto space-y-3">
            <div>
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                12 Standard Regulatory Roles (Click to auto-fill credentials & submit):
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
                {TEST_PERSONAS.map((p) => (
                  <button
                    key={p.loginId}
                    type="button"
                    onClick={() => onSelectPersona(p.loginId, defaultPassword)}
                    className="text-left p-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs transition-colors cursor-pointer group"
                  >
                    <div className="font-medium text-slate-200 group-hover:text-amber-400 truncate">
                      {p.label}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{p.loginId}</div>
                    <div className="text-[10px] text-slate-500 truncate">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Security Edge Cases */}
            <div className="border-t border-slate-800 pt-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Security Edge Cases:
                </span>
                {EDGE_PERSONAS.map((e) => (
                  <button
                    key={e.loginId}
                    type="button"
                    onClick={() => onSelectPersona(e.loginId, defaultPassword)}
                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-amber-900/50 hover:border-amber-600/70 text-xs text-amber-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                    title={e.notes}
                  >
                    <Users className="w-3 h-3 text-amber-400" />
                    <span>{e.label}</span>
                    <span className="font-mono text-[10px] text-slate-400">({e.loginId})</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSimulateBruteForce}
                  className="px-2.5 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-xs text-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Executes 5 consecutive failed sign-in attempts to verify 15-min lockout"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Test Rate-Limit Lockout (5 Fails)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
