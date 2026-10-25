/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole =
  | 'INSTITUTION_APPLICANT'
  | 'SCRUTINY_OFFICIAL'
  | 'REGIONAL_OFFICER'
  | 'EVC_COORDINATOR'
  | 'EVC_MEMBER'
  | 'SHC_MEMBER'
  | 'SAC_MEMBER'
  | 'COMPETENT_AUTHORITY'
  | 'COMPLIANCE_OFFICIAL'
  | 'BUREAU_OFFICER'
  | 'SYSTEM_ADMIN'
  | 'RULES_AUDIT_OFFICER';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'PENDING_VERIFICATION';

export interface Permission {
  code: string;
  name: string;
  description: string;
}

export interface UserProfile {
  id: string;
  loginId: string;
  fullName: string;
  designation: string;
  email: string;
  department: string;
  region?: string;
  institutionId?: string;
  institutionName?: string;
  status: AccountStatus;
  roles: UserRole[];
  activeRole: UserRole | null;
  permissions: string[];
  createdAt: string;
  lastLoginAt?: string;
  failedAttempts?: number;
  lockUntil?: string | null;
}

export interface AuthSession {
  token: string;
  user: UserProfile;
  expiresAt: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  session?: AuthSession;
  requiresWorkspaceSelection?: boolean;
  availableRoles?: UserRole[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  loginId: string;
  role: string;
  action: string;
  category: 'AUTH' | 'RBAC_SECURITY' | 'WORKFLOW' | 'ADMIN' | 'GOVERNANCE';
  status: 'SUCCESS' | 'DENIED' | 'FAILED' | 'SUSPICIOUS';
  ipAddress: string;
  details: string;
  institutionId?: string;
}

export interface ApplicationItem {
  id: string;
  applicationNumber: string;
  institutionId: string;
  institutionName: string;
  region: string;
  level: string; // UG, PG, Diploma
  program: string; // Engineering, Management, Pharmacy
  intakeRequested: number;
  currentStatus:
    | 'DRAFT'
    | 'SUBMITTED'
    | 'UNDER_SCRUTINY'
    | 'DEFICIENCY_NOTED'
    | 'EVC_SCHEDULED'
    | 'EVC_COMPLETED'
    | 'SHC_HEARING'
    | 'SAC_APPEAL'
    | 'PENDING_AUTHORITY_DECISION'
    | 'APPROVED'
    | 'REJECTED';
  submittedDate: string;
  assignedScrutinizer?: string;
  assignedEVCId?: string;
  aphClauseViolations?: string[];
  deficiencies: Array<{
    id: string;
    description: string;
    clause: string;
    status: 'OPEN' | 'RESOLVED';
  }>;
}

export interface RoleConfig {
  role: UserRole;
  title: string;
  shortTitle: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  statutoryAuthority: string;
  landingRoute: string;
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  INSTITUTION_APPLICANT: {
    role: 'INSTITUTION_APPLICANT',
    title: 'Institution Representative / Applicant',
    shortTitle: 'Applicant Portal',
    description: 'Submit institutional approval proposals, monitor evaluation phases, upload deficiency rectifications.',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    statutoryAuthority: 'Section 10(k), AICTE Act 1987 (Institutional Applicant Representation)',
    landingRoute: '/dashboard/institution',
  },
  SCRUTINY_OFFICIAL: {
    role: 'SCRUTINY_OFFICIAL',
    title: 'Scrutiny & Re-Scrutiny Official',
    shortTitle: 'Scrutiny Committee',
    description: 'Conduct document verification against Approval Process Handbook (APH) clauses and record statutory deficiencies.',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    statutoryAuthority: 'Approval Bureau Scrutiny Committee delegated under APH 2026-27',
    landingRoute: '/dashboard/scrutiny',
  },
  REGIONAL_OFFICER: {
    role: 'REGIONAL_OFFICER',
    title: 'Regional Officer (RO)',
    shortTitle: 'Regional Office',
    description: 'Jurisdictional supervision, institutional territory administration, and statutory case routing.',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    statutoryAuthority: 'Regional Directorate Jurisdiction under AICTE Regional Guidelines',
    landingRoute: '/dashboard/regional',
  },
  EVC_COORDINATOR: {
    role: 'EVC_COORDINATOR',
    title: 'Expert Visit Committee Coordinator',
    shortTitle: 'EVC Coordination',
    description: 'Constitute physical/virtual inspection teams, assign expert members, and coordinate inspection schedules.',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    statutoryAuthority: 'EVC Operational Taskforce delegated by Approval Bureau',
    landingRoute: '/dashboard/evc-coordinator',
  },
  EVC_MEMBER: {
    role: 'EVC_MEMBER',
    title: 'EVC Member / Inspector',
    shortTitle: 'EVC Inspection',
    description: 'On-site infrastructure inspection, land and faculty biometric verification, live photographic geotagging.',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-800',
    statutoryAuthority: 'Statutory Inspection Authority under AICTE Approval Process Regulations',
    landingRoute: '/dashboard/evc-member',
  },
  SHC_MEMBER: {
    role: 'SHC_MEMBER',
    title: 'Standing Hearing Committee (SHC) Member',
    shortTitle: 'Standing Hearing',
    description: 'Quasi-judicial natural justice hearings for institutions with unrectified major deficiencies.',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    statutoryAuthority: 'AICTE Standing Hearing Committee (APH Chapter VIII Quasi-Judicial Forum)',
    landingRoute: '/dashboard/shc',
  },
  SAC_MEMBER: {
    role: 'SAC_MEMBER',
    title: 'Standing Appellate Committee (SAC) Member',
    shortTitle: 'Standing Appellate',
    description: 'Appellate examination of rejected petitions and disputed committee findings.',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-800',
    statutoryAuthority: 'AICTE Standing Appellate Committee (Supreme Quasi-Judicial Appellate Body)',
    landingRoute: '/dashboard/sac',
  },
  COMPETENT_AUTHORITY: {
    role: 'COMPETENT_AUTHORITY',
    title: 'Competent Authority (Decision-Making Official)',
    shortTitle: 'Competent Authority',
    description: 'Final statutory sanctioning authority for Extension of Approval (EoA) and Letter of Approval (LoA).',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    statutoryAuthority: 'Executive Committee / Chairman, AICTE under statutory powers',
    landingRoute: '/dashboard/competent-authority',
  },
  COMPLIANCE_OFFICIAL: {
    role: 'COMPLIANCE_OFFICIAL',
    title: 'Compliance & Vigilance Monitoring Official',
    shortTitle: 'Compliance Desk',
    description: 'Track post-approval conditions, annual biometric compliance, court undertakings, and statutory returns.',
    badgeBg: 'bg-cyan-50',
    badgeText: 'text-cyan-800',
    statutoryAuthority: 'Vigilance & Continuous Compliance Cell, AICTE HQ',
    landingRoute: '/dashboard/compliance',
  },
  BUREAU_OFFICER: {
    role: 'BUREAU_OFFICER',
    title: 'Central Bureau Monitoring Officer',
    shortTitle: 'Central Monitoring',
    description: 'National overview across all regions, cycle deadline tracking, and macro bottleneck resolution.',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-800',
    statutoryAuthority: 'Central Approval Bureau, AICTE New Delhi Headquarters',
    landingRoute: '/dashboard/bureau',
  },
  SYSTEM_ADMIN: {
    role: 'SYSTEM_ADMIN',
    title: 'System Administrator',
    shortTitle: 'System Admin',
    description: 'Technical user provisioning, RBAC matrix management, system telemetry, and credential safeguards.',
    badgeBg: 'bg-zinc-100',
    badgeText: 'text-zinc-900',
    statutoryAuthority: 'AICTE IT & e-Governance Division (Technical Custodian)',
    landingRoute: '/dashboard/admin',
  },
  RULES_AUDIT_OFFICER: {
    role: 'RULES_AUDIT_OFFICER',
    title: 'Rules & Audit Governance Official',
    shortTitle: 'Rules & Audit',
    description: 'APH version rules governance, deterministic workflow validation, and immutable security audit logs.',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    statutoryAuthority: 'Statutory Regulation & Policy Governance Directorate',
    landingRoute: '/dashboard/audit',
  },
};
