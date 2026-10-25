/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  Building,
  FilePlus2,
  Files,
  FolderOpen,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Info,
  Award,
  Scale,
  CheckSquare,
  Bell,
  History,
  HelpCircle,
  LogOut,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Upload,
  Download,
  Eye,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  X,
  FileText,
  AlertCircle,
  Lock,
  MoreVertical,
  Layers,
  Plus,
  Trash2,
  UserCheck,
  Sparkles,
  MapPin,
  CreditCard,
} from 'lucide-react';
import type { UserProfile } from '../../types/auth.ts';
import type {
  InstitutionProfile,
  ApplicationSubmissionRecord,
  ApplicationTimelineEvent,
  DeficiencyNotice,
  EvcVisitSchedule,
  DecisionRecord,
  AppealRecord,
  ComplianceObligation,
  InstitutionalNotification,
  ApplicationCategoryDef,
  CategoryFormFieldDef,
  DocumentSubmission,
} from '../../types/institutionDashboard.ts';
import { APH_23_STATUTORY_CATEGORIES, APH_22_CATEGORIES } from '../../data/aphMatrixRulesData.ts';
import { NewApplicationWorkflow } from './NewApplicationWorkflow.tsx';

interface InstitutionPortalProps {
  user: UserProfile;
  onLogout?: () => void;
  onOpenWorkspaceSelector?: () => void;
  onOpenRbacProbe?: () => void;
}

type TabType =
  | 'OVERVIEW'
  | 'PROFILE'
  | 'NEW_APP'
  | 'APPLICATIONS'
  | 'DOC_CENTRE'
  | 'DEFICIENCIES'
  | 'RE_SCRUTINY'
  | 'EVC_SCHEDULE'
  | 'EVC_INFO'
  | 'DECISIONS'
  | 'APPEALS'
  | 'COMPLIANCE'
  | 'NOTIFICATIONS'
  | 'AUDIT_TRAIL'
  | 'HELP';

export const InstitutionPortal: React.FC<InstitutionPortalProps> = ({
  user,
  onLogout,
  onOpenWorkspaceSelector,
  onOpenRbacProbe,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('APPLICATIONS');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Core Data Stores
  const [profile, setProfile] = useState<InstitutionProfile | null>(null);
  const [applications, setApplications] = useState<ApplicationSubmissionRecord[]>([]);
  const [summaryCounts, setSummaryCounts] = useState<Record<string, number>>({});
  const [deficiencies, setDeficiencies] = useState<DeficiencyNotice[]>([]);
  const [evcVisits, setEvcVisits] = useState<EvcVisitSchedule[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [appeals, setAppeals] = useState<AppealRecord[]>([]);
  const [complianceList, setComplianceList] = useState<ComplianceObligation[]>([]);
  const [notifications, setNotifications] = useState<InstitutionalNotification[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);

  // Modals & Active Selections
  const [selectedApplication, setSelectedApplication] = useState<ApplicationSubmissionRecord | null>(null);
  const [viewDetailModalOpen, setViewDetailModalOpen] = useState(false);
  const [receiptModalApp, setReceiptModalApp] = useState<ApplicationSubmissionRecord | null>(null);
  const [activeTimeline, setActiveTimeline] = useState<ApplicationTimelineEvent[]>([]);

  // Multi-Institution Profiles Management
  const [availableProfiles, setAvailableProfiles] = useState<InstitutionProfile[]>([]);
  const [institutionModalOpen, setInstitutionModalOpen] = useState(false);
  const [institutionModalTab, setInstitutionModalTab] = useState<'SWITCH' | 'REGISTER'>('SWITCH');
  const [customInstForm, setCustomInstForm] = useState({
    officialName: '',
    institutionId: '',
    completeAddress: '',
    state: 'Maharashtra',
    district: 'Pune',
    pincode: '411001',
    applicantFullName: '',
    applicantDesignation: 'Principal & Authorized Signatory',
    officialEmail: '',
    contactNumber: '',
    sponsoringBodyType: 'TRUST' as const,
    sponsoringBodyName: '',
    bankName: 'State Bank of India',
    bankIfsc: 'SBIN0001000',
  });
  const [savingCustomInst, setSavingCustomInst] = useState(false);

  // New Application Wizard State
  const [newAppSearch, setNewAppSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number>(1);
  const [newAppProgramLevel, setNewAppProgramLevel] = useState('Under Graduate');
  const [newAppDiscipline, setNewAppDiscipline] = useState('Computer Science and Engineering');
  const [newAppIntake, setNewAppIntake] = useState<number>(60);
  const [additionalCourses, setAdditionalCourses] = useState<
    Array<{ id: string; level: string; discipline: string; intake: number }>
  >([]);
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({
    cadreRatio: '1:2:6',
    facultyCount: 48,
    builtUpAreaSqM: 10500,
    studentEnrolmentRatio: 92,
    antiRaggingFormed: true,
    internalComplaintsCell: true,
    grievanceRedressalPortal: true,
    fireNocNumber: 'MH-FIR-2025-8819',
    fireNocExpiry: '2027-03-31',
    barrierFreeFacilities: true,
  });
  const [terPaymentMode, setTerPaymentMode] = useState<'BHARATKOSH' | 'NET_BANKING' | 'CHALLAN'>('BHARATKOSH');
  const [wizardStep, setWizardStep] = useState<'SELECT' | 'FORM' | 'DOCS' | 'REVIEW'>('SELECT');
  const [newAppUploadedDocs, setNewAppUploadedDocs] = useState<Record<string, { fileName: string; isDsc: boolean }>>({});
  const [isSubmittingNewApp, setIsSubmittingNewApp] = useState(false);
  const [validationReport, setValidationReport] = useState<any | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Dynamic Initials Helper
  const getInitials = (name?: string) => {
    if (!name) return 'IN';
    const cleaned = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.|Fr\.)\s*/i, '').trim();
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'IN';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Deficiency Resolution State
  const [respondingDeficiency, setRespondingDeficiency] = useState<DeficiencyNotice | null>(null);
  const [deficiencyResponseNote, setDeficiencyResponseNote] = useState('');
  const [deficiencyReplacementFile, setDeficiencyReplacementFile] = useState('');
  const [submittingDeficiency, setSubmittingDeficiency] = useState(false);

  // Appeal Submission State (7-Day window)
  const [appealingDecision, setAppealingDecision] = useState<DecisionRecord | null>(null);
  const [appealGrounds, setAppealGrounds] = useState('');
  const [appealEvidenceFile, setAppealEvidenceFile] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Filters & Search for Main Table
  const [appTableSearch, setAppTableSearch] = useState('');
  const [appTableStageFilter, setAppTableStageFilter] = useState('ALL');

  // Trigger server-side statutory rule validation
  const triggerServerValidation = async (targetCatId?: number, fields?: Record<string, any>, docs?: Record<string, any>) => {
    setIsValidating(true);
    try {
      const res = await fetch('/api/institution/applications/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: targetCatId ?? selectedCategoryId,
          structuredData: fields ?? dynamicFields,
          documents: docs ?? newAppUploadedDocs,
          isDraft: false,
        }),
      });
      const data = await res.json();
      setValidationReport(data);
      return data;
    } catch (err) {
      console.error('Validation request failed', err);
      return null;
    } finally {
      setIsValidating(false);
    }
  };

  // Category change hook to dynamically initialize field requirements for each statutory category
  const handleSelectCategory = (catId: number) => {
    setSelectedCategoryId(catId);
    setValidationReport(null);
    const cat = APH_23_STATUTORY_CATEGORIES.find((c) => c.id === catId);
    const defaults: Record<string, any> = {};

    if (cat) {
      (cat.requiredFields || []).forEach((f) => {
        if (f.type === 'checkbox') {
          defaults[f.id] = true;
        } else if (f.type === 'select' && f.options && f.options.length > 0) {
          defaults[f.id] = f.options[0].value;
        } else if (f.type === 'date') {
          defaults[f.id] = '2026-03-31';
        } else if (f.type === 'number') {
          if (f.placeholder && !isNaN(Number(f.placeholder))) {
            defaults[f.id] = Number(f.placeholder);
          } else {
            defaults[f.id] = f.id.includes('Acre') ? 5.0 : f.id.includes('Intake') ? 60 : f.id.includes('Ratio') ? 15 : '';
          }
        } else {
          defaults[f.id] = f.placeholder && !f.placeholder.startsWith('e.g.') ? f.placeholder : '';
        }
      });
    }

    // Curated standard presets for realistic instant verification across categories
    if (catId === 1) {
      defaults.applicantLegalEntity = profile?.sponsoringBodyName || 'Vidya Vikas Higher Education Trust';
      defaults.entityType = 'TRUST';
      defaults.entityRegistrationNumber = 'MAH/PUN/TR/2012/8821';
      defaults.institutionProposedName = 'Apex Global Institute of Engineering & Technology';
      defaults.siteAddress = 'Survey No. 45/1A & 45/2B, Knowledge Corridor, Haveli, Pune - 412207';
      defaults.landTotalAcreage = 5.0;
      defaults.landCategory = 'URBAN';
      defaults.landOwnershipType = 'FREEHOLD';
      defaults.landLeaseDurationYears = 30;
      defaults.cluOrderNumber = 'REV/CLU/PUN/2024/9912';
      defaults.totalInstructionalAreaSqM = 5400;
      defaults.totalAdminAreaSqM = 1600;
      defaults.totalAmenitiesAreaSqM = 1200;
      defaults.bankCert3Amount = 1.5;
      defaults.proposedProgrammesList = 'B.Tech Computer Science & Engineering (120), B.Tech AI & Data Science (60)';
      defaults.facilityVideoUrl = 'https://youtu.be/aicte-campus-walkthrough-2026';
    } else if (catId === 2) {
      defaults.auditYear = '2025–26';
      defaults.totalEnrolledStudents = 720;
      defaults.regularFacultyCount = 48;
      defaults.cadreRatioVerified = '1:2:6';
      defaults.deficienciesDeclared = 'NIL (Fully compliant with Table 2.3 norms)';
      defaults.occupancyCertificateRef = 'PMRDA/OCC/2024/104';
      defaults.occupancyCertificateDate = '2024-05-12';
      defaults.fireNocNumber = 'MH-FIR-2025-8819';
      defaults.fireNocExpiryDate = '2027-03-31';
      defaults.buildingCompletionDate = '2020-04-15';
    } else if (catId === 3) {
      defaults.nriSeatsPercentage = 5;
      defaults.nriTuitionFeeAnnualUsd = 4500;
      defaults.intlStudentCellHead = 'Dr. Priya Nair (Dean International Affairs)';
      defaults.hostelCapacityNri = 40;
      defaults.stateAdmissionNodalRef = 'CET-CELL/NRI-QUOTA/2026/089';
    } else if (catId === 16) {
      defaults.foreignUniversityName = 'University of California, Riverside (UCR) / Cranfield University';
      defaults.foreignCountry = 'USA / United Kingdom';
      defaults.foreignPartnerRankingScore = 'QS World Top 250 / Times Higher Education Rank 180';
      defaults.proposedCollaborativeDegree = 'Dual Degree B.Tech Computer Science (2+2 Model)';
      defaults.curriculumSyncDetails = 'Credit articulation mapped 80 ECTS transfer per Chapter VIII §8.3';
      defaults.mouExecutionDate = '2025-11-20';
      defaults.visaContingencyPlanAffidavit11 = 'Affidavit 11 sworn before First Class Judicial Magistrate';
      defaults.nbaAccreditedBranches = 'B.Tech Computer Science (Valid NBA 2024-2027)';
    } else if (catId === 18) {
      defaults.closureType = 'PROGRESSIVE_CLOSURE';
      defaults.studentsReallocationPlan = 'Continuing students will be supported with full lab and faculty access until batch graduation in 2028.';
      defaults.teachOutCadreCommitment = true;
      defaults.affidavit4Submitted = true;
      defaults.stateNocRefDate = 'DTE/MAH/CLOSURE-NOC/2026/19, dated 10-Jan-2026';
    } else if (catId === 21) {
      defaults.currentBankName = profile?.bankName || 'State Bank of India';
      defaults.currentAccountNumber = '••••••••••••4901';
      defaults.newBankName = 'HDFC Bank Ltd';
      defaults.newAccountNumber = '50200088192014';
      defaults.newIfscCode = 'HDFC0000060';
      defaults.newBranchAddress = 'FC Road Branch, Shivaji Nagar, Pune - 411004';
      defaults.reasonForChange = 'Consolidation of operational accounts with corporate treasury branch.';
      defaults.affidavit9Uploaded = true;
    } else if (catId === 22) {
      defaults.currentTrustName = profile?.sponsoringBodyName || 'Vidya Vikas Educational Trust';
      defaults.proposedTrustName = 'Vidya Vikas Foundation for Higher Education and Research';
      defaults.charityCommissionerOrderNo = 'CC/MAH/BOM/REG-AMEND/2025/4412';
      defaults.resolutionDate = '2025-12-15';
      defaults.affidavit10Uploaded = true;
    }

    setDynamicFields(defaults);
  };

  // Fetch all data from backend
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [
        profileRes,
        profilesRes,
        appsRes,
        defRes,
        evcRes,
        decRes,
        appRes,
        compRes,
        notifRes,
        auditRes,
      ] = await Promise.all([
        fetch('/api/institution/profile').then((r) => r.json()),
        fetch('/api/institution/profiles').then((r) => r.json()).catch(() => ({ profiles: [] })),
        fetch('/api/institution/applications').then((r) => r.json()),
        fetch('/api/institution/deficiencies').then((r) => r.json()),
        fetch('/api/institution/evc-visits').then((r) => r.json()),
        fetch('/api/institution/decisions').then((r) => r.json()),
        fetch('/api/institution/appeals').then((r) => r.json()),
        fetch('/api/institution/compliance').then((r) => r.json()),
        fetch('/api/institution/notifications').then((r) => r.json()),
        fetch('/api/institution/audit-trail').then((r) => r.json()),
      ]);

      if (profileRes.profile) setProfile(profileRes.profile);
      if (profilesRes.profiles) setAvailableProfiles(profilesRes.profiles);
      if (appsRes.applications) setApplications(appsRes.applications);
      if (appsRes.summary) setSummaryCounts(appsRes.summary);
      if (defRes.deficiencies) setDeficiencies(defRes.deficiencies);
      if (evcRes.visits) setEvcVisits(evcRes.visits);
      if (decRes.decisions) setDecisions(decRes.decisions);
      if (appRes.appeals) setAppeals(appRes.appeals);
      if (compRes.compliance) setComplianceList(compRes.compliance);
      if (notifRes.notifications) setNotifications(notifRes.notifications);
      if (auditRes.auditTrail) setAuditEvents(auditRes.auditTrail);
    } catch (err) {
      console.error('Failed to load institutional portal data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Switch Institution Profile
  const handleSwitchProfile = async (profileId: string) => {
    try {
      const res = await fetch('/api/institution/profiles/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setInstitutionModalOpen(false);
        loadDashboardData();
      }
    } catch (err) {
      console.error('Failed to switch profile', err);
    }
  };

  // Register Custom Institution
  const handleRegisterCustomInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInstForm.officialName) {
      alert('Please enter official institution name');
      return;
    }
    setSavingCustomInst(true);
    try {
      const res = await fetch('/api/institution/profiles/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customInstForm),
      });
      const data = await res.json();
      if (data.profile) {
        setProfile(data.profile);
        setInstitutionModalOpen(false);
        loadDashboardData();
      }
    } catch (err) {
      alert('Failed to register institution');
    } finally {
      setSavingCustomInst(false);
    }
  };

  // Fetch single application details with timeline
  const openApplicationDetails = async (app: ApplicationSubmissionRecord) => {
    setSelectedApplication(app);
    setViewDetailModalOpen(true);
    try {
      const res = await fetch(`/api/institution/applications/${app.id}`);
      const data = await res.json();
      if (data.timeline) setActiveTimeline(data.timeline);
    } catch {
      setActiveTimeline([]);
    }
  };

  // Filter main applications table
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        app.id.toLowerCase().includes(appTableSearch.toLowerCase()) ||
        app.categoryTitle.toLowerCase().includes(appTableSearch.toLowerCase()) ||
        (app.programDiscipline && app.programDiscipline.toLowerCase().includes(appTableSearch.toLowerCase()));
      const matchesStage = appTableStageFilter === 'ALL' || app.currentState === appTableStageFilter;
      return matchesSearch && matchesStage;
    });
  }, [applications, appTableSearch, appTableStageFilter]);

  // Selected Category Definition for New App (Strict 23 Statutory Categories)
  const selectedCategoryDef = useMemo(() => {
    return APH_23_STATUTORY_CATEGORIES.find((c) => c.id === selectedCategoryId) || APH_23_STATUTORY_CATEGORIES[0];
  }, [selectedCategoryId]);

  // Categories filtered by search
  const filteredCategories = useMemo(() => {
    if (!newAppSearch) return APH_23_STATUTORY_CATEGORIES;
    const q = newAppSearch.toLowerCase();
    return APH_23_STATUTORY_CATEGORIES.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.shortTitle.toLowerCase().includes(q) ||
        c.aphChapterReference.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [newAppSearch]);

  // Grouped Required Fields by section for dynamic, non-static rendering
  const groupedRequiredFields = useMemo(() => {
    const groups: Record<string, CategoryFormFieldDef[]> = {};
    for (const field of (selectedCategoryDef.requiredFields || [])) {
      const g = field.group || 'academic';
      if (!groups[g]) groups[g] = [];
      groups[g].push(field);
    }
    return groups;
  }, [selectedCategoryDef]);

  // Handle Save Draft / Final Submit in Wizard
  const handleSaveOrSubmitNewApp = async (isDraft: boolean) => {
    setIsSubmittingNewApp(true);
    try {
      const res = await fetch('/api/institution/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategoryId,
          programLevel: newAppProgramLevel,
          programDiscipline: newAppDiscipline,
          intakeRequested: newAppIntake,
          isDraft,
          documents: newAppUploadedDocs,
          structuredData: {
            ...dynamicFields,
            additionalCourses,
            terPaymentMode,
            applicantName: profile?.applicantFullName,
            applicantDesignation: profile?.applicantDesignation,
            sponsoringBody: profile?.sponsoringBodyName,
            institutionName: profile?.officialName,
            institutionId: profile?.institutionId,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details) {
          setValidationReport(data.details);
          const errorList = data.details.errors?.map((e: any) => `• ${e.message}`).join('\n') || data.message;
          alert(`Statutory Validation Failed:\n${errorList}`);
          setWizardStep('REVIEW');
        } else {
          throw new Error(data.message || 'Submission failed');
        }
        return;
      }

      alert(
        isDraft
          ? `Draft proposal saved! Reference ID: ${data.application.id}`
          : `Application submitted successfully! Software Reference ID: ${data.application.id}`
      );

      // Reset wizard and return to Applications tab
      setWizardStep('SELECT');
      setNewAppUploadedDocs({});
      setValidationReport(null);
      loadDashboardData();
      if (!isDraft) {
        setReceiptModalApp(data.application);
      }
      setActiveTab('APPLICATIONS');
    } catch (err: any) {
      alert(err.message || 'Error creating application');
    } finally {
      setIsSubmittingNewApp(false);
    }
  };

  // Submit Deficiency Response
  const handleSubmitDeficiencyResponse = async () => {
    if (!respondingDeficiency) return;
    setSubmittingDeficiency(true);
    try {
      const res = await fetch(`/api/institution/deficiencies/${respondingDeficiency.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseNote: deficiencyResponseNote || 'Uploaded renewed statutory certificate.',
          replacementFileName: deficiencyReplacementFile || 'Renewed_Certificate_2026_27.pdf',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Deficiency response failed');

      alert(`Compliance response registered for deficiency ${respondingDeficiency.id}. Routed to Re-Scrutiny.`);
      setRespondingDeficiency(null);
      setDeficiencyResponseNote('');
      setDeficiencyReplacementFile('');
      loadDashboardData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingDeficiency(false);
    }
  };

  // Submit Appeal to Standing Appellate Committee (SAC)
  const handleSubmitAppeal = async () => {
    if (!appealingDecision) return;
    setSubmittingAppeal(true);
    try {
      const res = await fetch('/api/institution/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalApplicationId: appealingDecision.applicationId,
          decisionReference: appealingDecision.officialReferenceNumber,
          groundsForAppeal: appealGrounds,
          supportingEvidenceDocument: appealEvidenceFile || 'Appeal_Grounds_Dossier_2026.pdf',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Appeal submission failed');

      alert(`Appeal filed successfully under APH Chapter II §2.24(a)! Receipt Reference: ${data.appeal.appealReceiptReference}`);
      setAppealingDecision(null);
      setAppealGrounds('');
      setAppealEvidenceFile('');
      loadDashboardData();
      setActiveTab('APPEALS');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingAppeal(false);
    }
  };

  // Acknowledge EVC Inspection Visit
  const handleAcknowledgeEvc = async (visitId: string) => {
    try {
      const res = await fetch(`/api/institution/evc-visits/${visitId}/acknowledge`, { method: 'POST' });
      if (res.ok) {
        alert('EVC Physical Inspection visit confirmed and acknowledged by institution.');
        loadDashboardData();
      }
    } catch {
      alert('Failed to acknowledge visit.');
    }
  };

  // Calculate 7-day countdown for decision
  const calculateAppealCountdown = (decisionDateUtc: string) => {
    const uploadTime = new Date(decisionDateUtc).getTime();
    const deadline = uploadTime + 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const remainingMs = deadline - now;

    if (remainingMs <= 0) {
      return { isExpired: true, text: 'Appeal Window Expired' };
    }
    const days = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return {
      isExpired: false,
      text: `${days}d ${hours}h remaining`,
      days,
      hours,
    };
  };

  const tabTitles: Record<string, string> = {
    OVERVIEW: 'Dashboard',
    APPLICATIONS: 'Dashboard',
    PROFILE: 'Institution Profile',
    NEW_APP: 'Start New Application',
    DOC_CENTRE: 'Document Centre',
    DEFICIENCIES: 'Deficiency Notices',
    RE_SCRUTINY: 'Re-scrutiny Updates',
    EVC_SCHEDULE: 'EVC Visit Schedule',
    EVC_INFO: 'EVC Information',
    DECISIONS: 'Decisions & Communications',
    APPEALS: 'Appeals (7-Day Rule)',
    COMPLIANCE: 'Compliance & Undertakings',
    NOTIFICATIONS: 'Notifications',
    AUDIT_TRAIL: 'Audit / Activity Log',
    HELP: 'Help & APH Support',
  };

  const sidebarNavItems = [
    { id: 'NEW_APP' as TabType, label: 'New Application', icon: FilePlus2 },
    { id: 'APPLICATIONS' as TabType, label: 'My Applications', icon: FileText, badge: applications.length || 5 },
    { id: 'DOC_CENTRE' as TabType, label: 'Document Centre', icon: FolderOpen },
    { id: 'DEFICIENCIES' as TabType, label: 'Deficiency Notices', icon: AlertTriangle, badge: summaryCounts.deficienciesRequiringAction || 1 },
    { id: 'RE_SCRUTINY' as TabType, label: 'Re-scrutiny Updates', icon: RefreshCw },
    { id: 'EVC_SCHEDULE' as TabType, label: 'EVC Visit Schedule', icon: Calendar, badge: evcVisits.length || 1 },
    { id: 'EVC_INFO' as TabType, label: 'EVC Information', icon: Info },
    { id: 'DECISIONS' as TabType, label: 'Decisions & Communications', icon: Award, badge: decisions.length || 2 },
    { id: 'APPEALS' as TabType, label: 'Appeals (7-Day Rule)', icon: Scale, badge: 'SAC' },
    { id: 'COMPLIANCE' as TabType, label: 'Compliance & Undertakings', icon: CheckSquare },
    { id: 'NOTIFICATIONS' as TabType, label: 'Notifications', icon: Bell, badge: notifications.length || 4 },
    { id: 'AUDIT_TRAIL' as TabType, label: 'Audit / Activity Log', icon: History },
    { id: 'HELP' as TabType, label: 'Help & APH Support', icon: HelpCircle },
  ];

  const summaryKpiCards = [
    {
      title: 'Total Applications',
      count: applications.length || 5,
      action: 'View applications',
      dotColor: 'bg-slate-400',
      numColor: 'text-slate-900',
      onClick: () => { setAppTableStageFilter('ALL'); },
    },
    {
      title: 'Draft',
      count: summaryCounts.draft || 0,
      action: 'No action required',
      dotColor: 'bg-slate-400',
      numColor: 'text-slate-900',
      onClick: () => { setAppTableStageFilter('DRAFT'); },
    },
    {
      title: 'Submitted',
      count: summaryCounts.submitted || 1,
      action: 'View applications',
      dotColor: 'bg-blue-600',
      numColor: 'text-blue-600',
      onClick: () => { setAppTableStageFilter('SUBMITTED'); },
    },
    {
      title: 'Under Scrutiny',
      count: summaryCounts.underScrutiny || 1,
      action: 'View applications',
      dotColor: 'bg-blue-600',
      numColor: 'text-blue-600',
      onClick: () => { setAppTableStageFilter('DEFICIENCY_ISSUED'); },
    },
    {
      title: 'Deficiencies',
      count: summaryCounts.deficienciesRequiringAction || 1,
      action: 'Action required',
      dotColor: 'bg-rose-500',
      numColor: 'text-rose-600',
      onClick: () => { setActiveTab('DEFICIENCIES'); },
    },
    {
      title: 'EVC Scheduled',
      count: summaryCounts.evcScheduled || 1,
      action: 'View applications',
      dotColor: 'bg-emerald-600',
      numColor: 'text-emerald-600',
      onClick: () => { setActiveTab('EVC_SCHEDULE'); },
    },
    {
      title: 'Awaiting Decision',
      count: summaryCounts.awaitingDecision || 0,
      action: 'No action required',
      dotColor: 'bg-purple-600',
      numColor: 'text-purple-600',
      onClick: () => { setAppTableStageFilter('ALL'); },
    },
    {
      title: 'Decisions Issued',
      count: summaryCounts.decisionsIssued || 2,
      action: 'View applications',
      dotColor: 'bg-emerald-600',
      numColor: 'text-emerald-600',
      onClick: () => { setActiveTab('DECISIONS'); },
    },
    {
      title: 'Appeals Pending',
      count: summaryCounts.appealsPending || 0,
      action: 'No action required',
      dotColor: 'bg-amber-600',
      numColor: 'text-amber-600',
      onClick: () => { setActiveTab('APPEALS'); },
    },
    {
      title: 'Compliance Due',
      count: summaryCounts.complianceActionsDue || 2,
      action: 'View applications',
      dotColor: 'bg-teal-600',
      numColor: 'text-teal-600',
      onClick: () => { setActiveTab('COMPLIANCE'); },
    },
  ];

  if (activeTab === 'NEW_APP') {
    return (
      <NewApplicationWorkflow
        profile={profile}
        onClose={() => setActiveTab('APPLICATIONS')}
        onApplicationCreated={(newApp) => {
          setReceiptModalApp(newApp);
          loadDashboardData();
          setActiveTab('APPLICATIONS');
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col md:flex-row antialiased selection:bg-slate-200">
      {/* ========================================================
          LEFT SIDEBAR (Matching image_f1bda045.png)
      ======================================================== */}
      <aside className="w-full md:w-[280px] bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 md:h-screen md:sticky md:top-0 md:overflow-y-auto z-20">
        <div>
          {/* Top Brand Block */}
          <div className="p-5 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0f172a] text-white flex items-center justify-center font-bold text-xl font-serif shadow-xs shrink-0 select-none">
                अ
              </div>
              <div>
                <div className="font-bold text-base tracking-tight text-slate-900 leading-snug">
                  AICTE
                </div>
                <div className="text-xs text-slate-400 font-normal leading-snug">
                  Approval Process Portal
                </div>
              </div>
            </div>

            {/* Institution Workspace Card */}
            <div className="mt-4 bg-[#f8fafc] border border-slate-200/70 rounded-xl p-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
                  INSTITUTION WORKSPACE
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setInstitutionModalTab('SWITCH');
                    setInstitutionModalOpen(true);
                  }}
                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline underline-offset-2"
                >
                  Change
                </button>
              </div>
              <span
                className="text-xs font-bold text-slate-800 truncate block mt-0.5"
                title={profile?.officialName}
              >
                {profile?.officialName || 'Indian Institute of Information Technology, Pune'}
              </span>
              <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                PID: {profile?.institutionId || '1-332910401'}
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 py-1 space-y-1 text-xs font-medium">
            {sidebarNavItems.map((item) => {
              const isActive =
                activeTab === item.id ||
                (item.id === 'APPLICATIONS' && (activeTab === 'APPLICATIONS' || activeTab === 'OVERVIEW'));

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 text-slate-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <item.icon className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="text-[11px] font-mono bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full shrink-0">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Footer */}
        <div className="p-3 border-t border-slate-100 bg-white sticky bottom-0">
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200">
                {getInitials(profile?.applicantFullName || user.fullName)}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-900 truncate">
                  {profile?.applicantFullName || user.fullName || 'Dr. Rajesh Deshmukh'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Institution administrator
                </div>
              </div>
            </div>

            {/* Menu Options Popover */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Account options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 text-xs">
                  <button
                    onClick={() => {
                      setActiveTab('PROFILE');
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-slate-700 cursor-pointer"
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Institution Profile</span>
                  </button>
                  {onOpenWorkspaceSelector && (
                    <button
                      onClick={() => {
                        onOpenWorkspaceSelector();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 flex items-center gap-2 text-slate-700 cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Switch Role Workspace</span>
                    </button>
                  )}
                  {onLogout && (
                    <button
                      onClick={() => {
                        onLogout();
                        setUserMenuOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-700 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================
          RIGHT MAIN CONTENT AREA
      ======================================================== */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-normal">Institution workspace</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-semibold">{tabTitles[activeTab] || 'Dashboard'}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <button
              onClick={() => setActiveTab('NOTIFICATIONS')}
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-2 right-2 ring-2 ring-white" />
            </button>

            {/* Profile Avatar Button */}
            <button
              onClick={() => setActiveTab('PROFILE')}
              className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer"
              title="Institution Profile"
            >
              {getInitials(profile?.applicantFullName || user.fullName)}
            </button>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="p-8 space-y-6 max-w-7xl w-full mx-auto flex-1">
          {/* TAB 1: OVERVIEW & MY APPLICATIONS (Unified Dashboard View from image_f1bda045.png) */}
          {(activeTab === 'OVERVIEW' || activeTab === 'APPLICATIONS') && (
            <div className="space-y-6">
              {/* Authorized Institutional Workspace Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>AUTHORIZED INSTITUTIONAL WORKSPACE</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 mb-2">
                    {profile?.officialName || 'Indian Institute of Information Technology, Pune'}
                  </h2>
                  <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-2">
                    <span>AICTE PID: {profile?.institutionId || '1-332910401'}</span>
                    <span className="text-slate-300">•</span>
                    <span>State: {profile?.state || 'Maharashtra'}</span>
                    <span className="text-slate-300">•</span>
                    <span>Applicant: {profile?.applicantFullName || 'Authorized Signatory'}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setInstitutionModalTab('SWITCH');
                        setInstitutionModalOpen(true);
                      }}
                      className="ml-2 px-2.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[11px] font-semibold border border-slate-300 transition-colors cursor-pointer"
                    >
                      Switch / Edit Institution
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveTab('NEW_APP');
                    setWizardStep('SELECT');
                  }}
                  className="bg-[#0f172a] hover:bg-slate-800 active:bg-black text-white px-5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap self-start md:self-center"
                >
                  <FilePlus2 className="w-4 h-4" />
                  <span>Start new application</span>
                </button>
              </div>

              {/* Application Overview Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Application overview</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Current status across the 2025–26 approval cycle
                    </p>
                  </div>

                  <div className="border border-slate-200 bg-white rounded-lg px-3.5 py-1 text-xs text-slate-600 font-normal">
                    Approval cycle <strong className="font-semibold text-slate-900">2025–26</strong>
                  </div>
                </div>

                {/* 10 Summary Cards Grid (2 rows x 5 columns) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
                  {summaryKpiCards.map((card) => (
                    <div
                      key={card.title}
                      onClick={card.onClick}
                      className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between cursor-pointer min-h-[125px]"
                    >
                      <div>
                        <div className={`text-3xl font-bold tracking-tight ${card.numColor}`}>
                          {card.count}
                        </div>
                        <div className="text-xs font-semibold text-slate-700 mt-1">
                          {card.title}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-4 flex items-center gap-1.5 font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full ${card.dotColor}`} />
                        <span>{card.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Institutional Applications Registry Card */}
              <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden mt-6">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Institutional applications registry
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      End-to-end statutory tracking from submission to Council decision
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={appTableSearch}
                        onChange={(e) => setAppTableSearch(e.target.value)}
                        placeholder="Search ID, category, course..."
                        className="pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 w-72 placeholder:text-slate-400 font-normal"
                      />
                    </div>

                    <select
                      value={appTableStageFilter}
                      onChange={(e) => setAppTableStageFilter(e.target.value)}
                      className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All stages</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="DEFICIENCY_ISSUED">Deficiency Issued</option>
                      <option value="EVC_SCHEDULED">EVC Scheduled</option>
                      <option value="DECISION_ISSUED">Decision Issued</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-6 py-3.5">APPLICATION</th>
                        <th className="px-6 py-3.5">CATEGORY & PROGRAMME</th>
                        <th className="px-6 py-3.5">STATUS / STAGE</th>
                        <th className="px-6 py-3.5">DEPARTMENT</th>
                        <th className="px-6 py-3.5">NEXT ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {filteredApplications.map((app) => (
                        <tr
                          key={app.id}
                          onClick={() => openApplicationDetails(app)}
                          className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold font-mono text-slate-900 text-xs">
                              {app.id}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(app.submissionTimestampUtc).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900 text-xs">
                              {app.categoryTitle}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {app.programDiscipline || 'General Technical Course'}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border ${
                              app.currentState === 'SUBMITTED'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : app.currentState === 'DEFICIENCY_ISSUED'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : app.currentState === 'EVC_SCHEDULED'
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : app.currentState === 'DECISION_ISSUED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {app.currentState.replace('_', ' ')}
                            </span>
                            <div className="text-[11px] text-slate-500 mt-1 max-w-[220px] truncate" title={app.currentStageName}>
                              {app.currentStageName}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-xs text-slate-600 max-w-[200px]">
                            {app.responsibleDepartment}
                          </td>

                          <td className="px-6 py-4 text-xs font-medium text-slate-900 max-w-[240px]">
                            {app.nextActionRequired}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        {/* TAB 2: INSTITUTION PROFILE (Part 3.1) */}
        {activeTab === 'PROFILE' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Institution Master Profile (Part 3.1)
                </h3>
                <p className="text-xs text-slate-500">
                  Prefilled into statutory applications; universally customizable for any institution applying to AICTE.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setInstitutionModalTab('SWITCH');
                    setInstitutionModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Switch / Register Institution</span>
                </button>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  ✓ AICTE VERIFIED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Official Name of Institution</label>
                <input
                  type="text"
                  readOnly
                  value={profile?.officialName || ''}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Permanent Institution ID (PID)</label>
                <input
                  type="text"
                  readOnly
                  value={profile?.institutionId || ''}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold text-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-600 font-semibold mb-1">Registered Campus Address</label>
                <input
                  type="text"
                  readOnly
                  value={profile?.completeAddress || ''}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">State & District</label>
                <input
                  type="text"
                  readOnly
                  value={`${profile?.state || ''}, ${profile?.district || ''} - ${profile?.pincode || ''}`}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Applicant Name & Designation</label>
                <input
                  type="text"
                  readOnly
                  value={`${profile?.applicantFullName || ''} (${profile?.applicantDesignation || ''})`}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Official Email Address</label>
                <input
                  type="email"
                  readOnly
                  value={profile?.officialEmail || ''}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Contact Phone Number</label>
                <input
                  type="text"
                  readOnly
                  value={profile?.contactNumber || ''}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-mono text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Sponsoring Organization</label>
                <input
                  type="text"
                  readOnly
                  value={`${profile?.sponsoringBodyName || ''} (${profile?.sponsoringBodyType || ''})`}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded text-slate-800"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Designated Bank (Masked)</label>
                <input
                  type="text"
                  readOnly
                  value={`${profile?.bankName || ''} · ${profile?.bankAccountNumberMasked || ''} (${profile?.bankIfsc || ''})`}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded font-mono text-slate-800"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                To request modifications to verified institutional particulars or bank details, submit Category 18 (Change of Bank Details) or Category 19 (Change of Trust Name/Address).
              </span>
            </div>
          </div>
        )}

        {/* TAB 4: MY APPLICATIONS */}
        {activeTab === 'APPLICATIONS' && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">My Applications</h3>
                <p className="text-xs text-slate-500">All filed proposals for this institution</p>
              </div>
              <span className="text-xs font-mono text-slate-500">Total: {applications.length}</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {applications.map((app) => (
                <div key={app.id} className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{app.id}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-medium text-slate-800">{app.categoryTitle}</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Discipline: {app.programDiscipline || 'General'} · Intake: {app.intakeRequested || 'N/A'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded font-mono font-semibold border bg-slate-100 text-slate-800 border-slate-200">
                      {app.currentState}
                    </span>
                    <button
                      onClick={() => openApplicationDetails(app)}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: DOCUMENT CENTRE (Part 5) */}
        {activeTab === 'DOC_CENTRE' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Institutional Document Centre & Validation Engine (Part 5)
              </h3>
              <p className="text-xs text-slate-500">
                Track document validation states, digital signature validity, version histories, and reviewer remarks.
              </p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
              {applications[0]?.documents.map((doc, idx) => (
                <div key={idx} className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-900">{doc.documentName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        APH Reference: {doc.aphReference} · Version: v{doc.version}
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${
                      doc.status === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : doc.status === 'DEFICIENCY_FOUND'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                      {doc.status}
                    </span>
                  </div>

                  {doc.reviewerRemarks && (
                    <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                      <strong>Reviewer Remarks: </strong> {doc.reviewerRemarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: DEFICIENCY NOTICES & RE-SCRUTINY (Part 8) */}
        {activeTab === 'DEFICIENCIES' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Deficiency Notices & Re-Scrutiny Resolution Centre (Part 8)
              </h3>
              <p className="text-xs text-slate-500">
                Resolve statutory document shortcomings pointed out by the Scrutiny Committee before the deadline.
              </p>
            </div>

            {deficiencies.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No active deficiency notices recorded for your institution.
              </div>
            ) : (
              <div className="space-y-4">
                {deficiencies.map((def) => (
                  <div key={def.id} className="border border-amber-200 bg-amber-50/50 rounded-lg p-5 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[11px]">
                      <span className="font-bold text-amber-900">Deficiency ID: {def.id}</span>
                      <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold">
                        {def.status}
                      </span>
                    </div>

                    <div className="font-semibold text-slate-900 text-sm">
                      {def.affectedDocumentName} ({def.deficiencyType})
                    </div>
                    <p className="text-slate-700 leading-relaxed">{def.explanation}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 font-mono">
                      <div>APH Reference: {def.aphReference}</div>
                      <div>Deadline: {new Date(def.deadline).toLocaleDateString()}</div>
                      <div>Reviewer: {def.responsibleReviewerRole}</div>
                      <div>Action: {def.correctiveActionRequired}</div>
                    </div>

                    {def.status === 'OPEN' && (
                      <div className="pt-2">
                        {respondingDeficiency?.id === def.id ? (
                          <div className="bg-white p-4 rounded-lg border border-slate-300 space-y-3">
                            <label className="block text-xs font-semibold text-slate-800">
                              Rectification Response Note & Evidence:
                            </label>
                            <textarea
                              rows={3}
                              value={deficiencyResponseNote}
                              onChange={(e) => setDeficiencyResponseNote(e.target.value)}
                              placeholder="Detail statutory compliance, renewal reference, or clarification..."
                              className="w-full p-2.5 text-xs border border-slate-300 rounded"
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] text-slate-500 font-mono">
                                Replacement: Renewed_Certificate_2026.pdf
                              </span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setRespondingDeficiency(null)}
                                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  disabled={submittingDeficiency}
                                  onClick={handleSubmitDeficiencyResponse}
                                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
                                >
                                  {submittingDeficiency ? 'Submitting...' : 'Submit for Re-Scrutiny'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRespondingDeficiency(def);
                              setDeficiencyResponseNote('Uploaded renewed Fire Safety Certificate issued by Municipal Fire Services for AY 2026-27.');
                              setDeficiencyReplacementFile('Renewed_Fire_Safety_NOC_2026.pdf');
                            }}
                            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload Rectification & Submit Response</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: RE-SCRUTINY UPDATES */}
        {activeTab === 'RE_SCRUTINY' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Re-Scrutiny Queue Status</h3>
            <p className="text-xs text-slate-500">
              Only the rectified documents and dependent rules are evaluated by the Re-Scrutiny Committee.
            </p>
            <div className="p-4 bg-slate-50 rounded-lg text-xs text-slate-600 space-y-1">
              <div>Active Cases in Re-Scrutiny: <strong>{applications.filter(a => a.currentState === 'CORRECTION_SUBMITTED').length}</strong></div>
              <div>Original scrutiny findings remain preserved for complete audit traceability.</div>
            </div>
          </div>
        )}

        {/* TAB 8: EVC VISIT SCHEDULE (Part 9) */}
        {activeTab === 'EVC_SCHEDULE' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Expert Visit Committee (EVC) Schedule & Logistics (Part 9)
              </h3>
              <p className="text-xs text-slate-500">
                Physical and online inspection schedules assigned by Regional Directorate.
              </p>
            </div>

            {evcVisits.map((visit) => (
              <div key={visit.id} className="border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-900">Ref: {visit.visitReference}</span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{visit.applicationId} — {visit.visitType} Inspection</h4>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono font-semibold">
                    {visit.visitStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-lg text-slate-700">
                  <div><strong>Date: </strong>{visit.scheduledDate}</div>
                  <div><strong>Timing: </strong>{visit.startTime} - {visit.endTime} {visit.timezone}</div>
                  <div><strong>Location: </strong>{visit.locationOrMeetingUrl}</div>
                </div>

                {/* Committee Panel Roster */}
                <div>
                  <h5 className="font-bold text-slate-800 mb-1.5">Constituted Inspection Panel:</h5>
                  <div className="space-y-1">
                    {visit.committeeRoster.map((m, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <strong className="text-slate-800">{m.role}: </strong>
                        <span>{m.designation} ({m.organization})</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preparation Instructions */}
                <div>
                  <h5 className="font-bold text-slate-800 mb-1.5">Preparation Instructions:</h5>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                    {visit.preparationInstructions.map((inst, idx) => (
                      <li key={idx}>{inst}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Coordinator: {visit.coordinatorContact}
                  </span>
                  {!visit.isAcknowledgedByInstitution ? (
                    <button
                      type="button"
                      onClick={() => handleAcknowledgeEvc(visit.id)}
                      className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
                    >
                      Acknowledge Visit Notice
                    </button>
                  ) : (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1 font-mono text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Visit Acknowledged
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 9: EVC INFORMATION */}
        {activeTab === 'EVC_INFO' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs text-slate-700">
            <h3 className="text-base font-bold text-slate-900">EVC Norms & Infrastructure Standards</h3>
            <p className="leading-relaxed">
              Under APH Chapter I Clause 1.9 and Chapter VI, the Expert Visit Committee verifies physical readiness of instructional and administrative areas, faculty appointments, equipment availability, and broadband internet.
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="font-bold text-slate-900">Mandatory 30-Minute Video Recording (Clause 1.9(f-g)):</div>
              <p className="text-[11px]">
                The institution must prepare an unedited facilities video covering campus entry with GPS coordinates, laboratories, classrooms, and library, upload to YouTube, and provide the secure link on the portal.
              </p>
            </div>
          </div>
        )}

        {/* TAB 10: DECISIONS AND OFFICIAL COMMUNICATIONS (Part 10) */}
        {activeTab === 'DECISIONS' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Decisions & Official Communications (Part 10)
              </h3>
              <p className="text-xs text-slate-500">
                Official sanctions released by the Competent Authority (LoA, EoA, LoD, LoR).
              </p>
            </div>

            <div className="space-y-4">
              {decisions.map((dec) => {
                const appealWindow = dec.appealEligible && dec.decisionDate ? calculateAppealCountdown(dec.decisionDate) : null;

                return (
                  <div key={dec.id} className="border border-slate-200 rounded-xl p-5 space-y-3 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-slate-500">Ref: {dec.officialReferenceNumber}</span>
                        <h4 className="text-sm font-bold text-slate-900">{dec.decisionTitle}</h4>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                        dec.decisionType === 'EOA' || dec.decisionType === 'LOA'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {dec.decisionType} ({dec.decisionStatus})
                      </span>
                    </div>

                    <p className="text-slate-700 leading-relaxed">{dec.recordedReasons}</p>

                    {/* Conditions */}
                    {dec.conditionsOrUndertakings.length > 0 && (
                      <div className="bg-slate-50 p-3 rounded-lg space-y-1">
                        <strong className="text-slate-800">Statutory Conditions:</strong>
                        <ul className="list-disc pl-4 text-slate-600 text-[11px]">
                          {dec.conditionsOrUndertakings.map((cond, i) => (
                            <li key={i}>{cond}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 7-Day Appeal Alert if eligible */}
                    {dec.appealEligible && appealWindow && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between text-rose-900">
                        <div className="flex items-center gap-2">
                          <Scale className="w-4 h-4 text-rose-700" />
                          <span>
                            <strong>7-Day Statutory Appeal Window: </strong>
                            APH Chapter II Clause 2.24(a) — {appealWindow.text}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAppealingDecision(dec);
                            setAppealGrounds('Institution fulfilled state board affiliation criteria as certified by Directorate of Technical Education.');
                          }}
                          className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-semibold cursor-pointer"
                        >
                          File Appeal to SAC
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 11: APPEALS AND 7-DAY WINDOW (Part 11) */}
        {activeTab === 'APPEALS' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Statutory Appeals & The 7-Day Window (Part 11)
              </h3>
              <p className="text-xs text-slate-500">
                Under APH Chapter II Clause 2.24(a), an aggrieved institution has the right to appeal once to the Council within 7 days from the upload of the decision.
              </p>
            </div>

            {/* Appeal Filing Form if active */}
            {appealingDecision && (
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-5 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">
                    File Appeal for Decision: {appealingDecision.officialReferenceNumber}
                  </h4>
                  <button onClick={() => setAppealingDecision(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">Grounds for Appeal:</label>
                  <textarea
                    rows={3}
                    value={appealGrounds}
                    onChange={(e) => setAppealGrounds(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                    placeholder="Specify factual or regulatory basis under APH provisions..."
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Target Tribunal: Standing Appellate Committee (SAC)
                  </span>
                  <button
                    type="button"
                    disabled={submittingAppeal}
                    onClick={handleSubmitAppeal}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    {submittingAppeal ? 'Filing Appeal...' : 'Submit Appeal to Council'}
                  </button>
                </div>
              </div>
            )}

            {/* Existing Appeals List */}
            {appeals.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No active appeals submitted.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
                {appeals.map((app) => (
                  <div key={app.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="font-bold text-slate-900">Receipt Ref: {app.appealReceiptReference}</span>
                      <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-bold">
                        {app.appealStatus}
                      </span>
                    </div>
                    <p className="text-slate-700"><strong>Grounds: </strong>{app.groundsForAppeal}</p>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Tribunal: {app.assignedReviewBody} · Submitted: {new Date(app.submissionTimestamp || '').toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 12: COMPLIANCE AND UNDERTAKINGS (Part 12) */}
        {activeTab === 'COMPLIANCE' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Compliance & Post-Approval Undertakings (Part 12)
              </h3>
              <p className="text-xs text-slate-500">
                Statutory conditions, biometric attendance records, and annual compliance submissions.
              </p>
            </div>

            <div className="space-y-3">
              {complianceList.map((comp) => (
                <div key={comp.id} className="border border-slate-200 rounded-lg p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="font-bold text-slate-900">{comp.obligationReference}</span>
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      comp.verificationStatus === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {comp.verificationStatus}
                    </span>
                  </div>

                  <p className="text-slate-800 font-medium">{comp.requiredAction}</p>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Source: {comp.sourceOfObligation} · Due: {new Date(comp.dueDate).toLocaleDateString()}
                  </div>

                  {comp.verificationStatus === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => alert(`Submitted evidence for ${comp.obligationReference}`)}
                      className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
                    >
                      Submit Compliance Evidence
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 13: NOTIFICATIONS (Part 13) */}
        {activeTab === 'NOTIFICATIONS' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                In-App Notification Centre (Part 13)
              </h3>
              <p className="text-xs text-slate-500">
                Statutory communications, deficiency alerts, and deadline warnings.
              </p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
              {notifications.map((n) => (
                <div key={n.id} className="p-4 space-y-1 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{n.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(n.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{n.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 14: AUDIT TRAIL */}
        {activeTab === 'AUDIT_TRAIL' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Institutional Activity & Immutable Audit Trail
              </h3>
              <p className="text-xs text-slate-500">
                Append-only log of every application state transition and document upload.
              </p>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs font-mono">
              {auditEvents.map((a) => (
                <div key={a.id} className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-900">{a.action}</span>
                    <span className="text-slate-400">{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-700 font-sans">{a.details}</div>
                  <div className="text-[10px] text-slate-400">Actor: {a.actor}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 15: HELP & APH SUPPORT */}
        {activeTab === 'HELP' && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">Approval Process Handbook (APH 2024-2027) Regulatory Guide</h3>
            <p className="text-slate-600 leading-relaxed">
              AICTE FlowGuard operates strictly under the deterministic rules prescribed in the Approval Process Handbook 2024-2027 notified under the AICTE Act 1987.
            </p>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-slate-700">
              <div><strong>Central Helpdesk: </strong>011-29581000 | helpdesk@aicte-india.org</div>
              <div><strong>Approval Bureau: </strong>Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070</div>
              <div><strong>Western Regional Office (WRO): </strong>Industrial Assurance Building, Veer Nariman Road, Churchgate, Mumbai - 400020</div>
            </div>
          </div>
        )}
        </main>
      </div>

      {/* Floating Help Button (Bottom-Right, matching image_f1bda045.png) */}
      <button
        type="button"
        onClick={() => setActiveTab('HELP')}
        className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-[#0f172a] hover:bg-slate-800 text-white flex items-center justify-center shadow-lg transition-all cursor-pointer z-40 text-lg font-bold font-sans"
        title="Help & APH Support"
      >
        ?
      </button>

      {/* ========================================================
          MODAL 1: VIEW DETAILS MODAL (Timeline, Docs, Actions)
      ======================================================== */}
      {viewDetailModalOpen && selectedApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10">
              <div>
                <span className="text-xs text-amber-400 font-mono font-bold">{selectedApplication.id}</span>
                <h3 className="text-base font-bold leading-tight">{selectedApplication.categoryTitle}</h3>
              </div>
              <button
                onClick={() => setViewDetailModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* Status Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-slate-500">Current Status: </span>
                  <span className="font-mono font-bold text-slate-900">{selectedApplication.currentState}</span>
                  <div className="text-[11px] text-slate-600 mt-0.5">{selectedApplication.currentStageName}</div>
                </div>
                <button
                  onClick={() => setReceiptModalApp(selectedApplication)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Summary Receipt</span>
                </button>
              </div>

              {/* End-to-End Timeline (Part 7) */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-900 text-sm">Application Processing Timeline (Part 7)</h4>
                {activeTimeline.length === 0 ? (
                  <div className="text-slate-400 text-xs">No recorded events yet.</div>
                ) : (
                  <div className="relative pl-6 space-y-4 border-l-2 border-slate-200">
                    {activeTimeline.map((evt) => (
                      <div key={evt.id} className="relative space-y-1">
                        <div className="absolute -left-[31px] top-0 w-3 h-3 rounded-full bg-slate-900 border-2 border-white" />
                        <div className="flex items-center justify-between font-mono text-[11px]">
                          <span className="font-bold text-slate-900">{evt.stageName}</span>
                          <span className="text-slate-400">{new Date(evt.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-700 font-sans">{evt.eventDescription}</p>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Action by: {evt.responsibleRole}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewDetailModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: FLOWGUARD SUBMISSION SUMMARY RECEIPT (Part 6.2)
      ======================================================== */}
      {receiptModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 text-xs">
            <div className="text-center pb-3 border-b border-slate-200 space-y-1">
              <div className="font-bold text-sm text-slate-900">AICTE FLOWGUARD SUBMISSION RECEIPT</div>
              <div className="text-[11px] text-slate-500 font-mono">
                SIH26262 Prototype Verification Document
              </div>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-lg font-mono text-[11px]">
              <div><strong>Application ID: </strong>{receiptModalApp.id}</div>
              <div><strong>Institution: </strong>{receiptModalApp.institutionName}</div>
              <div><strong>Permanent ID: </strong>{receiptModalApp.institutionId}</div>
              <div><strong>Category: </strong>{receiptModalApp.categoryTitle}</div>
              <div><strong>Submitted By: </strong>{receiptModalApp.applicantName} ({receiptModalApp.applicantDesignation})</div>
              <div><strong>Submission Timestamp (UTC): </strong>{receiptModalApp.submissionTimestampUtc}</div>
              <div><strong>Display Timezone: </strong>{receiptModalApp.displayTimezone}</div>
              <div><strong>Confirmation Ref: </strong>{receiptModalApp.confirmationReference}</div>
              <div><strong>Rule Engine Version: </strong>{receiptModalApp.ruleVersion}</div>
            </div>

            <div className="text-[10px] text-slate-400 text-center leading-tight">
              Notice: This is a software submission receipt generated by the AICTE FlowGuard prototype system and is distinct from an official AICTE receipt.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setReceiptModalApp(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: INSTITUTION WORKSPACE SWITCHER & REGISTRATION
      ======================================================== */}
      {institutionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Institutional Identity & Workspace
                </h3>
                <p className="text-xs text-slate-500">
                  AICTE portal is universally designed for any technical or higher education institution across India.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInstitutionModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setInstitutionModalTab('SWITCH')}
                className={`pb-2.5 px-3 font-semibold text-xs transition-colors cursor-pointer border-b-2 ${
                  institutionModalTab === 'SWITCH'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Switch Existing Institution ({availableProfiles.length})
              </button>
              <button
                type="button"
                onClick={() => setInstitutionModalTab('REGISTER')}
                className={`pb-2.5 px-3 font-semibold text-xs transition-colors cursor-pointer border-b-2 ${
                  institutionModalTab === 'REGISTER'
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                + Register / Apply as New Institution
              </button>
            </div>

            {/* TAB: SWITCH PROFILES */}
            {institutionModalTab === 'SWITCH' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-600">
                  Select any institution to load its verified PID, authorized representatives, applications, and statutory approvals:
                </p>
                <div className="space-y-2.5">
                  {availableProfiles.map((p) => {
                    const isCurrent = profile?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSwitchProfile(p.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-blue-50/50 border-blue-300 ring-1 ring-blue-400'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">{p.officialName}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              {p.sponsoringBodyType}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            PID: <span className="font-mono font-semibold text-slate-700">{p.institutionId}</span> · {p.district}, {p.state} · Head: {p.applicantFullName} ({p.applicantDesignation})
                          </div>
                        </div>
                        {isCurrent ? (
                          <span className="px-2.5 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold shrink-0">
                            Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-semibold shrink-0 cursor-pointer"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: REGISTER / CUSTOM PROFILE */}
            {institutionModalTab === 'REGISTER' && (
              <form onSubmit={handleRegisterCustomInstitution} className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
                  Fill in your institution details below. Any college, university department, or new applicant society can set their identity here!
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Official Name of Institution *</label>
                    <input
                      type="text"
                      required
                      value={customInstForm.officialName}
                      onChange={(e) => setCustomInstForm({ ...customInstForm, officialName: e.target.value })}
                      placeholder="e.g. National Institute of Technology / Apex College of Engineering"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Permanent Institution ID (PID)</label>
                    <input
                      type="text"
                      value={customInstForm.institutionId}
                      onChange={(e) => setCustomInstForm({ ...customInstForm, institutionId: e.target.value })}
                      placeholder="Leave blank for new applicant registration"
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Institution Type / Sponsoring Body</label>
                    <select
                      value={customInstForm.sponsoringBodyType}
                      onChange={(e) => setCustomInstForm({ ...customInstForm, sponsoringBodyType: e.target.value as any })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="TRUST">Registered Public Charitable Trust</option>
                      <option value="SOCIETY">Registered Educational Society</option>
                      <option value="SECTION_8_COMPANY">Section 8 Non-Profit Company</option>
                      <option value="GOVERNMENT">Central / State Government Institution</option>
                      <option value="PPP_BOT">Public-Private Partnership (PPP)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Campus Full Address</label>
                    <input
                      type="text"
                      value={customInstForm.completeAddress}
                      onChange={(e) => setCustomInstForm({ ...customInstForm, completeAddress: e.target.value })}
                      placeholder="Survey / Plot No., Sector / Road name"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">State</label>
                    <input
                      type="text"
                      value={customInstForm.state}
                      onChange={(e) => setCustomInstForm({ ...customInstForm, state: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">District & Pincode</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="District"
                        value={customInstForm.district}
                        onChange={(e) => setCustomInstForm({ ...customInstForm, district: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg"
                      />
                      <input
                        type="text"
                        placeholder="Pincode"
                        value={customInstForm.pincode}
                        onChange={(e) => setCustomInstForm({ ...customInstForm, pincode: e.target.value })}
                        className="w-24 p-2 border border-slate-300 rounded-lg font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Head of Institution / Applicant Name</label>
                    <input
                      type="text"
                      value={customInstForm.applicantFullName}
                      onChange={(e) => setCustomInstForm({ ...customInstForm, applicantFullName: e.target.value })}
                      placeholder="e.g. Prof. R. K. Singhania"
                      className="w-full p-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Official Email Address</label>
                    <input
                      type="email"
                      value={customInstForm.officialEmail}
                      onChange={(e) => setCustomInstForm({ ...customInstForm, officialEmail: e.target.value })}
                      placeholder="e.g. principal@institution.edu.in"
                      className="w-full p-2 border border-slate-300 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setInstitutionModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingCustomInst}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    {savingCustomInst ? 'Registering...' : 'Save & Activate Institution'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
