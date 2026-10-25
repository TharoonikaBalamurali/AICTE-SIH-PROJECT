/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
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
} from '../types/institutionDashboard.ts';
import { APH_23_STATUTORY_CATEGORIES, APH_22_CATEGORIES } from '../data/aphMatrixRulesData.ts';

export const institutionalRouter = Router();

export interface ApplicationValidationResult {
  isValid: boolean;
  categoryId: number;
  categoryTitle: string;
  categoryCode: string;
  aphChapterReference: string;
  rulesEvaluated: number;
  errors: Array<{
    fieldId?: string;
    documentId?: string;
    ruleId?: string;
    message: string;
    aphCitation?: string;
    severity: 'ERROR' | 'WARNING';
  }>;
  warnings: Array<{
    fieldId?: string;
    documentId?: string;
    ruleId?: string;
    message: string;
    aphCitation?: string;
  }>;
  ruleVerifications: Array<{
    ruleId: string;
    title: string;
    aphCitation: string;
    passed: boolean;
    remarks: string;
  }>;
}

/**
 * Deterministic statutory validation engine based strictly on the
 * AICTE Approval Process Handbook (APH 2024–2027) 12-page document requirements matrix.
 */
export function validateApplicationProposal(
  categoryId: number,
  structuredData: Record<string, any> = {},
  uploadedDocs: Record<string, any> | Array<any> = {},
  isDraft: boolean = false
): ApplicationValidationResult {
  const categoryDef = APH_23_STATUTORY_CATEGORIES.find((c) => c.id === Number(categoryId));
  if (!categoryDef) {
    return {
      isValid: false,
      categoryId,
      categoryTitle: 'Unknown Category',
      categoryCode: 'UNKNOWN',
      aphChapterReference: 'N/A',
      rulesEvaluated: 0,
      errors: [{ message: `Category ID ${categoryId} is invalid or not found in APH matrix.`, severity: 'ERROR' }],
      warnings: [],
      ruleVerifications: [],
    };
  }

  const errors: ApplicationValidationResult['errors'] = [];
  const warnings: ApplicationValidationResult['warnings'] = [];
  const ruleVerifications: ApplicationValidationResult['ruleVerifications'] = [];

  // Helper to normalize uploaded docs into a map: reqId -> { fileName, isDsc, status }
  const docMap: Record<string, { fileName?: string; isDsc?: boolean; status?: string }> = {};
  if (Array.isArray(uploadedDocs)) {
    for (const d of uploadedDocs) {
      if (d.requirementId) {
        docMap[d.requirementId] = {
          fileName: d.fileName,
          isDsc: Boolean(d.digitalSignatureVerified || d.isDsc),
          status: d.status,
        };
      }
    }
  } else if (uploadedDocs && typeof uploadedDocs === 'object') {
    for (const [k, v] of Object.entries(uploadedDocs)) {
      if (v) {
        docMap[k] = {
          fileName: (v as any).fileName || 'Document.pdf',
          isDsc: Boolean((v as any).isDsc || (v as any).digitalSignatureVerified),
          status: (v as any).status || 'VERIFIED',
        };
      }
    }
  }

  // 1. Validate Category Required Fields (if not a draft)
  if (!isDraft) {
    for (const field of (categoryDef.requiredFields || [])) {
      const val = structuredData[field.id];
      const isMissing = val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
      if (field.required && isMissing) {
        errors.push({
          fieldId: field.id,
          message: `Required field "${field.label}" must be provided.`,
          aphCitation: field.aphCitation || categoryDef.aphChapterReference,
          severity: 'ERROR',
        });
      }
    }
  }

  // 2. Specific Deterministic Cross-cutting Statutory Rules from PDF Matrix

  // 2.1 Building Completion Date / Age > 30 Years rule (Annexure 2 §2.1 & Chapter VI §6.17(h))
  // Structural stability certificate (valid 5 years) is mandatory if building completion date was > 30 years ago
  const buildingCompDate = structuredData.buildingCompletionDate || structuredData.occupancyCertificateDate;
  const buildingAge = Number(structuredData.buildingAgeYears) || (buildingCompDate ? (new Date().getFullYear() - new Date(buildingCompDate).getFullYear()) : 0);
  const isBuildingOver30Years = buildingAge > 30;

  if (isBuildingOver30Years) {
    const hasStructuralStabilityDoc = docMap['DOC_01_04'] || docMap['DOC_02_04'] || docMap['DOC_STRUCTURAL_STABILITY'] || structuredData.structuralStabilityCertUploaded;
    if (!hasStructuralStabilityDoc && !isDraft) {
      errors.push({
        ruleId: 'RULE_BUILDING_AGE_30_YRS',
        fieldId: 'buildingCompletionDate',
        message: `Building age is ${buildingAge} years (> 30 years threshold). Structural Stability Certificate valid for 5 years by a registered Government/CPWD structural engineer is strictly required under APH Chapter VI §6.17(h) and Annexure 2 §2.1.`,
        aphCitation: 'Chapter VI §6.17(h) & Annexure 2 §2.1',
        severity: 'ERROR',
      });
      ruleVerifications.push({
        ruleId: 'RULE_BUILDING_AGE_30_YRS',
        title: 'Building Age > 30 Years Structural Stability',
        aphCitation: 'Chapter VI §6.17(h)',
        passed: false,
        remarks: `Building is ${buildingAge} years old. Structural Stability Certificate (valid 5 years) is missing.`,
      });
    } else {
      ruleVerifications.push({
        ruleId: 'RULE_BUILDING_AGE_30_YRS',
        title: 'Building Age > 30 Years Structural Stability',
        aphCitation: 'Chapter VI §6.17(h)',
        passed: true,
        remarks: `Building is ${buildingAge} years old. Structural Stability Certificate requirement fulfilled.`,
      });
    }
  } else {
    ruleVerifications.push({
      ruleId: 'RULE_BUILDING_AGE_30_YRS',
      title: 'Building Age Structural Stability Check',
      aphCitation: 'Chapter VI §6.17(h)',
      passed: true,
      remarks: 'Building age is within 30-year normal threshold or newly constructed.',
    });
  }

  // 2.2 Land Lease Minimum 30 Years Rule (Annexure 1 pp. 77-78)
  const landOwnershipType = structuredData.landOwnershipType || structuredData.landTenure;
  const leaseDuration = Number(structuredData.landLeaseDurationYears);
  if (landOwnershipType === 'PRIVATE_LEASE') {
    if (leaseDuration && leaseDuration < 30) {
      errors.push({
        ruleId: 'RULE_LAND_LEASE_30_YEARS',
        fieldId: 'landLeaseDurationYears',
        message: `Private land lease duration is ${leaseDuration} years, but APH Chapter I and Annexure 1 strictly mandate a minimum 30-year lease period with minimum 5-year unexpired term.`,
        aphCitation: 'Annexure 1 pp. 77–78',
        severity: 'ERROR',
      });
      ruleVerifications.push({
        ruleId: 'RULE_LAND_LEASE_30_YEARS',
        title: '30-Year Land Lease Compliance',
        aphCitation: 'Annexure 1 pp. 77–78',
        passed: false,
        remarks: `Lease period ${leaseDuration} years is below mandatory 30 years statutory requirement.`,
      });
    } else {
      ruleVerifications.push({
        ruleId: 'RULE_LAND_LEASE_30_YEARS',
        title: '30-Year Land Lease Compliance',
        aphCitation: 'Annexure 1 pp. 77–78',
        passed: true,
        remarks: 'Land lease term fulfills minimum 30-year requirement.',
      });
    }
  }

  // 2.3 Collaboration & Twinning (Category 16): NBA Accreditation or NIRF Top 200
  if (categoryDef.id === 16) {
    const hasNbaOrNirf = structuredData.nbaAccreditedBranches || structuredData.foreignPartnerRankingScore || structuredData.institutionNirfRank;
    const foreignMOU = docMap['DOC_16_01'] || docMap['DOC_TWINNING_MOU'];
    if (!foreignMOU && !isDraft) {
      errors.push({
        ruleId: 'RULE_16_TWINNING_MOU',
        documentId: 'DOC_16_01',
        message: 'Bilateral agreement/MoU between Indian and Foreign Institution with 1st Class Notarized Affidavit 11 visa contingency is required.',
        aphCitation: 'Chapter VIII §8.1 & Affidavit 11',
        severity: 'ERROR',
      });
    }
    ruleVerifications.push({
      ruleId: 'RULE_16_TWINNING_ELIGIBILITY',
      title: 'Twinning / Foreign Collaboration Prerequisites',
      aphCitation: 'Chapter VIII §8.1 & §8.3',
      passed: Boolean(hasNbaOrNirf),
      remarks: hasNbaOrNirf ? 'Institution fulfills NBA or NIRF ranking criteria.' : 'Warning: AICTE Chapter VIII requires NBA or NIRF Top 200.',
    });
  }

  // 2.4 Progressive / Complete Closure (Categories 18 & 20): Student transfer plan and Affidavit 4
  if (categoryDef.id === 18 || categoryDef.id === 20) {
    const hasStudentTransferPlan = docMap['DOC_18_01'] || docMap['DOC_20_01'] || structuredData.studentsReallocationPlan;
    if (!hasStudentTransferPlan && !isDraft) {
      errors.push({
        ruleId: 'RULE_CLOSURE_STUDENT_TRANSFER',
        message: 'Statutory Student Transfer / Redistribution Plan (Format 2) is mandatory to guarantee continuing student rights until graduation.',
        aphCitation: 'Chapter II §2.20 & Format 2',
        severity: 'ERROR',
      });
    }
    const hasAffidavit4 = docMap['DOC_18_02'] || docMap['DOC_20_02'] || structuredData.affidavit4Submitted;
    if (!hasAffidavit4 && !isDraft) {
      errors.push({
        ruleId: 'RULE_CLOSURE_AFFIDAVIT_4',
        message: 'Notarized Affidavit 4 (zero student/faculty liabilities) is required before closure processing.',
        aphCitation: 'Chapter II §2.20 & Affidavit 4',
        severity: 'ERROR',
      });
    }
    ruleVerifications.push({
      ruleId: 'RULE_CLOSURE_PROTECTIONS',
      title: 'Closure Student Protections & Liabilities Audit',
      aphCitation: 'Chapter II §2.20',
      passed: Boolean(hasStudentTransferPlan && hasAffidavit4),
      remarks: 'Student transfer plan and zero-liabilities affidavit assessed.',
    });
  }

  // 2.5 Change in Bank Details (Category 21): Affidavit 9 & Bank Certificate
  if (categoryDef.id === 21) {
    const hasAffidavit9 = docMap['DOC_21_01'] || structuredData.affidavit9Uploaded;
    if (!hasAffidavit9 && !isDraft) {
      errors.push({
        ruleId: 'RULE_BANK_AFFIDAVIT_9',
        message: 'Notarized Affidavit 9 regarding change in bank particulars is mandatory under APH Chapter II §2.23.',
        aphCitation: 'Chapter II §2.23 & Affidavit 9',
        severity: 'ERROR',
      });
    }
    ruleVerifications.push({
      ruleId: 'RULE_BANK_AFFIDAVIT_9',
      title: 'Notarized Affidavit 9 for Bank Detail Alteration',
      aphCitation: 'Chapter II §2.23',
      passed: Boolean(hasAffidavit9),
      remarks: hasAffidavit9 ? 'Affidavit 9 verified.' : 'Affidavit 9 missing.',
    });
  }

  // 2.6 Change of Trust / Society / Company (Category 22): Charity Commissioner / RoC order & Affidavit 10
  if (categoryDef.id === 22) {
    const hasAffidavit10 = docMap['DOC_22_01'] || structuredData.affidavit10Uploaded;
    if (!hasAffidavit10 && !isDraft) {
      errors.push({
        ruleId: 'RULE_TRUST_AFFIDAVIT_10',
        message: 'Notarized Affidavit 10 and Competent Court/Charity Commissioner/RoC Approval Order are required under APH Chapter II §2.22.',
        aphCitation: 'Chapter II §2.22 & Affidavit 10',
        severity: 'ERROR',
      });
    }
    ruleVerifications.push({
      ruleId: 'RULE_TRUST_AFFIDAVIT_10',
      title: 'Trust/Society Alteration Statutory Order & Affidavit 10',
      aphCitation: 'Chapter II §2.22',
      passed: Boolean(hasAffidavit10),
      remarks: hasAffidavit10 ? 'Affidavit 10 & statutory order verified.' : 'Affidavit 10 missing.',
    });
  }

  // 2.7 NRI Seats (Category 3 in statutory list / NRI seat intro)
  if (categoryDef.code.includes('NRI') || categoryDef.id === 3) {
    const nriPercent = Number(structuredData.nriSeatsPercentage || structuredData.nriQuotaPercent);
    if (nriPercent > 5) {
      errors.push({
        ruleId: 'RULE_NRI_MAX_5_PERCENT',
        fieldId: 'nriSeatsPercentage',
        message: `Requested NRI seats percentage is ${nriPercent}%, which exceeds the statutory maximum ceiling of 5% of Approved Intake under APH Chapter II §2.8.`,
        aphCitation: 'Chapter II §2.8 & Table 2.1',
        severity: 'ERROR',
      });
      ruleVerifications.push({
        ruleId: 'RULE_NRI_MAX_5_PERCENT',
        title: '5% NRI Intake Cap Verification',
        aphCitation: 'Chapter II §2.8',
        passed: false,
        remarks: `${nriPercent}% exceeds 5% statutory limit.`,
      });
    } else {
      ruleVerifications.push({
        ruleId: 'RULE_NRI_MAX_5_PERCENT',
        title: '5% NRI Intake Cap Verification',
        aphCitation: 'Chapter II §2.8',
        passed: true,
        remarks: `Requested ${nriPercent || 5}% NRI quota is within 5% statutory limit.`,
      });
    }
  }

  // 2.8 Mandatory Documents Check for Final Submission
  if (!isDraft) {
    for (const reqDoc of categoryDef.documentRequirements) {
      if (reqDoc.isMandatory) {
        const uploaded = docMap[reqDoc.id];
        if (!uploaded) {
          errors.push({
            documentId: reqDoc.id,
            message: `Mandatory statutory document "${reqDoc.name}" is missing (${reqDoc.aphReference}).`,
            aphCitation: reqDoc.aphReference,
            severity: 'ERROR',
          });
        } else if (reqDoc.requiresDigitalSignature && !uploaded.isDsc) {
          warnings.push({
            documentId: reqDoc.id,
            message: `Document "${reqDoc.name}" requires Class 3 Digital Signature (DSC) before formal acceptance.`,
            aphCitation: reqDoc.aphReference,
          });
        }
      }
    }
  }

  // General rule verification tally
  ruleVerifications.unshift({
    ruleId: 'RULE_STATUTORY_CATEGORY_MATCH',
    title: `Statutory Category Verification: ${categoryDef.title}`,
    aphCitation: categoryDef.aphChapterReference,
    passed: true,
    remarks: `Category code ${categoryDef.code} verified against APH 2024–2027 Schedule.`,
  });

  return {
    isValid: errors.length === 0,
    categoryId: categoryDef.id,
    categoryTitle: categoryDef.title,
    categoryCode: categoryDef.code,
    aphChapterReference: categoryDef.aphChapterReference,
    rulesEvaluated: ruleVerifications.length + (categoryDef.requiredFields || []).length,
    errors,
    warnings,
    ruleVerifications,
  };
}

// Default seed institution ID
const INSTITUTION_ID = '1-332910401';

let institutionProfiles: InstitutionProfile[] = [
  {
    id: 'inst_iiit_pune',
    institutionId: '1-332910401',
    officialName: 'Indian Institute of Information Technology, Pune',
    completeAddress: 'Survey No. 25 & 27, Near Bopodi, Pune - 411048, Maharashtra',
    state: 'Maharashtra',
    district: 'Pune',
    pincode: '411048',
    applicantFullName: 'Dr. Rajesh Deshmukh',
    applicantDesignation: 'Principal & Authorized Representative',
    officialEmail: 'abc@institution.in',
    contactNumber: '+91 20 2765 9000',
    alternateNumber: '+91 98220 12345',
    authorizedSignatoryName: 'Prof. S. K. Mahajan',
    authorizedSignatoryDesignation: 'Secretary, Board of Governors',
    sponsoringBodyType: 'PPP_BOT',
    sponsoringBodyName: 'Ministry of Education, GoI & Industry Partners (PPP)',
    sponsoringRegistrationNumber: 'MHRD/IIIT/PPP/2016/04',
    bankAccountNumberMasked: '••••••••••••4901',
    bankName: 'State Bank of India',
    bankIfsc: 'SBIN0001489',
    isProfileVerified: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inst_gce_karad',
    institutionId: '1-109283741',
    officialName: 'Government College of Engineering, Karad',
    completeAddress: 'Vidyanagar, Karad, Dist. Satara - 415124, Maharashtra',
    state: 'Maharashtra',
    district: 'Satara',
    pincode: '415124',
    applicantFullName: 'Prof. (Dr.) Ashok M. Sapre',
    applicantDesignation: 'Principal & Head of Institution',
    officialEmail: 'principal@gcekarad.ac.in',
    contactNumber: '+91 2164 272414',
    alternateNumber: '+91 94220 54321',
    authorizedSignatoryName: 'Director of Technical Education, Maharashtra',
    authorizedSignatoryDesignation: 'State Competent Authority',
    sponsoringBodyType: 'GOVERNMENT',
    sponsoringBodyName: 'Higher and Technical Education Department, Govt. of Maharashtra',
    sponsoringRegistrationNumber: 'MAH-GOV-GCEK-1960',
    bankAccountNumberMasked: '••••••••••••3318',
    bankName: 'Bank of Maharashtra',
    bankIfsc: 'MAHB0000286',
    isProfileVerified: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inst_xavier_tech',
    institutionId: '1-248901234',
    officialName: 'St. Xavier Institute of Science & Technology, Mumbai',
    completeAddress: '5, Mahapalika Marg, Dhobi Talao, Mumbai - 400001, Maharashtra',
    state: 'Maharashtra',
    district: 'Mumbai City',
    pincode: '400001',
    applicantFullName: 'Dr. Fr. Francis Fernandes',
    applicantDesignation: 'Director & Authorized Representative',
    officialEmail: 'director@stxaviers-tech.edu.in',
    contactNumber: '+91 22 2262 0661',
    alternateNumber: '+91 98200 98765',
    authorizedSignatoryName: 'Rev. Dr. Arun D\'Souza',
    authorizedSignatoryDesignation: 'Provincial & Trustee Chairman',
    sponsoringBodyType: 'TRUST',
    sponsoringBodyName: 'Society of Jesus Higher Technical Education Trust',
    sponsoringRegistrationNumber: 'BOM-PTR-1952-0941',
    bankAccountNumberMasked: '••••••••••••7812',
    bankName: 'HDFC Bank',
    bankIfsc: 'HDFC0000060',
    isProfileVerified: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'inst_new_apex',
    institutionId: 'NEW_REG_2026_0912',
    officialName: 'Apex Global Institute of Technology & Research',
    completeAddress: 'Knowledge City, Electronic City Phase II, Bengaluru - 560100, Karnataka',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    pincode: '560100',
    applicantFullName: 'Dr. Arvind S. Kulkarni',
    applicantDesignation: 'Proposed Director & Chief Promoter',
    officialEmail: 'promoter@apex-research.org',
    contactNumber: '+91 80 4123 7890',
    alternateNumber: '+91 97410 11223',
    authorizedSignatoryName: 'Mrs. Rekha A. Kulkarni',
    authorizedSignatoryDesignation: 'Managing Trustee',
    sponsoringBodyType: 'SECTION_8_COMPANY',
    sponsoringBodyName: 'Apex Educational and Research Foundation (Sec 8 Corp)',
    sponsoringRegistrationNumber: 'U80903KA2024NPL188732',
    bankAccountNumberMasked: '••••••••••••9045',
    bankName: 'Canara Bank',
    bankIfsc: 'CNRB0000412',
    isProfileVerified: false,
    updatedAt: new Date().toISOString(),
  },
];

let institutionProfile: InstitutionProfile = { ...institutionProfiles[0] };

// Seed Applications for IIIT Pune across different workflow stages
let applicationsStore: ApplicationSubmissionRecord[] = [
  {
    id: 'FG-2026-000005',
    institutionId: INSTITUTION_ID,
    institutionName: 'Indian Institute of Information Technology, Pune',
    categoryId: 3,
    categoryCode: 'CAT_03_DIP_DEGREE_CONVERSION',
    categoryTitle: 'Diploma-to-Degree Conversion',
    applicantName: 'Dr. Rajesh Deshmukh',
    applicantDesignation: 'Principal & Authorized Representative',
    officialEmail: 'abc@institution.in',
    submittedByUserId: 'usr_inst_001',
    submissionTimestampUtc: '2025-03-24T10:00:00.000Z',
    lastModifiedTimestampUtc: '2025-03-24T10:00:00.000Z',
    displayTimezone: 'IST (UTC+05:30)',
    currentState: 'SUBMITTED',
    currentStageName: 'Submitted to AICTE Regulation Bureau',
    responsibleDepartment: 'Approval Bureau — Scrutiny Cell',
    latestOfficialUpdate: 'Submitted to AICTE Regulation Bureau',
    nextActionRequired: 'Awaiting document review',
    ruleVersion: 'APH 2024-2027 v2.4 (Deterministic)',
    confirmationReference: 'AICTE-SUB-2025-990005',
    academicYear: '2025–26',
    intakeRequested: 60,
    programLevel: 'Under Graduate',
    programDiscipline: 'Computer Science & Engineering',
    isLockedForEdits: true,
    structuredData: {},
    documents: [],
  },
  {
    id: 'FG-2026-000001',
    institutionId: INSTITUTION_ID,
    institutionName: 'Indian Institute of Information Technology, Pune',
    categoryId: 1,
    categoryCode: 'CAT_01_EOA_SELF_DISCLOSURE',
    categoryTitle: 'Extension of Approval (EoA) — Self-Disclosure',
    applicantName: 'Dr. Rajesh Deshmukh',
    applicantDesignation: 'Principal & Authorized Representative',
    officialEmail: 'abc@institution.in',
    submittedByUserId: 'usr_inst_001',
    submissionTimestampUtc: '2026-03-01T10:00:00.000Z',
    lastModifiedTimestampUtc: '2026-03-05T14:30:00.000Z',
    displayTimezone: 'IST (UTC+05:30)',
    currentState: 'DEFICIENCY_ISSUED',
    currentStageName: 'Scrutiny Committee Document Verification',
    responsibleDepartment: 'Approval Bureau - Scrutiny Cell (New Delhi HQ)',
    latestOfficialUpdate: 'Scrutiny Committee flagged 1 deficiency: Cadre ratio requirement in AI division.',
    nextActionRequired: 'Upload appointment orders and submit compliance response before statutory deadline.',
    deficiencyDeadline: '2026-11-15T23:59:59.000Z',
    ruleVersion: 'APH 2024-2027 v2.4 (Deterministic)',
    confirmationReference: 'AICTE-SUB-2026-990141',
    academicYear: '2026-27',
    intakeRequested: 180,
    programLevel: 'Under Graduate',
    programDiscipline: 'Computer Science and Engineering (Artificial Intelligence)',
    isLockedForEdits: true,
    structuredData: {
      facultyCount: 32,
      cadreRatio: '1:2:7',
      builtUpAreaSqM: 9400,
      studentEnrolmentRatio: 0.94,
    },
    documents: [
      {
        requirementId: 'DOC_EOA_01',
        documentName: 'Affidavit 2 (Digitally Signed)',
        aphReference: 'Annexure 2 §2.1(i)',
        isMandatory: true,
        status: 'VERIFIED',
        fileName: 'Affidavit_2_Signed_IIITP_2026.pdf',
        fileSizeKB: 1420,
        fileUrl: '/api/institution/documents/download/doc_eoa_01_v1.pdf',
        uploadTimestamp: '2026-03-01T09:40:00.000Z',
        version: 1,
        versionHistory: [
          {
            version: 1,
            fileName: 'Affidavit_2_Signed_IIITP_2026.pdf',
            uploadTimestamp: '2026-03-01T09:40:00.000Z',
          },
        ],
        digitalSignatureVerified: true,
        reviewerRemarks: 'DSC cryptographically verified. Signatory recognized as Chairman/Secretary.',
      },
      {
        requirementId: 'DOC_EOA_03',
        documentName: 'Valid Occupancy / Completion Certificate (Form D)',
        aphReference: 'Annexure 2 §2.1(iii)',
        isMandatory: true,
        status: 'VERIFIED',
        fileName: 'PMRDA_Occupancy_Cert_BldgA.pdf',
        fileSizeKB: 2890,
        uploadTimestamp: '2026-03-01T09:45:00.000Z',
        version: 1,
        versionHistory: [],
        digitalSignatureVerified: false,
        reviewerRemarks: 'Verified against PMRDA competent authority register.',
      },
      {
        requirementId: 'DOC_EOA_05',
        documentName: 'Valid Fire Safety Certificate',
        aphReference: 'Annexure 2 §2.1(v)',
        isMandatory: true,
        status: 'DEFICIENCY_FOUND',
        fileName: 'Fire_NOC_2023_Expired.pdf',
        fileSizeKB: 840,
        uploadTimestamp: '2026-03-01T09:50:00.000Z',
        version: 1,
        versionHistory: [],
        deficiencyId: 'DEF-2026-001',
        reviewerRemarks: 'Uploaded Fire NOC expired on 31 Dec 2025. Current renewed certificate required.',
      },
    ],
  },
  {
    id: 'FG-2026-000002',
    institutionId: INSTITUTION_ID,
    institutionName: 'Indian Institute of Information Technology, Pune',
    categoryId: 9,
    categoryCode: 'CAT_09_INCREASE_INTAKE_ADDITIONAL_COURSES',
    categoryTitle: 'Increase in Intake or Additional Courses',
    applicantName: 'Dr. Rajesh Deshmukh',
    applicantDesignation: 'Principal & Authorized Representative',
    officialEmail: 'abc@institution.in',
    submittedByUserId: 'usr_inst_001',
    submissionTimestampUtc: '2026-03-02T11:15:00.000Z',
    lastModifiedTimestampUtc: '2026-03-10T09:00:00.000Z',
    displayTimezone: 'IST (UTC+05:30)',
    currentState: 'EVC_SCHEDULED',
    currentStageName: 'Expert Visit Committee (EVC) Physical Inspection',
    responsibleDepartment: 'EVC Operations Command (WRO Mumbai & Delhi)',
    latestOfficialUpdate: 'EVC physical inspection visit scheduled for 28th October 2026.',
    nextActionRequired: 'Ensure infrastructure readiness, equipment stock registers, and YouTube video link uploaded.',
    ruleVersion: 'APH 2024-2027 v2.4 (Deterministic)',
    confirmationReference: 'AICTE-SUB-2026-990288',
    academicYear: '2026-27',
    intakeRequested: 60,
    programLevel: 'Post Graduate',
    programDiscipline: 'M.Tech Cyber Security & Threat Intelligence',
    isLockedForEdits: true,
    structuredData: {
      proposedIntake: 60,
      laboratoriesAvailable: 4,
      specializedServers: 12,
    },
    documents: [],
  },
  {
    id: 'FG-2026-000003',
    institutionId: INSTITUTION_ID,
    institutionName: 'Indian Institute of Information Technology, Pune',
    categoryId: 2,
    categoryCode: 'CAT_02_NRI_SEATS',
    categoryTitle: 'Introduction or Continuation of NRI Seats',
    applicantName: 'Dr. Rajesh Deshmukh',
    applicantDesignation: 'Principal & Authorized Representative',
    officialEmail: 'abc@institution.in',
    submittedByUserId: 'usr_inst_001',
    submissionTimestampUtc: '2026-02-15T09:00:00.000Z',
    lastModifiedTimestampUtc: '2026-03-08T16:00:00.000Z',
    displayTimezone: 'IST (UTC+05:30)',
    currentState: 'DECISION_ISSUED',
    currentStageName: 'Executive Committee Decision Communicated',
    responsibleDepartment: 'Council Executive Secretariat',
    latestOfficialUpdate: 'Extension of Approval granted with 5% NRI seats sanctioned for AY 2026-27.',
    nextActionRequired: 'Download official Extension of Approval (EoA) letter and notify admission authority.',
    ruleVersion: 'APH 2024-2027 v2.4 (Deterministic)',
    confirmationReference: 'AICTE-SUB-2026-988102',
    academicYear: '2026-27',
    intakeRequested: 9,
    programLevel: 'Under Graduate',
    programDiscipline: 'Engineering & Technology (NRI Quota)',
    isLockedForEdits: true,
    structuredData: {},
    documents: [],
  },
  {
    id: 'FG-2026-000004',
    institutionId: INSTITUTION_ID,
    institutionName: 'Indian Institute of Information Technology, Pune',
    categoryId: 3,
    categoryCode: 'CAT_03_DIP_DEGREE_CONVERSION',
    categoryTitle: 'Diploma-to-Degree or Degree-to-Diploma Conversion',
    applicantName: 'Dr. Rajesh Deshmukh',
    applicantDesignation: 'Principal & Authorized Representative',
    officialEmail: 'abc@institution.in',
    submittedByUserId: 'usr_inst_001',
    submissionTimestampUtc: '2026-02-10T12:00:00.000Z',
    lastModifiedTimestampUtc: '2026-10-20T08:30:00.000Z',
    displayTimezone: 'IST (UTC+05:30)',
    currentState: 'DECISION_ISSUED',
    currentStageName: 'Letter of Deficiency (LoD) Issued — Eligible for SAC Appeal',
    responsibleDepartment: 'Approval Bureau / Standing Appellate Committee Secretariat',
    latestOfficialUpdate: 'Letter of Deficiency (LoD) uploaded on 20th Oct 2026. 7-Day statutory appeal window open.',
    nextActionRequired: 'File formal Appeal to Standing Appellate Committee (SAC) before the 7-day deadline expires.',
    ruleVersion: 'APH 2024-2027 v2.4 (Deterministic)',
    confirmationReference: 'AICTE-SUB-2026-981044',
    academicYear: '2026-27',
    isLockedForEdits: true,
    structuredData: {},
    documents: [],
  },
];

// Timeline Events Store
let timelineStore: ApplicationTimelineEvent[] = [
  {
    id: 'EVT_001',
    applicationId: 'FG-2026-000001',
    timestamp: '2026-03-01T10:00:00.000Z',
    stageName: 'Application Submission',
    eventDescription: 'Extension of Approval application successfully submitted with digital signature on AICTE portal.',
    statusBefore: 'DRAFT',
    statusAfter: 'SUBMITTED',
    responsibleRole: 'Institution Authorized Representative',
    actionTaken: 'Final Online Submission & TER Fee Remittance',
    supportingCommunicationRef: 'RECEIPT-2026-0001',
  },
  {
    id: 'EVT_002',
    applicationId: 'FG-2026-000001',
    timestamp: '2026-03-03T11:20:00.000Z',
    stageName: 'Scrutiny Committee',
    eventDescription: 'Scrutiny committee verified civil infrastructure and identified renewal requirement for Fire Safety Certificate.',
    statusBefore: 'SUBMITTED',
    statusAfter: 'DEFICIENCY_ISSUED',
    responsibleRole: 'Scrutiny Committee (Approval Bureau)',
    actionTaken: 'Recorded Statutory Deficiency (DEF-2026-001)',
    applicantActionRequired: 'Upload renewed Fire Safety Certificate from State Fire Department before 15 Nov 2026.',
    deadline: '2026-11-15T23:59:59.000Z',
    deadlineSource: 'APH Chapter II Clause 2.4 & Scrutiny Directive',
    supportingCommunicationRef: 'DEF-NOTICE-2026-001',
  },
  {
    id: 'EVT_003',
    applicationId: 'FG-2026-000002',
    timestamp: '2026-03-10T09:00:00.000Z',
    stageName: 'EVC Visit Scheduled',
    eventDescription: 'Expert Visit Committee constituted by Regional Directorate. On-site physical inspection roster confirmed.',
    statusBefore: 'EVC_PENDING',
    statusAfter: 'EVC_SCHEDULED',
    responsibleRole: 'EVC Coordinator (WRO Mumbai)',
    actionTaken: 'EVC Inspection Panel Assigned',
    applicantActionRequired: 'Acknowledge inspection notice and prepare laboratory hardware and biometric registers.',
    supportingCommunicationRef: 'EVC-SCHED-WRO-2026-18',
  },
  {
    id: 'EVT_004',
    applicationId: 'FG-2026-000004',
    timestamp: '2026-10-20T08:30:00.000Z',
    stageName: 'Council Decision Uploaded',
    eventDescription: 'Executive Committee issued Letter of Deficiency (LoD) regarding state board affiliation syllabus sync.',
    statusBefore: 'DECISION_PENDING',
    statusAfter: 'DECISION_ISSUED',
    responsibleRole: 'Executive Committee, AICTE',
    actionTaken: 'Uploaded Letter of Deficiency (LoD)',
    applicantActionRequired: 'Submit Appeal to Standing Appellate Committee (SAC) within 7 days under APH Clause 2.24(a).',
    deadline: '2026-10-27T08:30:00.000Z',
    deadlineSource: 'APH Chapter II Clause 2.24(a) (Statutory 7-Day Window)',
    supportingCommunicationRef: 'LOD-AICTE-2026-0419',
  },
];

// Deficiency Notices Store
let deficiencyStore: DeficiencyNotice[] = [
  {
    id: 'DEF-2026-001',
    applicationId: 'FG-2026-000001',
    applicationCategory: 'Extension of Approval (EoA) — Self-Disclosure',
    stageIdentified: 'Scrutiny Committee (Annexure 2 §2.1)',
    affectedDocumentId: 'DOC_EOA_05',
    affectedDocumentName: 'Valid Fire Safety Certificate',
    deficiencyType: 'EXPIRED_DOCUMENT',
    explanation: 'The uploaded Fire Safety Certificate expired on 31-12-2025. Under APH Annexure 2 Section 2.1(v), an active, valid Fire Safety Certificate issued by the State Competent Authority is mandatory.',
    aphReference: 'Annexure 2 §2.1(v) & Clause 6.17(i)',
    isRegulatory: true,
    detectedTimestamp: '2026-03-03T11:00:00.000Z',
    communicatedTimestamp: '2026-03-03T11:20:00.000Z',
    responsibleReviewerRole: 'Senior Scrutiny Official (Prof. Ananya Sharma)',
    correctiveActionRequired: 'Upload the renewed Fire Safety Certificate issued by Municipal / State Fire Service Department for the current academic year.',
    deadline: '2026-11-15T23:59:59.000Z',
    deadlineSource: 'Approval Bureau Scrutiny Order (15 Days Rectification Window)',
    status: 'OPEN',
  },
];

// EVC Visits Store
let evcVisitsStore: EvcVisitSchedule[] = [
  {
    id: 'EVC-VISIT-2026-001',
    applicationId: 'FG-2026-000002',
    visitReference: 'AICTE-EVC-WRO-2026-4402',
    institutionName: 'Indian Institute of Information Technology, Pune',
    institutionAddress: 'Survey No. 25 & 27, Near Bopodi, Pune - 411048, Maharashtra',
    visitType: 'PHYSICAL',
    scheduledDate: '2026-10-28',
    startTime: '09:30',
    endTime: '17:00',
    timezone: 'IST (UTC+05:30)',
    locationOrMeetingUrl: 'Main Academic Complex, Cyber Security Research Wing, Room 204',
    committeeRoster: [
      {
        role: 'Chairman / Convener',
        designation: 'Professor (Computer Science & Engineering)',
        organization: 'Indian Institute of Technology, Bombay',
      },
      {
        role: 'Expert Member (Academic)',
        designation: 'Professor (Information Security)',
        organization: 'National Institute of Technology, Surat',
      },
      {
        role: 'Architect / Structural Expert',
        designation: 'Senior Architect (Council of Architecture Reg. CA/2004/318)',
        organization: 'CPWD / Nominated Panel',
      },
    ],
    visitAgenda: [
      'Verification of Cyber Security hardware lab equipment and servers against curriculum',
      'Inspection of server room bandwidth (300 Mbps minimum under Annexure-4)',
      'Verification of Faculty Cadre Ratio (1:15 for PG) and Ph.D. appointment orders',
      'Geotagged photographic audit of physical classrooms and fire exits',
      'Biometric sign-off and video recording of proceedings as per Clause 1.9(g)',
    ],
    preparationInstructions: [
      'Keep original cash memos, equipment stock registers, and software licenses ready',
      'Arrange laptop with scanner and printer in the committee room',
      'Upload 30-minute institutional facilities walkthrough video to YouTube and submit URL',
      'Ensure Principal and concerned HoD are present with photo ID proofs',
    ],
    documentsToMakeAvailable: [
      'Faculty appointment orders, pay slips through bank ECS, and joining reports',
      'Equipment stock register & valid software licenses',
      'Building Completion Certificate & Fire Safety Certificate',
      'Latest audited statement of accounts',
    ],
    coordinatorContact: 'Dr. Ramesh Sundaram, Chief EVC Coordinator (evc.coord@aicte-india.org)',
    schedulingTimestamp: '2026-03-10T09:00:00.000Z',
    visitStatus: 'SCHEDULED',
    isAcknowledgedByInstitution: true,
    acknowledgedTimestamp: '2026-03-10T11:45:00.000Z',
    postEvcReportStatus: 'PENDING',
  },
];

// Decisions Store
let decisionsStore: DecisionRecord[] = [
  {
    id: 'DEC-2026-001',
    applicationId: 'FG-2026-000003',
    categoryTitle: 'Introduction or Continuation of NRI Seats',
    institutionName: 'Indian Institute of Information Technology, Pune',
    decisionType: 'EOA',
    decisionTitle: 'Extension of Approval with Sanctioned NRI Supernumerary Seats',
    decisionStatus: 'SANCTIONED',
    decisionDate: '2026-03-08T16:00:00.000Z',
    issuingAuthority: 'Executive Committee / Competent Authority, AICTE New Delhi',
    officialReferenceNumber: 'AICTE/AB/WRO/1-332910401/2026/EOA-NRI',
    recordedReasons: 'The institution has fulfilled all requirements under APH Chapter II Section 2.8 and Annexure 2 §2.2 based on verified self-disclosure with nil deficiencies.',
    conditionsOrUndertakings: [
      'Admissions under NRI category shall not exceed 5% of Approved Intake',
      'Merit-based admission process must be conducted through State Admission Authority',
      'Unfilled NRI seats shall revert to general category in the final mop-up round',
    ],
    appealEligible: false,
    isSampleSimulation: false,
    officialDocumentUrl: '/api/institution/decisions/download/EOA_NRI_2026_Sanctioned.pdf',
  },
  {
    id: 'DEC-2026-002',
    applicationId: 'FG-2026-000004',
    categoryTitle: 'Diploma-to-Degree or Degree-to-Diploma Conversion',
    institutionName: 'Indian Institute of Information Technology, Pune',
    decisionType: 'LOD',
    decisionTitle: 'Letter of Deficiency (LoD) — Conversion Not Recommended at Scrutiny',
    decisionStatus: 'DEFICIENCY_ISSUED',
    decisionDate: '2026-10-20T08:30:00.000Z',
    issuingAuthority: 'Approval Bureau & Scrutiny Directorate, AICTE New Delhi',
    officialReferenceNumber: 'AICTE/AB/WRO/1-332910401/2026/LOD-CONV-04',
    recordedReasons: 'State Government NOC did not include the specific academic session clearance for conversion under APH Chapter II Clause 2.14.',
    conditionsOrUndertakings: [
      'Institution may appeal to the Standing Appellate Committee (SAC) within 7 days',
      'Submission must include supplementary NOC from State Directorate of Technical Education',
    ],
    appealEligible: true,
    // 7-day window calculation from upload timestamp (Oct 20, 2026 -> Oct 27, 2026)
    appealDeadlineUtc: '2026-10-27T08:30:00.000Z',
    isSampleSimulation: false,
    officialDocumentUrl: '/api/institution/decisions/download/LOD_Conversion_Deficiency_2026.pdf',
  },
];

// Appeals Store
let appealsStore: AppealRecord[] = [];

// Compliance Store
let complianceStore: ComplianceObligation[] = [
  {
    id: 'COMP-2026-001',
    obligationReference: 'AICTE-COMP-WRO-2026-101',
    sourceOfObligation: 'APH Chapter VI Clause 6.14(j) & EoA Sanction Conditions',
    relatedApplicationId: 'FG-2026-000003',
    relatedDecisionRef: 'AICTE/AB/WRO/1-332910401/2026/EOA-NRI',
    requiredAction: 'Implement and submit annual report for Biometric Attendance System for regular faculty members.',
    requiredEvidenceName: 'Biometric Attendance Audit Statement & Service Provider Invoice',
    responsibleRole: 'Principal / Registrar',
    dueDate: '2026-11-30T23:59:59.000Z',
    dueDateSource: 'APH Clause 6.14(j) Mandatory Annual Compliance',
    verificationStatus: 'PENDING',
  },
  {
    id: 'COMP-2026-002',
    obligationReference: 'AICTE-COMP-WRO-2026-102',
    sourceOfObligation: 'APH Chapter VI Clause 6.47 & Clause 6.48',
    relatedApplicationId: 'FG-2026-000001',
    relatedDecisionRef: 'AICTE-SUB-2026-990141',
    requiredAction: 'Constitution of Anti-Ragging Committee (Clause 6.47) and Internal Committee (IC) against Sexual Harassment (Clause 6.48).',
    requiredEvidenceName: 'Gazette Notification of Committees & Member Contact Disclosure URL',
    responsibleRole: 'Head of Institution',
    dueDate: '2026-11-05T23:59:59.000Z',
    dueDateSource: 'Statutory Annual Academic Return',
    verificationStatus: 'PENDING',
  },
];

// Notifications Store
let notificationsStore: InstitutionalNotification[] = [
  {
    id: 'NOTIF_001',
    recipientId: 'abc@institution.in',
    event: 'DEFICIENCY_NOTIFICATION',
    title: 'Statutory Deficiency Notice Issued',
    message: 'Scrutiny Committee has recorded 1 deficiency for application FG-2026-000001 (Fire Safety Certificate renewal).',
    timestamp: '2026-03-03T11:20:00.000Z',
    channel: 'IN_APP',
    deliveryStatus: 'DELIVERED',
    relatedApplicationId: 'FG-2026-000001',
    relevantDeadline: '2026-11-15T23:59:59.000Z',
  },
  {
    id: 'NOTIF_002',
    recipientId: 'abc@institution.in',
    event: 'EVC_SCHEDULED',
    title: 'EVC Physical Inspection Scheduled',
    message: 'Expert Visit Committee has been scheduled for physical inspection on 28th October 2026 for application FG-2026-000002.',
    timestamp: '2026-03-10T09:00:00.000Z',
    channel: 'IN_APP',
    deliveryStatus: 'DELIVERED',
    relatedApplicationId: 'FG-2026-000002',
  },
  {
    id: 'NOTIF_003',
    recipientId: 'abc@institution.in',
    event: 'APPEAL_WINDOW_ACTIVE',
    title: '7-Day Statutory Appeal Window Open (SAC)',
    message: 'Letter of Deficiency (LoD) issued for FG-2026-000004. Appeal to Standing Appellate Committee must be submitted within 7 days (by 27 Oct 2026).',
    timestamp: '2026-10-20T08:30:00.000Z',
    channel: 'IN_APP',
    deliveryStatus: 'DELIVERED',
    relatedApplicationId: 'FG-2026-000004',
    relevantDeadline: '2026-10-27T08:30:00.000Z',
  },
];

// Audit Trail Store for Institution
let auditTrailStore = [
  {
    id: 'AUD-INST-001',
    timestamp: '2026-03-01T10:00:00.000Z',
    actor: 'Dr. Rajesh Deshmukh (Principal)',
    action: 'APPLICATION_SUBMITTED',
    applicationId: 'FG-2026-000001',
    details: 'Submitted EoA Self-Disclosure proposal with Affidavit 2 digitally signed via DSC.',
  },
  {
    id: 'AUD-INST-002',
    timestamp: '2026-03-03T11:20:00.000Z',
    actor: 'Scrutiny Committee (Approval Bureau)',
    action: 'DEFICIENCY_RECORDED',
    applicationId: 'FG-2026-000001',
    details: 'Noted deficiency on DOC_EOA_05 (Fire Safety Certificate renewal required).',
  },
  {
    id: 'AUD-INST-003',
    timestamp: '2026-03-10T09:00:00.000Z',
    actor: 'EVC Coordinator (WRO)',
    action: 'EVC_VISIT_SCHEDULED',
    applicationId: 'FG-2026-000002',
    details: 'Constituted 3-member physical inspection panel for M.Tech Cyber Security expansion.',
  },
];

// ======================== ROUTES ========================

// 1. Get Institution Profile
institutionalRouter.get('/profile', (_req: Request, res: Response) => {
  res.json({ profile: institutionProfile });
});

// Get All Available Institution Profiles
institutionalRouter.get('/profiles', (_req: Request, res: Response) => {
  res.json({
    profiles: institutionProfiles,
    activeProfileId: institutionProfile.id,
  });
});

// Switch Active Institution Profile
institutionalRouter.post('/profiles/switch', (req: Request, res: Response) => {
  const { profileId } = req.body || {};
  const found = institutionProfiles.find((p) => p.id === profileId);
  if (!found) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Institution profile not found.' });
  }

  institutionProfile = { ...found };

  auditTrailStore.unshift({
    id: `AUD-INST-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: `${institutionProfile.applicantFullName} (${institutionProfile.applicantDesignation})`,
    action: 'PROFILE_SWITCHED',
    applicationId: 'INST-PROFILE',
    details: `Switched active institutional workspace to ${institutionProfile.officialName} (PID: ${institutionProfile.institutionId}).`,
  });

  res.json({ success: true, profile: institutionProfile });
});

// Register New Institution Profile
institutionalRouter.post('/profiles/register', (req: Request, res: Response) => {
  const newInst = req.body || {};
  if (!newInst.officialName) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Institution official name is required.' });
  }

  const generatedId = `inst_${Date.now()}`;
  const generatedPid = newInst.institutionId?.trim() || `NEW_REG_${Math.floor(100000 + Math.random() * 900000)}`;

  const createdProfile: InstitutionProfile = {
    id: generatedId,
    institutionId: generatedPid,
    officialName: newInst.officialName,
    completeAddress: newInst.completeAddress || 'Main Campus Road, India',
    state: newInst.state || 'Maharashtra',
    district: newInst.district || 'Pune',
    pincode: newInst.pincode || '411001',
    applicantFullName: newInst.applicantFullName || 'Authorized Representative',
    applicantDesignation: newInst.applicantDesignation || 'Principal / Director',
    officialEmail: newInst.officialEmail || 'applicant@institution.edu.in',
    contactNumber: newInst.contactNumber || '+91 98000 00000',
    alternateNumber: newInst.alternateNumber,
    authorizedSignatoryName: newInst.authorizedSignatoryName || newInst.applicantFullName || 'Authorized Signatory',
    authorizedSignatoryDesignation: newInst.authorizedSignatoryDesignation || 'Secretary, Governing Board',
    sponsoringBodyType: newInst.sponsoringBodyType || 'TRUST',
    sponsoringBodyName: newInst.sponsoringBodyName || `${newInst.officialName} Education Trust`,
    sponsoringRegistrationNumber: newInst.sponsoringRegistrationNumber || `REG-${Date.now()}`,
    bankAccountNumberMasked: '••••••••••••1029',
    bankName: newInst.bankName || 'State Bank of India',
    bankIfsc: newInst.bankIfsc || 'SBIN0001000',
    isProfileVerified: false,
    updatedAt: new Date().toISOString(),
  };

  institutionProfiles.push(createdProfile);
  institutionProfile = { ...createdProfile };

  auditTrailStore.unshift({
    id: `AUD-INST-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: `${institutionProfile.applicantFullName} (${institutionProfile.applicantDesignation})`,
    action: 'INSTITUTION_REGISTERED',
    applicationId: 'INST-PROFILE',
    details: `Registered new institution: ${createdProfile.officialName} with PID: ${createdProfile.institutionId}.`,
  });

  res.json({ success: true, profile: institutionProfile });
});

// Update Institution Profile
institutionalRouter.put('/profile', (req: Request, res: Response) => {
  const updates = req.body || {};
  institutionProfile = {
    ...institutionProfile,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // Also update in profiles array
  const idx = institutionProfiles.findIndex((p) => p.id === institutionProfile.id);
  if (idx !== -1) {
    institutionProfiles[idx] = { ...institutionProfile };
  } else {
    institutionProfiles.push({ ...institutionProfile });
  }

  auditTrailStore.unshift({
    id: `AUD-INST-${Date.now()}`,
    timestamp: new Date().toISOString(),
    actor: `${institutionProfile.applicantFullName} (${institutionProfile.applicantDesignation})`,
    action: 'PROFILE_UPDATED',
    applicationId: 'INST-PROFILE',
    details: `Updated institutional details for ${institutionProfile.officialName}.`,
  });

  res.json({ success: true, profile: institutionProfile });
});

// 2. Get All 23 Categories Catalog
institutionalRouter.get('/categories', (_req: Request, res: Response) => {
  res.json({ categories: APH_23_STATUTORY_CATEGORIES });
});

// Validate Application Proposal against Statutory APH 2024-2027 Rules
institutionalRouter.post('/applications/validate', (req: Request, res: Response) => {
  const { categoryId, structuredData, documents, isDraft } = req.body || {};
  const validationResult = validateApplicationProposal(
    Number(categoryId),
    structuredData || {},
    documents || {},
    Boolean(isDraft)
  );

  res.json({
    ...validationResult,
    rulesCheckedCount: validationResult.rulesEvaluated,
  });
});

// 3. Get Applications for Current Institution
institutionalRouter.get('/applications', (_req: Request, res: Response) => {
  res.json({
    applications: applicationsStore,
    total: applicationsStore.length,
    summary: {
      total: applicationsStore.length,
      draft: applicationsStore.filter((a) => a.currentState === 'DRAFT').length,
      submitted: applicationsStore.filter((a) => a.currentState === 'SUBMITTED').length,
      underScrutiny: applicationsStore.filter((a) =>
        ['SCRUTINY_PENDING', 'SCRUTINY_IN_PROGRESS', 'DEFICIENCY_ISSUED'].includes(a.currentState)
      ).length,
      deficienciesRequiringAction: deficiencyStore.filter((d) => d.status === 'OPEN').length,
      underReScrutiny: applicationsStore.filter((a) =>
        ['CORRECTION_SUBMITTED', 'RE_SCRUTINY_PENDING', 'RE_SCRUTINY_IN_PROGRESS'].includes(a.currentState)
      ).length,
      awaitingEvc: applicationsStore.filter((a) => a.currentState === 'EVC_PENDING').length,
      evcScheduled: applicationsStore.filter((a) => a.currentState === 'EVC_SCHEDULED').length,
      awaitingPostEvcReview: applicationsStore.filter((a) =>
        ['EVC_COMPLETED', 'REPORT_REVIEW_PENDING'].includes(a.currentState)
      ).length,
      awaitingDecision: applicationsStore.filter((a) => a.currentState === 'DECISION_PENDING').length,
      decisionsIssued: applicationsStore.filter((a) => a.currentState === 'DECISION_ISSUED').length,
      appealsPending: appealsStore.filter((a) => a.appealStatus !== 'DECIDED').length,
      complianceActionsDue: complianceStore.filter((c) => c.verificationStatus === 'PENDING').length,
    },
  });
});

// Get Single Application Details
institutionalRouter.get('/applications/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const appItem = applicationsStore.find((a) => a.id === id);
  if (!appItem) {
    return res.status(404).json({ error: 'NOT_FOUND', message: 'Application proposal not found.' });
  }

  const categoryDef = APH_23_STATUTORY_CATEGORIES.find((c) => c.id === appItem.categoryId);
  const appTimeline = timelineStore.filter((t) => t.applicationId === id);
  const appDeficiencies = deficiencyStore.filter((d) => d.applicationId === id);
  const appEvcVisits = evcVisitsStore.filter((v) => v.applicationId === id);
  const appDecisions = decisionsStore.filter((d) => d.applicationId === id);
  const appAppeals = appealsStore.filter((a) => a.originalApplicationId === id);

  res.json({
    application: appItem,
    categoryDefinition: categoryDef,
    timeline: appTimeline,
    deficiencies: appDeficiencies,
    evcVisits: appEvcVisits,
    decisions: appDecisions,
    appeals: appAppeals,
  });
});

// Statutory Validation Pre-Check Endpoint (APH 2024–2027 Deterministic Rules Engine)
institutionalRouter.post('/applications/validate', (req: Request, res: Response) => {
  const { categoryId, structuredData, documents, isDraft } = req.body || {};
  const validation = validateApplicationProposal(
    Number(categoryId) || 1,
    structuredData || {},
    documents || {},
    Boolean(isDraft)
  );
  res.json(validation);
});

// Create Application (Draft or Final Submission)
institutionalRouter.post('/applications', (req: Request, res: Response) => {
  const {
    categoryId,
    programLevel,
    programDiscipline,
    intakeRequested,
    isDraft,
    structuredData,
    documents,
  } = req.body || {};

  const categoryDef = APH_23_STATUTORY_CATEGORIES.find((c) => c.id === Number(categoryId));
  if (!categoryDef) {
    return res.status(400).json({ error: 'INVALID_CATEGORY', message: 'Unknown APH application category.' });
  }

  // Deterministic statutory validation for non-draft submissions
  if (!isDraft) {
    const validation = validateApplicationProposal(categoryDef.id, structuredData || {}, documents || {}, false);
    if (!validation.isValid) {
      return res.status(422).json({
        error: 'STATUTORY_VALIDATION_FAILED',
        message: 'Application proposal does not meet mandatory statutory requirements under APH 2024-2027.',
        details: validation,
      });
    }
  }

  // Generate unique FlowGuard ID
  const nextNumber = applicationsStore.length + 1;
  const appId = `FG-2026-${String(nextNumber).padStart(6, '0')}`;
  const now = new Date().toISOString();

  // Initialize document checklist from category definition
  const initialDocuments = categoryDef.documentRequirements.map((reqDoc) => {
    const uploaded = documents && documents[reqDoc.id];
    if (uploaded) {
      return {
        requirementId: reqDoc.id,
        documentName: reqDoc.name,
        aphReference: reqDoc.aphReference,
        isMandatory: reqDoc.isMandatory,
        status: 'VERIFIED' as const,
        fileName: uploaded.fileName || `${reqDoc.id}_Uploaded.pdf`,
        fileSizeKB: 1250,
        uploadTimestamp: now,
        version: 1,
        versionHistory: [
          {
            version: 1,
            fileName: uploaded.fileName || `${reqDoc.id}_Uploaded.pdf`,
            uploadTimestamp: now,
          },
        ],
        digitalSignatureVerified: Boolean(uploaded.isDsc),
        reviewerRemarks: uploaded.isDsc
          ? 'DSC verified: Cryptographic hash matches authorized signatory token.'
          : 'Uploaded document attached.',
      };
    }

    return {
      requirementId: reqDoc.id,
      documentName: reqDoc.name,
      aphReference: reqDoc.aphReference,
      isMandatory: reqDoc.isMandatory,
      status: 'NOT_UPLOADED' as const,
      version: 0,
      versionHistory: [],
    };
  });

  const newApp: ApplicationSubmissionRecord = {
    id: appId,
    institutionId: institutionProfile.institutionId,
    institutionName: institutionProfile.officialName,
    categoryId: categoryDef.id,
    categoryCode: categoryDef.code,
    categoryTitle: categoryDef.title,
    applicantName: institutionProfile.applicantFullName,
    applicantDesignation: institutionProfile.applicantDesignation,
    officialEmail: institutionProfile.officialEmail,
    submittedByUserId: 'usr_inst_001',
    submissionTimestampUtc: now,
    lastModifiedTimestampUtc: now,
    displayTimezone: 'IST (UTC+05:30)',
    currentState: isDraft ? 'DRAFT' : 'SUBMITTED',
    currentStageName: isDraft ? 'Draft Proposal Preparation' : 'Submitted to AICTE Regulation Bureau',
    responsibleDepartment: 'Approval Bureau - Scrutiny Cell (New Delhi HQ)',
    latestOfficialUpdate: isDraft
      ? 'Application draft saved. Complete document uploads before submission.'
      : 'Application submitted successfully on AICTE portal through National Single Window System (NSWS).',
    nextActionRequired: isDraft
      ? 'Upload required documents and click Submit Application.'
      : 'Awaiting Scrutiny Committee assignment.',
    ruleVersion: 'APH 2024-2027 v2.4 (Deterministic)',
    confirmationReference: `AICTE-SUB-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    academicYear: '2026-27',
    intakeRequested: Number(intakeRequested) || 60,
    programLevel: programLevel || 'Under Graduate',
    programDiscipline: programDiscipline || 'Engineering & Technology',
    isLockedForEdits: !isDraft,
    structuredData: structuredData || {},
    documents: initialDocuments,
  };

  applicationsStore.unshift(newApp);

  // Add timeline event
  timelineStore.unshift({
    id: `EVT_${Date.now()}`,
    applicationId: appId,
    timestamp: now,
    stageName: isDraft ? 'Draft Created' : 'Application Submission',
    eventDescription: isDraft
      ? `Draft application created for category: ${categoryDef.title}`
      : `Application submitted with confirmation reference ${newApp.confirmationReference}`,
    statusBefore: 'DRAFT',
    statusAfter: isDraft ? 'DRAFT' : 'SUBMITTED',
    responsibleRole: 'Institution Representative',
    actionTaken: isDraft ? 'Saved Draft' : 'Final Submission',
    supportingCommunicationRef: newApp.confirmationReference,
  });

  // Record audit
  auditTrailStore.unshift({
    id: `AUD-INST-${Date.now()}`,
    timestamp: now,
    actor: `${institutionProfile.applicantFullName} (${institutionProfile.applicantDesignation})`,
    action: isDraft ? 'APPLICATION_DRAFT_CREATED' : 'APPLICATION_SUBMITTED',
    applicationId: appId,
    details: `${isDraft ? 'Created draft' : 'Submitted'} proposal for category: ${categoryDef.title}.`,
  });

  // Create notification
  notificationsStore.unshift({
    id: `NOTIF_${Date.now()}`,
    recipientId: institutionProfile.officialEmail,
    event: isDraft ? 'APPLICATION_DRAFT_SAVED' : 'APPLICATION_SUBMISSION_CONFIRMED',
    title: isDraft ? 'Application Draft Saved' : 'Application Submission Confirmed',
    message: isDraft
      ? `Draft ${appId} for ${categoryDef.shortTitle} saved successfully.`
      : `Application ${appId} submitted successfully. Confirmation Ref: ${newApp.confirmationReference}`,
    timestamp: now,
    channel: 'IN_APP',
    deliveryStatus: 'DELIVERED',
    relatedApplicationId: appId,
  });

  res.json({ success: true, application: newApp });
});

// Final Submit for an Existing Draft
institutionalRouter.post('/applications/:id/submit', (req: Request, res: Response) => {
  const { id } = req.params;
  const appItem = applicationsStore.find((a) => a.id === id);
  if (!appItem) return res.status(404).json({ error: 'NOT_FOUND' });

  if (appItem.currentState !== 'DRAFT') {
    return res.status(400).json({ error: 'ALREADY_SUBMITTED', message: 'Application is already submitted.' });
  }

  const now = new Date().toISOString();
  appItem.currentState = 'SUBMITTED';
  appItem.currentStageName = 'Submitted to Scrutiny Cell';
  appItem.submissionTimestampUtc = now;
  appItem.lastModifiedTimestampUtc = now;
  appItem.isLockedForEdits = true;
  appItem.latestOfficialUpdate = 'Application submitted and locked for regulatory scrutiny.';
  appItem.nextActionRequired = 'Awaiting document verification by Scrutiny Committee.';

  timelineStore.unshift({
    id: `EVT_${Date.now()}`,
    applicationId: id,
    timestamp: now,
    stageName: 'Application Submission',
    eventDescription: 'Draft finalized and submitted for scrutiny review.',
    statusBefore: 'DRAFT',
    statusAfter: 'SUBMITTED',
    responsibleRole: 'Institution Representative',
    actionTaken: 'Final Submission',
    supportingCommunicationRef: appItem.confirmationReference,
  });

  res.json({ success: true, application: appItem });
});

// 4. Secure Document Upload & Validation
institutionalRouter.post('/applications/:id/upload-document', (req: Request, res: Response) => {
  const { id } = req.params;
  const { requirementId, fileName, fileSizeKB, issueDate, expiryDate, isDigitalSignatureValid } = req.body || {};

  const appItem = applicationsStore.find((a) => a.id === id);
  if (!appItem) return res.status(404).json({ error: 'APPLICATION_NOT_FOUND' });

  let docSub = appItem.documents.find((d) => d.requirementId === requirementId);
  const now = new Date().toISOString();

  if (!docSub) {
    docSub = {
      requirementId,
      documentName: fileName || 'Uploaded Document',
      aphReference: 'Annexure 2 / Annexure 1',
      isMandatory: true,
      status: 'UPLOADED',
      version: 1,
      versionHistory: [],
    };
    appItem.documents.push(docSub);
  }

  const newVersion = (docSub.version || 0) + 1;
  docSub.version = newVersion;
  docSub.fileName = fileName || `Document_v${newVersion}.pdf`;
  docSub.fileSizeKB = fileSizeKB || 1850;
  docSub.uploadTimestamp = now;
  docSub.status = 'AWAITING_VALIDATION';
  docSub.issueDate = issueDate || '2026-01-15';
  docSub.expiryDate = expiryDate || undefined;
  docSub.digitalSignatureVerified = Boolean(isDigitalSignatureValid ?? true);

  docSub.versionHistory.push({
    version: newVersion,
    fileName: docSub.fileName || fileName || 'document.pdf',
    uploadTimestamp: now,
    replacedReason: 'Document uploaded / replaced by applicant',
  });

  // Deterministic checks
  if (docSub.digitalSignatureVerified) {
    docSub.status = 'VERIFIED';
    docSub.reviewerRemarks = 'File format valid. DSC verified.';
  } else {
    docSub.status = 'REQUIRES_HUMAN_REVIEW';
    docSub.reviewerRemarks = 'Awaiting Scrutiny Committee human verification.';
  }

  appItem.lastModifiedTimestampUtc = now;

  auditTrailStore.unshift({
    id: `AUD-INST-${Date.now()}`,
    timestamp: now,
    actor: `${institutionProfile.applicantFullName}`,
    action: 'DOCUMENT_UPLOADED',
    applicationId: id,
    details: `Uploaded ${docSub.fileName} (v${newVersion}) for ${docSub.documentName}.`,
  });

  res.json({ success: true, document: docSub, application: appItem });
});

// 5. Deficiencies Retrieval & Response
institutionalRouter.get('/deficiencies', (_req: Request, res: Response) => {
  res.json({ deficiencies: deficiencyStore, total: deficiencyStore.length });
});

institutionalRouter.post('/deficiencies/:id/respond', (req: Request, res: Response) => {
  const { id } = req.params;
  const { responseNote, replacementFileName } = req.body || {};

  const defItem = deficiencyStore.find((d) => d.id === id);
  if (!defItem) return res.status(404).json({ error: 'DEFICIENCY_NOT_FOUND' });

  const now = new Date().toISOString();
  defItem.status = 'UNDER_RE_SCRUTINY';
  defItem.responseNote = responseNote || 'Rectification documents and explanation submitted.';
  defItem.responseTimestamp = now;
  defItem.resubmittedDocumentName = replacementFileName || 'Renewed_Fire_Safety_Certificate_2026_27.pdf';

  // Update associated application workflow state
  const appItem = applicationsStore.find((a) => a.id === defItem.applicationId);
  if (appItem) {
    appItem.currentState = 'CORRECTION_SUBMITTED';
    appItem.currentStageName = 'Re-Scrutiny Queue';
    appItem.latestOfficialUpdate = `Deficiency ${defItem.id} response submitted. Routed to Re-Scrutiny Committee.`;
    appItem.nextActionRequired = 'Awaiting Re-Scrutiny verification findings.';
    appItem.lastModifiedTimestampUtc = now;

    // Update document status
    const doc = appItem.documents.find((d) => d.requirementId === defItem.affectedDocumentId);
    if (doc) {
      doc.status = 'REPLACEMENT_SUBMITTED';
      doc.version = (doc.version || 1) + 1;
      doc.fileName = defItem.resubmittedDocumentName;
      doc.reviewerRemarks = 'Replacement submitted. Awaiting re-scrutiny countersign.';
    }

    timelineStore.unshift({
      id: `EVT_${Date.now()}`,
      applicationId: appItem.id,
      timestamp: now,
      stageName: 'Deficiency Rectification',
      eventDescription: `Compliance response submitted for deficiency ${defItem.id}.`,
      statusBefore: 'DEFICIENCY_ISSUED',
      statusAfter: 'CORRECTION_SUBMITTED',
      responsibleRole: 'Institution Authorized Representative',
      actionTaken: 'Uploaded Replacement Document & Explanation Note',
      supportingCommunicationRef: `REPLY-${defItem.id}`,
    });
  }

  notificationsStore.unshift({
    id: `NOTIF_${Date.now()}`,
    recipientId: institutionProfile.officialEmail,
    event: 'DEFICIENCY_REPLY_REGISTERED',
    title: 'Deficiency Compliance Submitted',
    message: `Compliance response for deficiency ${defItem.id} registered and submitted for Re-Scrutiny.`,
    timestamp: now,
    channel: 'IN_APP',
    deliveryStatus: 'DELIVERED',
    relatedApplicationId: defItem.applicationId,
  });

  res.json({ success: true, deficiency: defItem });
});

// 6. EVC Visits
institutionalRouter.get('/evc-visits', (_req: Request, res: Response) => {
  res.json({ visits: evcVisitsStore, total: evcVisitsStore.length });
});

institutionalRouter.post('/evc-visits/:id/acknowledge', (req: Request, res: Response) => {
  const { id } = req.params;
  const visit = evcVisitsStore.find((v) => v.id === id);
  if (!visit) return res.status(404).json({ error: 'VISIT_NOT_FOUND' });

  visit.isAcknowledgedByInstitution = true;
  visit.acknowledgedTimestamp = new Date().toISOString();

  res.json({ success: true, visit });
});

// 7. Decisions
institutionalRouter.get('/decisions', (_req: Request, res: Response) => {
  res.json({ decisions: decisionsStore, total: decisionsStore.length });
});

// 8. Appeals & 7-Day Window Check (APH Chapter II §2.24(a))
institutionalRouter.get('/appeals', (_req: Request, res: Response) => {
  res.json({ appeals: appealsStore, total: appealsStore.length });
});

institutionalRouter.post('/appeals', (req: Request, res: Response) => {
  const { originalApplicationId, decisionReference, groundsForAppeal, supportingEvidenceDocument } =
    req.body || {};

  const decision = decisionsStore.find((d) => d.officialReferenceNumber === decisionReference || d.applicationId === originalApplicationId);
  if (!decision) {
    return res.status(404).json({ error: 'DECISION_NOT_FOUND', message: 'No recorded decision found for this appeal.' });
  }

  // Strict 7-day window verification
  const nowMs = Date.now();
  const decisionUploadMs = new Date(decision.decisionDate).getTime();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const appealDeadlineMs = decisionUploadMs + SEVEN_DAYS_MS;

  if (nowMs > appealDeadlineMs) {
    return res.status(400).json({
      error: 'APPEAL_DEADLINE_EXPIRED',
      message: `Statutory 7-day appeal period under APH Chapter II Clause 2.24(a) expired on ${new Date(appealDeadlineMs).toISOString()}. Ordinary submission disabled.`,
    });
  }

  const newAppeal: AppealRecord = {
    id: `APP-SAC-${Date.now()}`,
    originalApplicationId: originalApplicationId || decision.applicationId,
    decisionReference: decision.officialReferenceNumber,
    decisionUploadTimestamp: decision.decisionDate,
    appealDeadlineUtc: new Date(appealDeadlineMs).toISOString(),
    submissionTimestamp: new Date().toISOString(),
    groundsForAppeal: groundsForAppeal || 'Aggrieved by decision. Compliance documents submitted.',
    supportingEvidenceDocument: supportingEvidenceDocument || 'Supplementary_State_NOC_Clarification.pdf',
    appealReceiptReference: `SAC-REC-2026-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
    assignedReviewBody: 'STANDING_APPELLATE_COMMITTEE_SAC',
    appealStatus: 'SUBMITTED',
  };

  appealsStore.unshift(newAppeal);

  // Update associated application workflow state
  const appItem = applicationsStore.find((a) => a.id === newAppeal.originalApplicationId);
  if (appItem) {
    appItem.currentState = 'APPEAL_SUBMITTED';
    appItem.currentStageName = 'Standing Appellate Committee (SAC) Review';
    appItem.latestOfficialUpdate = `Appeal registered (Ref: ${newAppeal.appealReceiptReference}). Assigned to SAC tribunal.`;
    appItem.nextActionRequired = 'Await SAC hearing schedule notification.';
    appItem.lastModifiedTimestampUtc = new Date().toISOString();

    timelineStore.unshift({
      id: `EVT_${Date.now()}`,
      applicationId: appItem.id,
      timestamp: new Date().toISOString(),
      stageName: 'Statutory Appeal',
      eventDescription: `Appeal filed to Standing Appellate Committee against decision ${decision.officialReferenceNumber}.`,
      statusBefore: 'DECISION_ISSUED',
      statusAfter: 'APPEAL_SUBMITTED',
      responsibleRole: 'Institution Authorized Representative',
      actionTaken: 'Submitted Appeal within 7-Day Window',
      supportingCommunicationRef: newAppeal.appealReceiptReference,
    });
  }

  res.json({ success: true, appeal: newAppeal });
});

// 9. Compliance Obligations
institutionalRouter.get('/compliance', (_req: Request, res: Response) => {
  res.json({ compliance: complianceStore, total: complianceStore.length });
});

institutionalRouter.post('/compliance/:id/submit', (req: Request, res: Response) => {
  const { id } = req.params;
  const { fileName } = req.body || {};

  const obligation = complianceStore.find((c) => c.id === id);
  if (!obligation) return res.status(404).json({ error: 'OBLIGATION_NOT_FOUND' });

  obligation.verificationStatus = 'SUBMITTED';
  obligation.submissionTimestamp = new Date().toISOString();
  obligation.submittedFileName = fileName || 'Compliance_Undertaking_Signed.pdf';
  obligation.remarks = 'Evidence submitted. Awaiting vigilance verification.';

  res.json({ success: true, obligation });
});

// 10. Notifications
institutionalRouter.get('/notifications', (_req: Request, res: Response) => {
  res.json({ notifications: notificationsStore, total: notificationsStore.length });
});

institutionalRouter.post('/notifications/:id/read', (req: Request, res: Response) => {
  const { id } = req.params;
  const notif = notificationsStore.find((n) => n.id === id);
  if (notif) notif.deliveryStatus = 'READ';
  res.json({ success: true });
});

// 11. Audit Trail
institutionalRouter.get('/audit-trail', (_req: Request, res: Response) => {
  res.json({ auditTrail: auditTrailStore, total: auditTrailStore.length });
});
