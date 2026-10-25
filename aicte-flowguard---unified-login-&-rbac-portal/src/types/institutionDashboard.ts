/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ApplicationWorkflowState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'SCRUTINY_PENDING'
  | 'SCRUTINY_IN_PROGRESS'
  | 'DEFICIENCY_ISSUED'
  | 'CORRECTION_SUBMITTED'
  | 'RE_SCRUTINY_PENDING'
  | 'RE_SCRUTINY_IN_PROGRESS'
  | 'EVC_REFERRAL_PENDING'
  | 'EVC_PENDING'
  | 'EVC_SCHEDULED'
  | 'EVC_COMPLETED'
  | 'REPORT_REVIEW_PENDING'
  | 'CLARIFICATION_PENDING'
  | 'DECISION_PENDING'
  | 'DECISION_ISSUED'
  | 'APPEAL_SUBMITTED'
  | 'APPEAL_UNDER_REVIEW'
  | 'APPEAL_DECIDED'
  | 'COMPLIANCE_PENDING'
  | 'COMPLIANCE_COMPLETED'
  | 'CLOSED';

export type DocumentValidationStatus =
  | 'NOT_UPLOADED'
  | 'UPLOADED'
  | 'AWAITING_VALIDATION'
  | 'VALIDATION_IN_PROGRESS'
  | 'VERIFIED'
  | 'DEFICIENCY_FOUND'
  | 'REPLACEMENT_REQUESTED'
  | 'REPLACEMENT_SUBMITTED'
  | 'REVALIDATION_PENDING'
  | 'ACCEPTED_FOR_WORKFLOW'
  | 'REQUIRES_HUMAN_REVIEW';

export interface InstitutionProfile {
  id: string;
  institutionId: string; // e.g. "1-332910401"
  officialName: string;
  completeAddress: string;
  state: string;
  district: string;
  pincode: string;
  applicantFullName: string;
  applicantDesignation: string;
  officialEmail: string;
  contactNumber: string;
  alternateNumber?: string;
  authorizedSignatoryName: string;
  authorizedSignatoryDesignation: string;
  sponsoringBodyType: 'TRUST' | 'SOCIETY' | 'SECTION_8_COMPANY' | 'GOVERNMENT' | 'PPP_BOT';
  sponsoringBodyName: string;
  sponsoringRegistrationNumber: string;
  bankAccountNumberMasked: string;
  bankName: string;
  bankIfsc: string;
  isProfileVerified: boolean;
  updatedAt: string;
}

export interface DocumentRequirement {
  id: string;
  name: string;
  aphReference: string;
  category: string;
  isMandatory: boolean; // false = conditional
  conditionalRuleDescription?: string;
  acceptedFormats: string[]; // e.g. ["PDF", "ZIP"]
  maxSizeMB: number;
  issuingAuthorityOrSignatory: string;
  requiresDigitalSignature: boolean;
  requiresStampOrAffidavit: boolean;
  validityDays?: number;
  verificationStatus: 'VERIFIED_RULE' | 'NEEDS_VERIFICATION';
}

export interface DocumentSubmission {
  requirementId: string;
  documentName: string;
  aphReference: string;
  isMandatory: boolean;
  status: DocumentValidationStatus;
  fileName?: string;
  fileSizeKB?: number;
  fileUrl?: string;
  uploadTimestamp?: string;
  version: number;
  versionHistory: Array<{
    version: number;
    fileName: string;
    uploadTimestamp: string;
    replacedReason?: string;
  }>;
  issueDate?: string;
  expiryDate?: string;
  digitalSignatureVerified?: boolean;
  reviewerRemarks?: string;
  deficiencyId?: string;
}

export interface CategoryFormFieldDef {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  helperText?: string;
  defaultValue?: any;
  group: 'identity' | 'academic' | 'infrastructure' | 'legal' | 'finance' | 'safety' | 'international';
  aphCitation?: string;
  conditionalTrigger?: string;
}

export interface CategoryValidationRule {
  ruleId: string;
  title: string;
  aphCitation: string;
  ruleType: 'FIELD_VALIDATION' | 'CONDITIONAL_DOCUMENT' | 'TIME_LIMIT' | 'ELIGIBILITY';
  conditionDescription: string;
  errorMessage: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ApplicationCategoryDef {
  id: number; // 1 to 23
  code: string;
  title: string;
  shortTitle: string;
  aphChapterReference: string;
  sourceTableAnnexure: string;
  description: string;
  isYearRound: boolean; // Table 2.2 processing period
  applicableStages: string[];
  prerequisites: string[];
  terChargesInfo: string;
  regulatoryVerificationStatus: 'VERIFIED' | 'NEEDS_VERIFICATION';
  documentRequirements: DocumentRequirement[];
  fieldsToCaptureSummary?: string;
  authorizedSignatoriesSummary?: string;
  validityTimeLimitsSummary?: string;
  automationGuidanceSummary?: string;
  verificationStatusNotes?: string;
  requiredFields?: CategoryFormFieldDef[];
  validationRules?: CategoryValidationRule[];
}

export interface ApplicationSubmissionRecord {
  id: string; // e.g. "FG-2026-000001"
  institutionId: string;
  institutionName: string;
  categoryId: number;
  categoryCode: string;
  categoryTitle: string;
  applicantName: string;
  applicantDesignation: string;
  officialEmail: string;
  submittedByUserId: string;
  submissionTimestampUtc: string;
  lastModifiedTimestampUtc: string;
  displayTimezone: string;
  currentState: ApplicationWorkflowState;
  currentStageName: string;
  responsibleDepartment: string;
  latestOfficialUpdate: string;
  nextActionRequired: string;
  deficiencyDeadline?: string;
  ruleVersion: string;
  confirmationReference: string;
  academicYear: string;
  intakeRequested?: number;
  programLevel?: string;
  programDiscipline?: string;
  documents: DocumentSubmission[];
  structuredData: Record<string, any>;
  isLockedForEdits: boolean;
}

export interface ApplicationTimelineEvent {
  id: string;
  applicationId: string;
  timestamp: string;
  stageName: string;
  eventDescription: string;
  statusBefore: ApplicationWorkflowState;
  statusAfter: ApplicationWorkflowState;
  responsibleRole: string;
  actionTaken: string;
  applicantActionRequired?: string;
  deadline?: string;
  deadlineSource?: string;
  supportingCommunicationRef?: string;
}

export interface DeficiencyNotice {
  id: string;
  applicationId: string;
  applicationCategory: string;
  stageIdentified: string;
  affectedDocumentId: string;
  affectedDocumentName: string;
  deficiencyType:
    | 'MISSING_DOCUMENT'
    | 'EXPIRED_DOCUMENT'
    | 'INCOMPLETE_DOCUMENT'
    | 'DIGITAL_SIGNATURE_ISSUE'
    | 'INSTITUTION_MISMATCH'
    | 'INCONSISTENT_FIELDS'
    | 'INCORRECT_FORMAT'
    | 'CONDITIONAL_DOC_MISSING'
    | 'HUMAN_VERIFICATION_REQUIRED';
  explanation: string;
  aphReference: string;
  isRegulatory: boolean;
  detectedTimestamp: string;
  communicatedTimestamp: string;
  responsibleReviewerRole: string;
  correctiveActionRequired: string;
  deadline: string;
  deadlineSource: string;
  status: 'OPEN' | 'RESOLVED' | 'UNDER_RE_SCRUTINY';
  responseNote?: string;
  responseTimestamp?: string;
  resubmittedDocumentName?: string;
}

export interface EvcVisitSchedule {
  id: string;
  applicationId: string;
  visitReference: string;
  institutionName: string;
  institutionAddress: string;
  visitType: 'PHYSICAL' | 'ONLINE';
  scheduledDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  locationOrMeetingUrl: string;
  committeeRoster: Array<{
    role: string;
    designation: string;
    organization: string;
  }>;
  visitAgenda: string[];
  preparationInstructions: string[];
  documentsToMakeAvailable: string[];
  coordinatorContact: string;
  schedulingTimestamp: string;
  visitStatus: 'SCHEDULED' | 'COMPLETED' | 'RESCHEDULED' | 'CANCELLED';
  isAcknowledgedByInstitution: boolean;
  acknowledgedTimestamp?: string;
  postEvcReportStatus?: 'PENDING' | 'SUBMITTED' | 'UNDER_REVIEW';
}

export interface DecisionRecord {
  id: string;
  applicationId: string;
  categoryTitle: string;
  institutionName: string;
  decisionType: 'LOA' | 'EOA' | 'LOD' | 'LOR';
  decisionTitle: string;
  decisionStatus: 'SANCTIONED' | 'DEFICIENCY_ISSUED' | 'REJECTED' | 'CONDITIONAL_APPROVAL';
  decisionDate: string;
  issuingAuthority: string;
  officialReferenceNumber: string;
  recordedReasons: string;
  conditionsOrUndertakings: string[];
  complianceDeadlines?: string;
  appealEligible: boolean;
  appealDeadlineUtc?: string; // 7 days from upload!
  isSampleSimulation: boolean;
  officialDocumentUrl?: string;
}

export interface AppealRecord {
  id: string;
  originalApplicationId: string;
  decisionReference: string;
  decisionUploadTimestamp: string;
  appealDeadlineUtc: string; // Strict 7-day rule (APH Chapter II §2.24(a))
  submissionTimestamp?: string;
  groundsForAppeal: string;
  supportingEvidenceDocument?: string;
  appealReceiptReference: string;
  assignedReviewBody: 'STANDING_APPELLATE_COMMITTEE_SAC' | 'STANDING_HEARING_COMMITTEE_SHC';
  appealStatus: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'HEARING_SCHEDULED' | 'DECIDED';
  hearingDate?: string;
  finalOutcome?: string;
}

export interface ComplianceObligation {
  id: string;
  obligationReference: string;
  sourceOfObligation: string;
  relatedApplicationId: string;
  relatedDecisionRef: string;
  requiredAction: string;
  requiredEvidenceName: string;
  responsibleRole: string;
  dueDate: string;
  dueDateSource: string;
  submissionTimestamp?: string;
  verificationStatus: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'OVERDUE' | 'REQUIRES_HUMAN_REVIEW';
  submittedFileName?: string;
  remarks?: string;
}

export interface InstitutionalNotification {
  id: string;
  recipientId: string;
  event: string;
  title: string;
  message: string;
  timestamp: string;
  channel: 'IN_APP' | 'EMAIL';
  deliveryStatus: 'DELIVERED' | 'READ';
  relatedApplicationId?: string;
  relevantDeadline?: string;
}
