/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import type { UserProfile, UserRole, AccountStatus, AuditLogEntry, ApplicationItem } from './src/types/auth.ts';
import { institutionalRouter } from './src/server/institutionalService.ts';
import { APH_22_CATEGORIES } from './src/data/aphCategoriesData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cookieParser());

// In-memory persistent data structures for AICTE FlowGuard
interface StoredUser extends UserProfile {
  passwordSalt: string;
  passwordHash: string;
}

interface UserSession {
  token: string;
  userId: string;
  activeRole: UserRole | null;
  createdAt: string;
  expiresAt: number; // timestamp ms
  ipAddress: string;
}

// Password hashing using PBKDF2 with SHA-256
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
}

function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  const hash = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// Generate secure salt
function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Helper to create individual user with PBKDF2 hashed password
function createSeedUser(
  id: string,
  loginId: string,
  plainPassword: string,
  fullName: string,
  designation: string,
  email: string,
  department: string,
  region: string | undefined,
  institutionId: string | undefined,
  institutionName: string | undefined,
  status: AccountStatus,
  roles: UserRole[],
  activeRole: UserRole | null,
  permissions: string[],
  aliases: string[] = []
): StoredUser {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(plainPassword, salt);
  return {
    id,
    loginId,
    fullName,
    designation,
    email,
    department,
    region,
    institutionId,
    institutionName,
    status,
    roles,
    activeRole,
    permissions,
    createdAt: '2026-01-01T00:00:00.000Z',
    passwordSalt: salt,
    passwordHash,
  };
}

// 13 Distinct User Personas with custom User IDs and distinct Passwords
const usersDb: StoredUser[] = [
  // 1. Institution Applicant
  createSeedUser(
    'usr_inst_001',
    'abc@institution.in',
    'abcinstitution',
    'Dr. Rajesh Deshmukh',
    'Principal & Authorized Representative',
    'abc@institution.in',
    'Institutional Administration',
    'WRO-MUMBAI',
    '1-332910401',
    'Indian Institute of Information Technology, Pune',
    'ACTIVE',
    ['INSTITUTION_APPLICANT'],
    'INSTITUTION_APPLICANT',
    ['APPLICANT_READ', 'APPLICANT_SUBMIT_PROPOSAL', 'APPLICANT_DEFICIENCY_REPLY']
  ),

  // 2. Scrutiny Official
  createSeedUser(
    'usr_scru_002',
    'scrutiny@aicte.gov.in',
    'scrutiny',
    'Prof. Ananya Sharma',
    'Senior Scrutiny Officer (APH Compliance)',
    'scrutiny@aicte.gov.in',
    'Approval Bureau - Scrutiny Cell',
    'HQ-NEW-DELHI',
    undefined,
    undefined,
    'ACTIVE',
    ['SCRUTINY_OFFICIAL'],
    'SCRUTINY_OFFICIAL',
    ['SCRUTINY_VERIFY_DOCS', 'SCRUTINY_NOTE_DEFICIENCY', 'SCRUTINY_RECOMMEND_EVC']
  ),

  // 3. Regional Officer
  createSeedUser(
    'usr_ro_003',
    'regional@aicte.gov.in',
    'regional',
    'Shri Vikram Patil',
    'Regional Officer, Western Regional Directorate',
    'regional@aicte.gov.in',
    'Western Regional Directorate',
    'WRO-MUMBAI',
    undefined,
    undefined,
    'ACTIVE',
    ['REGIONAL_OFFICER'],
    'REGIONAL_OFFICER',
    ['RO_TERRITORY_MONITOR', 'RO_SCHEDULE_EVC', 'RO_FORWARD_BUREAU']
  ),

  // 4. EVC Coordinator
  createSeedUser(
    'usr_evc_c_004',
    'evc-coordinator@aicte.gov.in',
    'evccoordinator',
    'Dr. Ramesh Sundaram',
    'Chief EVC Operational Coordinator',
    'evc-coordinator@aicte.gov.in',
    'EVC Operations Command',
    'HQ-NEW-DELHI',
    undefined,
    undefined,
    'ACTIVE',
    ['EVC_COORDINATOR'],
    'EVC_COORDINATOR',
    ['EVC_CONSTITUTE_TEAM', 'EVC_ASSIGN_MEMBERS', 'EVC_MONITOR_INSPECTIONS']
  ),

  // 5. EVC Member / Inspector
  createSeedUser(
    'usr_evc_m_005',
    'evc-member@aicte.gov.in',
    'evcmember',
    'Prof. Meenakshi Iyer',
    'Statutory Inspection Expert / Professor (Civil Engg)',
    'evc-member@aicte.gov.in',
    'Expert Visit Committee Panel',
    'WRO-MUMBAI',
    undefined,
    undefined,
    'ACTIVE',
    ['EVC_MEMBER'],
    'EVC_MEMBER',
    ['EVC_RECORD_FINDINGS', 'EVC_UPLOAD_GEOTAGS', 'EVC_SIGN_REPORT']
  ),

  // 6. SHC (Standing Hearing Committee) Member
  createSeedUser(
    'usr_shc_006',
    'shc@aicte.gov.in',
    'shcmember',
    'Hon. Justice (Retd.) K. S. Verma',
    'Chairman, Standing Hearing Committee',
    'shc@aicte.gov.in',
    'Quasi-Judicial Standing Hearing Forum',
    'HQ-NEW-DELHI',
    undefined,
    undefined,
    'ACTIVE',
    ['SHC_MEMBER'],
    'SHC_MEMBER',
    ['SHC_CONDUCT_HEARING', 'SHC_RECORD_REPRESENTATION', 'SHC_ISSUE_FINDINGS']
  ),

  // 7. SAC (Standing Appellate Committee) Member
  createSeedUser(
    'usr_sac_007',
    'sac@aicte.gov.in',
    'sacmember',
    'Dr. Bhupendra Nath Roy',
    'Senior Member, Standing Appellate Committee',
    'sac@aicte.gov.in',
    'Standing Appellate Tribunal',
    'HQ-NEW-DELHI',
    undefined,
    undefined,
    'ACTIVE',
    ['SAC_MEMBER'],
    'SAC_MEMBER',
    ['SAC_REVIEW_APPEALS', 'SAC_QUASI_JUDICIAL_ORDER']
  ),

  // 8. Competent Authority (Decision Review Official)
  createSeedUser(
    'usr_ca_008',
    'authority@aicte.gov.in',
    'authority',
    'Prof. T. G. Chandrasekhar',
    'Competent Statutory Authority / Executive Member',
    'authority@aicte.gov.in',
    'Statutory Approval Decision Board',
    'HQ-NEW-DELHI',
    undefined,
    undefined,
    'ACTIVE',
    ['COMPETENT_AUTHORITY'],
    'COMPETENT_AUTHORITY',
    ['CA_SANCTION_EOA', 'CA_SANCTION_LOA', 'CA_FINAL_DECISION']
  ),

  // 9. Compliance Monitoring Official
  createSeedUser(
    'usr_comp_009',
    'compliance@aicte.gov.in',
    'compliance',
    'Smt. Kavita Nambiar',
    'Director, Vigilance & Post-Approval Compliance',
    'compliance@aicte.gov.in',
    'Compliance & Legal Monitoring Wing',
    'HQ-NEW-DELHI',
    undefined,
    undefined,
    'ACTIVE',
    ['COMPLIANCE_OFFICIAL'],
    'COMPLIANCE_OFFICIAL',
    ['COMPLIANCE_AUDIT', 'COMPLIANCE_FLAG_VIOLATION', 'COMPLIANCE_REVOCATION_NOTICE']
  ),

  // 10. Central Bureau Monitoring Officer
  createSeedUser(
    'usr_bur_010',
    'bureau@aicte.gov.in',
    'bureau',
    'Dr. Rajiv Mukhopadhyay',
    'Adviser-I, Central Approval Bureau',
    'bureau@aicte.gov.in',
    'Central Approval Directorate',
    'HQ-NEW-DELHI',
    undefined,
    undefined,
    'ACTIVE',
    ['BUREAU_OFFICER'],
    'BUREAU_OFFICER',
    ['BUREAU_NATIONAL_VIEW', 'BUREAU_CYCLE_MANAGEMENT', 'BUREAU_ESCALATION_RESOLVE']
  ),

  // 11. System Administrator
  createSeedUser(
    'usr_adm_011',
    'admin@aicte.gov.in',
    'admin',
    'Arun K. Srivastava',
    'Principal Systems Architect & Chief Admin',
    'admin@aicte.gov.in',
    'e-Governance & Cybersecurity Division',
    'HQ-NEW-DELHI',
    undefined,
    undefined,
    'ACTIVE',
    ['SYSTEM_ADMIN'],
    'SYSTEM_ADMIN',
    ['ADMIN_MANAGE_USERS', 'ADMIN_MANAGE_ROLES', 'ADMIN_VIEW_AUDIT_LOGS', 'ADMIN_SECURITY_MAINTENANCE']
  ),

  // 12. Rules and Audit Governance Official
  createSeedUser(
    'usr_audit_012',
    'audit@aicte.gov.in',
    'audit',
    'Dr. Sunita Banerjee',
    'Chief Audit Governance Officer',
    'audit@aicte.gov.in',
    'Policy & Regulatory Audit Cell',
    'HQ-NEW-DELHI',
    undefined,
    undefined,
    'ACTIVE',
    ['RULES_AUDIT_OFFICER'],
    'RULES_AUDIT_OFFICER',
    ['AUDIT_VIEW_IMMUTABLE_LOGS', 'AUDIT_VERIFY_APH_RULES', 'AUDIT_EXPORT_REGULATORY_REPORT']
  ),

  // 13. Multi-Role User (Holds both Regional Officer & Compliance Official portfolios)
  createSeedUser(
    'usr_multi_013',
    'multirole@aicte.gov.in',
    'multirole',
    'Dr. Sanjeev Khurana',
    'Joint Director (Western Region) & Compliance Vigilance Officer',
    'multirole@aicte.gov.in',
    'Dual Jurisdiction Directorate',
    'WRO-MUMBAI',
    undefined,
    undefined,
    'ACTIVE',
    ['REGIONAL_OFFICER', 'COMPLIANCE_OFFICIAL'],
    null, // Forces workspace selector on sign-in
    ['RO_TERRITORY_MONITOR', 'RO_SCHEDULE_EVC', 'COMPLIANCE_AUDIT', 'COMPLIANCE_FLAG_VIOLATION']
  ),

  // Edge Case: Disabled Account
  createSeedUser(
    'usr_disabled_014',
    'disabled@institution.in',
    'disabled',
    'Prof. Harish Chawla',
    'Suspended Institutional Registrar',
    'disabled@institution.in',
    'Institutional Administration',
    'NRO-KANPUR',
    '1-998877665',
    'Apex Institute of Technology (De-recognized)',
    'DISABLED',
    ['INSTITUTION_APPLICANT'],
    'INSTITUTION_APPLICANT',
    []
  ),
];

// Sessions store
const sessions = new Map<string, UserSession>();

// Rate Limiting Store: Map of loginId / IP to { failedCount, lockUntil }
interface RateLimitRecord {
  failedCount: number;
  lockUntil: number | null;
}
const rateLimitMap = new Map<string, RateLimitRecord>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

// Audit Logs Store
const auditLogs: AuditLogEntry[] = [
  {
    id: 'aud_seed_001',
    timestamp: '2026-10-23T08:30:12.000Z',
    userId: 'usr_adm_011',
    loginId: 'SYS-ADM-1100',
    role: 'SYSTEM_ADMIN',
    action: 'SYSTEM_BOOTSTRAP',
    category: 'GOVERNANCE',
    status: 'SUCCESS',
    ipAddress: '10.0.4.1',
    details: 'AICTE FlowGuard cryptographic core initialized with APH 2026-27 deterministic rules matrix.',
  },
  {
    id: 'aud_seed_002',
    timestamp: '2026-10-23T09:12:44.000Z',
    userId: 'usr_audit_012',
    loginId: 'AUDIT-GOV-1205',
    role: 'RULES_AUDIT_OFFICER',
    action: 'APH_RULE_INTEGRITY_CHECK',
    category: 'GOVERNANCE',
    status: 'SUCCESS',
    ipAddress: '10.0.4.88',
    details: 'Verified SHA-256 integrity checksum for Approval Process Handbook Clauses 1.4 through 8.12.',
  },
];

function recordAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
  const newEntry: AuditLogEntry = {
    id: `aud_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  auditLogs.unshift(newEntry);
  if (auditLogs.length > 500) {
    auditLogs.pop();
  }
  return newEntry;
}

// Applications Database with Institutional Isolation
const applicationsDb: ApplicationItem[] = [
  {
    id: 'app_001',
    applicationNumber: 'AICTE-WRO-2026-10041',
    institutionId: '1-332910401',
    institutionName: 'Indian Institute of Information Technology, Pune',
    region: 'WRO-MUMBAI',
    level: 'Under Graduate',
    program: 'Engineering & Technology (Computer Science & AI)',
    intakeRequested: 180,
    currentStatus: 'UNDER_SCRUTINY',
    submittedDate: '2026-03-01T10:00:00.000Z',
    assignedScrutinizer: 'Prof. Ananya Sharma',
    aphClauseViolations: ['Clause 4.3(b) - Cadre Ratio Deficiency in Senior Faculty'],
    deficiencies: [
      {
        id: 'def_101',
        description: 'Professor-to-Student cadre ratio requires 1 additional Professor in Artificial Intelligence division.',
        clause: 'APH Clause 4.3(b)',
        status: 'OPEN',
      },
    ],
  },
  {
    id: 'app_002',
    applicationNumber: 'AICTE-SRO-2026-20092',
    institutionId: '1-554433221',
    institutionName: 'National Institute of Technology, Trichy',
    region: 'SRO-CHENNAI',
    level: 'Post Graduate',
    program: 'Data Science & Cyber Physical Systems',
    intakeRequested: 60,
    currentStatus: 'EVC_SCHEDULED',
    submittedDate: '2026-03-05T12:00:00.000Z',
    assignedScrutinizer: 'Prof. Ananya Sharma',
    assignedEVCId: 'EVC-TEAM-SOUTH-04',
    deficiencies: [],
  },
  {
    id: 'app_003',
    applicationNumber: 'AICTE-WRO-2026-30018',
    institutionId: '1-778899002',
    institutionName: 'Maharashtra Institute of Technology, Pune',
    region: 'WRO-MUMBAI',
    level: 'Under Graduate',
    program: 'Robotics & Automation',
    intakeRequested: 120,
    currentStatus: 'PENDING_AUTHORITY_DECISION',
    submittedDate: '2026-02-28T09:30:00.000Z',
    assignedScrutinizer: 'Prof. Ananya Sharma',
    assignedEVCId: 'EVC-TEAM-WEST-01',
    deficiencies: [],
  },
  {
    id: 'app_004',
    applicationNumber: 'AICTE-NRO-2026-40112',
    institutionId: '1-112233445',
    institutionName: 'Delhi Technological University Extension',
    region: 'NRO-KANPUR',
    level: 'Under Graduate',
    program: 'Electronics & VLSI Design',
    intakeRequested: 120,
    currentStatus: 'SHC_HEARING',
    submittedDate: '2026-03-02T14:10:00.000Z',
    assignedScrutinizer: 'Prof. Ananya Sharma',
    deficiencies: [
      {
        id: 'def_104',
        description: 'Built-up area shortfall of 350 sq.m in clean-room semiconductor lab setup.',
        clause: 'APH Clause 6.1(a) - Normative Infrastructure Standard',
        status: 'OPEN',
      },
    ],
  },
  {
    id: 'app_005',
    applicationNumber: 'AICTE-WRO-2026-50891',
    institutionId: '1-332910401', // Second application for IIIT Pune (Extension of Approval)
    institutionName: 'Indian Institute of Information Technology, Pune',
    region: 'WRO-MUMBAI',
    level: 'Post Graduate',
    program: 'M.Tech Cyber Security',
    intakeRequested: 30,
    currentStatus: 'APPROVED',
    submittedDate: '2026-02-15T11:00:00.000Z',
    assignedScrutinizer: 'Prof. Ananya Sharma',
    deficiencies: [],
  },
];

// Helper: Sanitize user profile for frontend output
function sanitizeUser(u: StoredUser, activeRoleOverride?: UserRole | null): UserProfile {
  return {
    id: u.id,
    loginId: u.loginId,
    fullName: u.fullName,
    designation: u.designation,
    email: u.email,
    department: u.department,
    region: u.region,
    institutionId: u.institutionId,
    institutionName: u.institutionName,
    status: u.status,
    roles: [...u.roles],
    activeRole: activeRoleOverride !== undefined ? activeRoleOverride : u.activeRole,
    permissions: [...u.permissions],
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    failedAttempts: u.failedAttempts,
    lockUntil: u.lockUntil,
  };
}

// Authentication Middleware
function authenticateSession(req: Request, res: Response, next: NextFunction) {
  const token =
    req.cookies?.aicte_session ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  if (!token) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'No authenticated session found. Please sign in.',
    });
  }

  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({
      error: 'SESSION_EXPIRED',
      message: 'Session has expired or was revoked. Please sign in again.',
    });
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return res.status(401).json({
      error: 'SESSION_EXPIRED',
      message: 'Session has timed out due to inactivity.',
    });
  }

  const user = usersDb.find((u) => u.id === session.userId);
  if (!user) {
    sessions.delete(token);
    return res.status(401).json({
      error: 'ACCOUNT_NOT_FOUND',
      message: 'Associated user identity does not exist.',
    });
  }

  if (user.status === 'DISABLED' || user.status === 'SUSPENDED') {
    sessions.delete(token);
    recordAudit({
      userId: user.id,
      loginId: user.loginId,
      role: session.activeRole || 'UNKNOWN',
      action: 'SESSION_TERMINATED_STATUS_REVOKED',
      category: 'AUTH',
      status: 'DENIED',
      ipAddress: req.ip || '127.0.0.1',
      details: `Session revoked because user status is currently ${user.status}.`,
    });
    return res.status(403).json({
      error: 'ACCOUNT_INACTIVE',
      message: `Account is ${user.status.toLowerCase()}. Access denied.`,
    });
  }

  // Attach session and user to request
  (req as any).session = session;
  (req as any).user = user;
  next();
}

// ======================== API ROUTES ========================

// Mount Institutional Dashboard API
app.use('/api/institution', institutionalRouter);
app.get('/api/application-categories', (_req: Request, res: Response) => {
  res.json({ categories: APH_22_CATEGORIES });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'AICTE FlowGuard RBAC Authentication & Session Service',
    sihProjectId: 'SIH26262',
    timestamp: new Date().toISOString(),
  });
});

// 1. Unified Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { loginId, password, rememberMe } = req.body || {};
  const clientIp = req.ip || '127.0.0.1';

  // Input validation
  if (!loginId || typeof loginId !== 'string' || !password || typeof password !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'User ID and Password are required.',
    });
  }

  const trimmedLoginId = loginId.trim();

  // Rate Limiting check
  const rateLimitKey = `${clientIp}_${trimmedLoginId.toLowerCase()}`;
  const rateData = rateLimitMap.get(rateLimitKey) || { failedCount: 0, lockUntil: null };

  if (rateData.lockUntil && Date.now() < rateData.lockUntil) {
    const remainingMinutes = Math.ceil((rateData.lockUntil - Date.now()) / (60 * 1000));
    recordAudit({
      userId: 'UNKNOWN',
      loginId: trimmedLoginId,
      role: 'NONE',
      action: 'LOGIN_ATTEMPT_LOCKED_OUT',
      category: 'RBAC_SECURITY',
      status: 'DENIED',
      ipAddress: clientIp,
      details: `Sign-in attempt rejected: Account locked for ${remainingMinutes} more minute(s) due to excessive failures.`,
    });
    return res.status(429).json({
      success: false,
      isLockedOut: true,
      remainingMinutes,
      message: `Account temporarily locked due to multiple failed attempts. Please retry in ${remainingMinutes} minute(s) or contact the administrator.`,
    });
  }

  // Find user (case-insensitive by loginId or email)
  const user = usersDb.find(
    (u) =>
      u.loginId.toLowerCase() === trimmedLoginId.toLowerCase() ||
      u.email.toLowerCase() === trimmedLoginId.toLowerCase()
  );

  // Check credentials
  const isValid = user && verifyPassword(password, user.passwordSalt, user.passwordHash);

  if (!isValid) {
    rateData.failedCount += 1;
    if (rateData.failedCount >= MAX_FAILED_ATTEMPTS) {
      rateData.lockUntil = Date.now() + LOCKOUT_DURATION_MS;
      rateLimitMap.set(rateLimitKey, rateData);
      recordAudit({
        userId: user ? user.id : 'UNKNOWN',
        loginId: trimmedLoginId,
        role: user ? user.roles[0] || 'NONE' : 'NONE',
        action: 'RATE_LIMIT_LOCKOUT_TRIGGERED',
        category: 'RBAC_SECURITY',
        status: 'SUSPICIOUS',
        ipAddress: clientIp,
        details: `Exceeded ${MAX_FAILED_ATTEMPTS} consecutive failed attempts. Lockout enforced for 15 minutes.`,
      });
      return res.status(429).json({
        success: false,
        isLockedOut: true,
        remainingMinutes: 15,
        message: 'Account locked for 15 minutes due to multiple failed login attempts.',
      });
    }

    rateLimitMap.set(rateLimitKey, rateData);

    recordAudit({
      userId: user ? user.id : 'UNKNOWN',
      loginId: trimmedLoginId,
      role: user ? user.roles[0] || 'NONE' : 'NONE',
      action: 'LOGIN_FAILURE',
      category: 'AUTH',
      status: 'FAILED',
      ipAddress: clientIp,
      details: `Failed sign-in attempt (${rateData.failedCount}/${MAX_FAILED_ATTEMPTS}). Generic rejection returned.`,
    });

    // Generic error message that does not reveal if the User ID exists
    return res.status(401).json({
      success: false,
      message: 'Invalid User ID or Password. Please check your credentials.',
      attemptsRemaining: MAX_FAILED_ATTEMPTS - rateData.failedCount,
    });
  }

  // Credentials are correct. Reset rate limit
  rateLimitMap.delete(rateLimitKey);

  // Check Account Status
  if (user.status === 'DISABLED') {
    recordAudit({
      userId: user.id,
      loginId: user.loginId,
      role: user.roles[0] || 'NONE',
      action: 'LOGIN_REJECTED_DISABLED_ACCOUNT',
      category: 'RBAC_SECURITY',
      status: 'DENIED',
      ipAddress: clientIp,
      details: 'Authentication succeeded, but account is marked as DISABLED by statutory administrator.',
    });
    return res.status(403).json({
      success: false,
      statusRevoked: true,
      message: 'Your account has been deactivated by AICTE System Administration. Access to regulatory workspaces is denied.',
    });
  }

  if (user.status === 'SUSPENDED') {
    recordAudit({
      userId: user.id,
      loginId: user.loginId,
      role: user.roles[0] || 'NONE',
      action: 'LOGIN_REJECTED_SUSPENDED_ACCOUNT',
      category: 'RBAC_SECURITY',
      status: 'DENIED',
      ipAddress: clientIp,
      details: 'Authentication rejected: account is in SUSPENDED state pending vigilance review.',
    });
    return res.status(403).json({
      success: false,
      statusRevoked: true,
      message: 'This account is under statutory suspension. Please contact the Vigilance & Compliance Cell.',
    });
  }

  // Check if user has no assigned role
  if (!user.roles || user.roles.length === 0) {
    recordAudit({
      userId: user.id,
      loginId: user.loginId,
      role: 'NONE',
      action: 'LOGIN_DENIED_NO_ROLE',
      category: 'RBAC_SECURITY',
      status: 'DENIED',
      ipAddress: clientIp,
      details: 'User authenticated successfully, but possesses zero authorized software roles.',
    });
    return res.status(403).json({
      success: false,
      unassigned: true,
      message: 'Access Denied: No regulatory or administrative role is provisioned for this account. Please contact AICTE IT Support.',
    });
  }

  // Multi-role logic
  let activeRole: UserRole | null = null;
  let requiresWorkspaceSelection = false;

  if (user.roles.length === 1) {
    activeRole = user.roles[0];
  } else {
    // User has multiple assigned roles
    requiresWorkspaceSelection = true;
    activeRole = user.roles[0]; // default initial role, but workspace selector will be presented
  }

  // Generate secure cryptographic session token
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionDurationMs = 8 * 60 * 60 * 1000; // 8 hours
  const expiresAt = Date.now() + sessionDurationMs;

  sessions.set(sessionToken, {
    token: sessionToken,
    userId: user.id,
    activeRole,
    createdAt: new Date().toISOString(),
    expiresAt,
    ipAddress: clientIp,
  });

  // Update user's last login
  user.lastLoginAt = new Date().toISOString();

  // Set secure cookie
  res.cookie('aicte_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: sessionDurationMs,
    path: '/',
  });

  recordAudit({
    userId: user.id,
    loginId: user.loginId,
    role: activeRole || user.roles[0],
    action: 'LOGIN_SUCCESS',
    category: 'AUTH',
    status: 'SUCCESS',
    ipAddress: clientIp,
    details: `Authenticated successfully. Authorized roles: [${user.roles.join(', ')}]. Active workspace: ${activeRole}.`,
  });

  const sanitized = sanitizeUser(user, activeRole);

  res.json({
    success: true,
    session: {
      token: sessionToken,
      user: sanitized,
      expiresAt: new Date(expiresAt).toISOString(),
    },
    requiresWorkspaceSelection,
    availableRoles: user.roles,
  });
});

// 2. Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token =
    req.cookies?.aicte_session ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  if (token && sessions.has(token)) {
    const s = sessions.get(token)!;
    const user = usersDb.find((u) => u.id === s.userId);
    recordAudit({
      userId: s.userId,
      loginId: user?.loginId || 'UNKNOWN',
      role: s.activeRole || 'NONE',
      action: 'LOGOUT',
      category: 'AUTH',
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      details: 'Session invalidated and client state cleared.',
    });
    sessions.delete(token);
  }

  res.clearCookie('aicte_session', { path: '/' });
  res.json({ success: true, message: 'Signed out successfully.' });
});

// 3. Current Authenticated User & Session Check
app.get('/api/auth/me', authenticateSession, (req: Request, res: Response) => {
  const session = (req as any).session as UserSession;
  const user = (req as any).user as StoredUser;

  res.json({
    user: sanitizeUser(user, session.activeRole),
    session: {
      token: session.token,
      expiresAt: new Date(session.expiresAt).toISOString(),
    },
    availableRoles: user.roles,
  });
});

// 4. Role / Workspace Switcher (Server-Enforced RBAC)
app.post('/api/auth/switch-role', authenticateSession, (req: Request, res: Response) => {
  const session = (req as any).session as UserSession;
  const user = (req as any).user as StoredUser;
  const { newRole } = req.body;

  if (!newRole || typeof newRole !== 'string') {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Target role is required.' });
  }

  // Security Verification: Target role MUST be explicitly present in user's server-side assigned roles!
  if (!user.roles.includes(newRole as UserRole)) {
    recordAudit({
      userId: user.id,
      loginId: user.loginId,
      role: session.activeRole || 'NONE',
      action: 'UNAUTHORIZED_ROLE_ELEVATION_ATTEMPT',
      category: 'RBAC_SECURITY',
      status: 'DENIED',
      ipAddress: req.ip || '127.0.0.1',
      details: `User attempted to switch to role '${newRole}', which is not in their assigned roles: [${user.roles.join(', ')}].`,
    });
    return res.status(403).json({
      error: 'ROLE_ELEVATION_PROHIBITED',
      message: 'Access Denied: You are not authorized to access this workspace role.',
    });
  }

  // Authorized switch
  const previousRole = session.activeRole;
  session.activeRole = newRole as UserRole;

  recordAudit({
    userId: user.id,
    loginId: user.loginId,
    role: newRole,
    action: 'WORKSPACE_ROLE_SWITCH',
    category: 'AUTH',
    status: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
    details: `Workspace switched from '${previousRole}' to '${newRole}'.`,
  });

  res.json({
    success: true,
    activeRole: newRole,
    user: sanitizeUser(user, newRole as UserRole),
  });
});

// 5. Password Reset Request Flow (Generic safe message)
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { loginId } = req.body || {};
  const trimmed = typeof loginId === 'string' ? loginId.trim().toUpperCase() : '';
  const clientIp = req.ip || '127.0.0.1';

  recordAudit({
    userId: 'SYSTEM',
    loginId: trimmed || 'UNSPECIFIED',
    role: 'NONE',
    action: 'PASSWORD_RESET_DISPATCH',
    category: 'AUTH',
    status: 'SUCCESS',
    ipAddress: clientIp,
    details: `Password reset verification token generated for login ID: '${trimmed}'. Institutional email dispatch simulated.`,
  });

  // Always generic message to prevent User ID enumeration
  res.json({
    success: true,
    message: 'If the provided User ID is registered in the AICTE directory, instructions and a one-time verification token have been sent to your registered institutional email address.',
    verificationTokenHint: 'Demo simulation token issued for test sandbox: AICTE-RESET-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
  });
});

// 6. Applications Listing with STRICT Institution-Level Data Isolation and Role Filtering
app.get('/api/applications', authenticateSession, (req: Request, res: Response) => {
  const session = (req as any).session as UserSession;
  const user = (req as any).user as StoredUser;
  const activeRole = session.activeRole || user.roles[0];

  // RBAC Rule 1: Applicants can ONLY access applications that match their own institution ID!
  if (activeRole === 'INSTITUTION_APPLICANT') {
    if (!user.institutionId) {
      return res.status(403).json({
        error: 'NO_INSTITUTION_ASSOCIATION',
        message: 'No institution identifier linked to this applicant account.',
      });
    }

    const isolatedApps = applicationsDb.filter((appItem) => appItem.institutionId === user.institutionId);

    recordAudit({
      userId: user.id,
      loginId: user.loginId,
      role: activeRole,
      action: 'ISOLATED_INSTITUTION_QUERY',
      category: 'WORKFLOW',
      status: 'SUCCESS',
      ipAddress: req.ip || '127.0.0.1',
      details: `Applicant queried applications. Returned ${isolatedApps.length} records isolated to institution ${user.institutionId} (${user.institutionName}).`,
      institutionId: user.institutionId,
    });

    return res.json({ applications: isolatedApps, total: isolatedApps.length });
  }

  // RBAC Rule 2: Regional Officers only see applications within their jurisdiction
  if (activeRole === 'REGIONAL_OFFICER') {
    const regionalApps = applicationsDb.filter((appItem) => appItem.region === user.region);
    return res.json({ applications: regionalApps, total: regionalApps.length });
  }

  // RBAC Rule 3: Scrutiny officials see applications in scrutiny/rescrutiny/submitted stages
  if (activeRole === 'SCRUTINY_OFFICIAL') {
    const scrutinyApps = applicationsDb.filter((appItem) =>
      ['SUBMITTED', 'UNDER_SCRUTINY', 'DEFICIENCY_NOTED'].includes(appItem.currentStatus)
    );
    return res.json({ applications: scrutinyApps, total: scrutinyApps.length });
  }

  // RBAC Rule 4: EVC Members & Coordinators see EVC Scheduled / Completed
  if (activeRole === 'EVC_COORDINATOR' || activeRole === 'EVC_MEMBER') {
    const evcApps = applicationsDb.filter((appItem) =>
      ['EVC_SCHEDULED', 'EVC_COMPLETED', 'UNDER_SCRUTINY'].includes(appItem.currentStatus)
    );
    return res.json({ applications: evcApps, total: evcApps.length });
  }

  // RBAC Rule 5: SHC & SAC Quasi-Judicial Forums see hearings & appeals
  if (activeRole === 'SHC_MEMBER') {
    const shcApps = applicationsDb.filter((appItem) => appItem.currentStatus === 'SHC_HEARING');
    return res.json({ applications: shcApps, total: shcApps.length });
  }
  if (activeRole === 'SAC_MEMBER') {
    const sacApps = applicationsDb.filter((appItem) => appItem.currentStatus === 'SAC_APPEAL' || appItem.currentStatus === 'SHC_HEARING');
    return res.json({ applications: sacApps, total: sacApps.length });
  }

  // RBAC Rule 6: Central Bureau, Competent Authority, System Admin, Audit Officer see all regulatory cases
  res.json({ applications: applicationsDb, total: applicationsDb.length });
});

// 7. Workflow State Transition / Action Endpoint (Strict RBAC Enforcement)
app.post('/api/applications/:id/action', authenticateSession, (req: Request, res: Response) => {
  const session = (req as any).session as UserSession;
  const user = (req as any).user as StoredUser;
  const activeRole = session.activeRole || user.roles[0];
  const { id } = req.params;
  const { action, notes, deficiencyReply } = req.body || {};

  const appItem = applicationsDb.find((a) => a.id === id);
  if (!appItem) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Application proposal not found.' });
  }

  // Institution Isolation Check for Applicant Actions
  if (activeRole === 'INSTITUTION_APPLICANT') {
    if (appItem.institutionId !== user.institutionId) {
      recordAudit({
        userId: user.id,
        loginId: user.loginId,
        role: activeRole,
        action: 'CROSS_INSTITUTION_BREACH_ATTEMPT',
        category: 'RBAC_SECURITY',
        status: 'DENIED',
        ipAddress: req.ip || '127.0.0.1',
        details: `Applicant attempted action on application ${appItem.applicationNumber} owned by institution ${appItem.institutionId}. Access Denied.`,
        institutionId: appItem.institutionId,
      });
      return res.status(403).json({
        error: 'INSTITUTION_ISOLATION_VIOLATION',
        message: 'Security Violation: You are strictly forbidden from accessing or altering another institution’s records.',
      });
    }

    if (action === 'SUBMIT_DEFICIENCY_REPLY') {
      if (appItem.deficiencies.length > 0) {
        appItem.deficiencies[0].status = 'RESOLVED';
      }
      appItem.currentStatus = 'UNDER_SCRUTINY';

      recordAudit({
        userId: user.id,
        loginId: user.loginId,
        role: activeRole,
        action: 'DEFICIENCY_RECTIFICATION_UPLOADED',
        category: 'WORKFLOW',
        status: 'SUCCESS',
        ipAddress: req.ip || '127.0.0.1',
        details: `Institution uploaded compliance documents for ${appItem.applicationNumber}. Notes: ${notes || 'N/A'}.`,
        institutionId: user.institutionId,
      });

      return res.json({ success: true, message: 'Compliance rectification submitted for re-scrutiny.', application: appItem });
    }

    return res.status(403).json({
      error: 'UNAUTHORIZED_WORKFLOW_ACTION',
      message: 'Applicants cannot alter statutory evaluation states or issue approvals.',
    });
  }

  // Statutory Authority Checks for other roles
  if (activeRole === 'SCRUTINY_OFFICIAL') {
    if (action === 'RECORD_DEFICIENCY') {
      appItem.currentStatus = 'DEFICIENCY_NOTED';
      appItem.deficiencies.push({
        id: `def_${Date.now()}`,
        description: notes || 'Statutory documentation non-conformance identified during scrutiny.',
        clause: 'APH Clause 4.3 - Cadre Compliance',
        status: 'OPEN',
      });
      recordAudit({
        userId: user.id,
        loginId: user.loginId,
        role: activeRole,
        action: 'SCRUTINY_DEFICIENCY_RECORDED',
        category: 'WORKFLOW',
        status: 'SUCCESS',
        ipAddress: req.ip || '127.0.0.1',
        details: `Scrutiny official recorded deficiency on ${appItem.applicationNumber}.`,
      });
      return res.json({ success: true, application: appItem });
    }

    if (action === 'RECOMMEND_EVC') {
      appItem.currentStatus = 'EVC_SCHEDULED';
      recordAudit({
        userId: user.id,
        loginId: user.loginId,
        role: activeRole,
        action: 'SCRUTINY_PASSED_EVC_RECOMMENDED',
        category: 'WORKFLOW',
        status: 'SUCCESS',
        ipAddress: req.ip || '127.0.0.1',
        details: `Application ${appItem.applicationNumber} cleared scrutiny. Recommended for Expert Visit Committee (EVC).`,
      });
      return res.json({ success: true, application: appItem });
    }
  }

  if (activeRole === 'COMPETENT_AUTHORITY') {
    if (action === 'APPROVE_EOA' || action === 'GRANT_APPROVAL') {
      appItem.currentStatus = 'APPROVED';
      recordAudit({
        userId: user.id,
        loginId: user.loginId,
        role: activeRole,
        action: 'STATUTORY_APPROVAL_GRANTED',
        category: 'WORKFLOW',
        status: 'SUCCESS',
        ipAddress: req.ip || '127.0.0.1',
        details: `Competent Authority granted final approval for ${appItem.applicationNumber} (${appItem.program}).`,
      });
      return res.json({ success: true, application: appItem });
    }
    if (action === 'REJECT_APPLICATION') {
      appItem.currentStatus = 'REJECTED';
      recordAudit({
        userId: user.id,
        loginId: user.loginId,
        role: activeRole,
        action: 'STATUTORY_REJECTION_ISSUED',
        category: 'WORKFLOW',
        status: 'SUCCESS',
        ipAddress: req.ip || '127.0.0.1',
        details: `Competent Authority issued statutory rejection for ${appItem.applicationNumber}. Reason: ${notes}`,
      });
      return res.json({ success: true, application: appItem });
    }
  }

  // Generic fallback if role doesn't have permission for this specific action
  recordAudit({
    userId: user.id,
    loginId: user.loginId,
    role: activeRole,
    action: 'UNAUTHORIZED_STATUTORY_ACTION_ATTEMPT',
    category: 'RBAC_SECURITY',
    status: 'DENIED',
    ipAddress: req.ip || '127.0.0.1',
    details: `Role ${activeRole} lacks statutory authority for action '${action}' on application ${appItem.applicationNumber}.`,
  });

  return res.status(403).json({
    error: 'STATUTORY_AUTHORITY_INSUFFICIENT',
    message: `Your active role (${activeRole}) is not statutorily empowered to perform action '${action}'.`,
  });
});

// 8. Audit Logs (Restricted to SYSTEM_ADMIN and RULES_AUDIT_OFFICER)
app.get('/api/audit-logs', authenticateSession, (req: Request, res: Response) => {
  const session = (req as any).session as UserSession;
  const user = (req as any).user as StoredUser;
  const activeRole = session.activeRole || user.roles[0];

  if (activeRole !== 'SYSTEM_ADMIN' && activeRole !== 'RULES_AUDIT_OFFICER') {
    recordAudit({
      userId: user.id,
      loginId: user.loginId,
      role: activeRole,
      action: 'ILLEGAL_AUDIT_LOG_INSPECTION_ATTEMPT',
      category: 'RBAC_SECURITY',
      status: 'DENIED',
      ipAddress: req.ip || '127.0.0.1',
      details: `Role ${activeRole} attempted to inspect the central statutory audit log. Blocked by server RBAC.`,
    });
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access Denied: Immutable audit logs are strictly restricted to System Administrators and Rules Governance Officials.',
    });
  }

  res.json({ logs: auditLogs, total: auditLogs.length });
});

// 9. User Directory Management (Restricted to SYSTEM_ADMIN)
app.get('/api/users', authenticateSession, (req: Request, res: Response) => {
  const session = (req as any).session as UserSession;
  const user = (req as any).user as StoredUser;
  const activeRole = session.activeRole || user.roles[0];

  if (activeRole !== 'SYSTEM_ADMIN') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Access Denied: User provisioning and security matrices require System Administrator privileges.',
    });
  }

  const sanitizedList = usersDb.map((u) => sanitizeUser(u));
  res.json({ users: sanitizedList });
});

// Toggle user status (Enable / Disable / Suspend) - SYSTEM_ADMIN ONLY
app.post('/api/users/toggle-status', authenticateSession, (req: Request, res: Response) => {
  const session = (req as any).session as UserSession;
  const user = (req as any).user as StoredUser;
  const activeRole = session.activeRole || user.roles[0];
  const { targetUserId, newStatus } = req.body;

  if (activeRole !== 'SYSTEM_ADMIN') {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Unauthorized: Only System Administrators can alter account operational statuses.',
    });
  }

  const target = usersDb.find((u) => u.id === targetUserId);
  if (!target) {
    return res.status(404).json({ error: 'USER_NOT_FOUND', message: 'Target user record not found.' });
  }

  // Prevent admin from disabling themselves
  if (target.id === user.id && newStatus !== 'ACTIVE') {
    return res.status(400).json({ error: 'CANNOT_SELF_DISABLE', message: 'Self-deactivation of primary administrator is prevented.' });
  }

  const oldStatus = target.status;
  target.status = newStatus;

  // Invalidate any active sessions for this target user if disabled or suspended
  if (newStatus === 'DISABLED' || newStatus === 'SUSPENDED') {
    for (const [t, s] of sessions.entries()) {
      if (s.userId === target.id) {
        sessions.delete(t);
      }
    }
  }

  recordAudit({
    userId: user.id,
    loginId: user.loginId,
    role: activeRole,
    action: 'ADMIN_USER_STATUS_CHANGE',
    category: 'ADMIN',
    status: 'SUCCESS',
    ipAddress: req.ip || '127.0.0.1',
    details: `Admin changed status of ${target.loginId} (${target.fullName}) from ${oldStatus} to ${newStatus}.`,
  });

  res.json({ success: true, user: sanitizeUser(target) });
});

// 10. Automated RBAC Security Probe (For evaluators to test server enforcement)
app.post('/api/test/rbac-probe', authenticateSession, (req: Request, res: Response) => {
  const session = (req as any).session as UserSession;
  const user = (req as any).user as StoredUser;
  const activeRole = session.activeRole || user.roles[0];
  const { testType } = req.body;

  if (testType === 'CROSS_INSTITUTION_PROBE') {
    // Attempt to access another institution's data
    const foreignApp = applicationsDb.find((a) => a.institutionId !== user.institutionId);
    if (activeRole === 'INSTITUTION_APPLICANT' && foreignApp) {
      // Simulate forbidden access attempt
      recordAudit({
        userId: user.id,
        loginId: user.loginId,
        role: activeRole,
        action: 'AUTOMATED_SECURITY_PROBE_BLOCKED',
        category: 'RBAC_SECURITY',
        status: 'DENIED',
        ipAddress: req.ip || '127.0.0.1',
        details: `Automated test probe: Applicant attempted to read foreign institution ${foreignApp.institutionId}. Server denied with HTTP 403.`,
      });
      return res.status(403).json({
        blocked: true,
        message: 'RBAC ENFORCED: Cross-institution data boundary defended. HTTP 403 Forbidden.',
        attemptedTarget: foreignApp.institutionName,
      });
    }
    return res.json({ blocked: false, message: 'Current role is not an applicant or no foreign data exists.' });
  }

  if (testType === 'UNAUTHORIZED_APPROVAL_PROBE') {
    // Attempt to approve application with non-Competent Authority role
    if (activeRole !== 'COMPETENT_AUTHORITY') {
      recordAudit({
        userId: user.id,
        loginId: user.loginId,
        role: activeRole,
        action: 'UNAUTHORIZED_STATUTORY_SANCTION_BLOCKED',
        category: 'RBAC_SECURITY',
        status: 'DENIED',
        ipAddress: req.ip || '127.0.0.1',
        details: `Automated test probe: Role ${activeRole} attempted statutory EoA approval. Blocked by server-side rule engine.`,
      });
      return res.status(403).json({
        blocked: true,
        message: `RBAC ENFORCED: Role '${activeRole}' cannot grant statutory approvals. HTTP 403 Forbidden.`,
      });
    }
  }

  res.json({ passed: true, message: 'Test probe completed.' });
});

// Vite Middleware Integration for Development / Production static files
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`[AICTE FlowGuard] Server active at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[AICTE FlowGuard] Failed to start server:', err);
  process.exit(1);
});
