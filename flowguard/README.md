# AICTE FlowGuard — Institutional Workspace (SIH26262)

Unified Approval Workflow & Compliance Management Portal. React + TypeScript + Tailwind frontend, Express + TypeScript API,
PostgreSQL database (embedded PGlite locally, Supabase Postgres via `DATABASE_URL`), and a deterministic, versioned APH rules engine.

The original Google AI Studio project in `../aicte-flowguard---unified-login-&-rbac-portal` is left untouched.
It was inspected and found to be in-memory only, with seeded fake statistics and several rules not traceable to the APH;
this implementation replaces it in a separate folder.

## Run locally

Prerequisite: Node.js 20+ (tested on 24).

```bash
npm install
npm run dev
```

Open http://localhost:3000. On first start the server creates the schema, seeds two **demo institutions**, **test accounts**
and the **1,204 rule versions** derived from the catalogue. Migrations in `server/db/migrations` (001–004) run automatically on start. No applications or statistics are seeded — dashboards show only data you create.

Test account IDs and passwords are listed in `server/db/seed.ts` (`DEMO_ACCOUNTS`). They are for local testing only.

| Login ID | Workspace |
|---|---|
| `applicant.demo` | Institution A applicant |
| `applicant.sample` | Institution B applicant (to test data isolation) |
| `scrutiny.officer`, `scrutiny.officer2` | Scrutiny Dashboard (second account tests assignment locking) |
| `rescrutiny.officer` | Re-Scrutiny Dashboard |
| `regional.officer`, `regional.officer2` | EVC coordinator — scoped to DEMO-RO-WEST / DEMO-RO-SOUTH (see regions below) |
| `evc.member`, `evc.member2`, `evc.member3` | EVC member workspace (only assigned visits); linked to DEMO registry experts 0001–0003 |
| `regulation.bureau` | Regulation Bureau: EVC escalation queue, cross-region overview, expert verification |
| `supervisor` | Escalations, verification requests, (re)assignment, EVC handoff |
| `sys.admin` | Notification delivery tracking, retries, background jobs |
| `shc.member`, `decision.authority`, `sac.member` | Later stages (minimal console) |
| `rules.governance`, `rules.publisher` | Rule lifecycle governance (verifier and second approver) |

**Demonstration data (clearly labelled, not real):** two regions `DEMO-RO-WEST` / `DEMO-RO-SOUTH`, four EVC registry
experts `EVC-DEMO-0001..0004` (0004 is deliberately unverified), and operational settings marked *demonstration — not authorised*.

## Scrutiny, re-scrutiny and EVC workflow

Principle: **automate the process, not the statutory decision.** The backend validates, reports, notifies and monitors
deadlines; every outcome is a reasoned action by an authorised official, stored in `officer_actions` and the audit log.

1. **Submission** — submission version recorded, checks run (with NOT_APPLICABLE results), a **scrutiny report** is
   saved, the scrutiny queue and the institution are notified (de-duplicated).
2. **Scrutiny report** — expected vs submitted documents, fields, validity/expiry, signatures/signatories, other
   discrepancies, human-verification items, APH references, readiness flags. Finding statuses: `PASS`,
   `DISCREPANCY_DETECTED`, `NOT_APPLICABLE`, `UNABLE_TO_VERIFY`, `HUMAN_REVIEW_REQUIRED`. Downloadable as PDF.
3. **Officer action** — the scrutiny official has exactly two decisions: *Send for re-scrutiny* (explain each
   deficiency; a notice is issued, reason required) or *Forward to EVC coordinator* (or to the decision stage when the
   route has no EVC). Per-document *examination records* (`document_reviews`, append-only) can be kept while reviewing;
   they are notes, not outcomes. Assigned applications can only be acted on by the assignee.
4. **Notice** — PDF with notice ID/version, summary, each deficiency, required correction, source, deadline + its type.
   Deadline types: `APH` (must cite a clause), `OPERATIONAL` (system-configured, labelled as not APH), `NOT_CONFIGURED`.
5. **Correction** — immutable `correction_submissions` record + new document versions; submission version increments.
6. **Targeted re-scrutiny** — only rules targeting, or depending on, the changed fields/documents are re-run; a
   re-scrutiny report shows each deficiency side by side with an automated assessment (`RESOLVED` /
   `UNRESOLVED` / `PARTIALLY_RESOLVED` / `HUMAN_REVIEW_REQUIRED`). A file upload alone never yields RESOLVED;
   signature/mismatch issues always need the officer. New deficiencies during re-scrutiny must link to an original one (Ch. I §1.8(g)).
7. **Re-scrutiny outcome** — officer marks each item; *Request further correction* (updated notice version) or
   *Record all addressed*.
8. **EVC eligibility** — six explained conditions (APH vs system policy). No automatic handoff: an authorised official
   approves it, creating an `evc_handoffs` record.
9. **EVC scheduling** — propose date → assign members → confirm; reschedule/cancel with reason; visit event history;
   institution notified at each step. Completing a visit never grants approval.
10. **Deadline monitor** (`server/scheduler.ts`, every 5 min) — reminders 7/3/1 days before, overdue notices, escalation to
    the supervisor after 2 days overdue, retries of failed deliveries. Idempotent; never changes an application status.
    These settings live in `server/policy.ts` and are **system policy, not APH requirements**.

Other commands:

```bash
npm test          # unit + integration + API end-to-end tests (in-memory Postgres)
npm run typecheck
npm run build     # production UI build → dist/
npm run db:reset  # delete the LOCAL embedded database and document storage (refuses if DATABASE_URL is set)
```

## EVC, Regulation Bureau, compliance and reporting

* **EVC expert registry** (`/official/registry`, `server/routes/evc.ts`) — Regional Officers / administrators add experts;
  records start as NEEDS_VERIFICATION and any edit resets them. A Regulation Bureau officer — not the person who entered
  or last edited the record — verifies and records the source. Only VERIFIED, active records can fill a seat.
* **Committee composition** (`server/evc/composition.ts`) — deterministic checks of APH **Annexure 16 §16.5** (one
  academician ≥ Professor from the EC-approved panel; one expert ≥ Associate Professor or industry expert with ≥ 5 years
  from the panel; one CoA architect / Civil (Structural) / Architecture / Planning member) and the Note under §16.6
  (optional co-option; "may" specialisation advice kept advisory; Deemed-University chairman). Unclear wording is
  HUMAN_REVIEW_REQUIRED and blocks confirmation; a visit cannot be confirmed without a valid committee.
* **Operational procedure, not the APH method** — APH Ch. I §1.9(a) describes selection through AICTE's automated portal,
  while Definition 29 says the Regional Officer constitutes the EVC. FlowGuard's manual selection is labelled as an
  operational configuration everywhere it appears. No selection algorithm is implemented.
* **EVC scheduling** (`/official/evc`, `/official/evc/schedule/:applicationId`, `server/routes/scheduler.ts`) — visits
  have a start and end time in IST. The Regional Officer saves a proposal, sees each registry official's availability
  for that exact time (from recorded assignments and unavailability), picks an eligible panel, and sends invitations,
  which reserve each member's time. A database exclusion constraint prevents overlapping reservations even under
  concurrent requests (half-open intervals, so back-to-back visits are allowed). Members accept, decline with a reason,
  report a conflict or request withdrawal; declining releases their time. The visit is confirmed only after every member
  accepts. Rescheduling re-checks availability and asks everyone again. If no committee can be formed the screen says so
  and suggests alternative slots.
* **Visit mode** — online by default; an offline visit requires the extraordinary circumstance to be recorded
  (Ch. I §1.8 NOTE). Institutions share the video link required by §1.9(f)-(g).
* **EVC member workspace** (`/official` for EVC members, `/official/visits/:id`) — accept, decline or report a conflict, record own unavailability,
  start the visit, record attendance, record the visit as completed or missed, write a sectioned report draft
  (sections from §1.9(c)-(g)), upload evidence, submit a versioned report with a receipt number. A visit is never
  marked completed or missed from the clock.
* **Regulation Bureau** (`/official/bureau/escalations`, `server/routes/bureau.ts`) — escalations for missed visits,
  unrecorded visit outcomes, overdue reports, unacknowledged assignments and unresolved conflicts. Actions:
  acknowledge, request explanation, record follow-up, assign corrective action, return for information, resolve, close.
  History is append-only; escalations never change an application, penalise a member or alter a decision.
* **Deadlines** — a `deadlines` table for EVC follow-up (source type + configuration ID/version) and a
  `deadline_register` view that unifies correction, compliance and EVC deadlines without duplicating them.
* **Operational settings** (`/official/policies`) — EVC acknowledgement/report periods, visit-outcome grace, document
  expiry alert window and "due soon" window. Versioned with history; an administrator proposes, a different supervisor
  authorises. Until authorised every value is labelled a demonstration value.
* **Compliance** — statuses OPEN → SUBMITTED → UNDER_REVIEW / ACCEPTED_BY_AUTHORISED_REVIEWER / DEFICIENT /
  HUMAN_REVIEW_REQUIRED, shown as NOT_YET_DUE / DUE_SOON / OVERDUE where an APH-derived date exists. Every evidence
  submission and review is kept (append-only). Undertakings come only from APH text (Ch. VI §6.53 Note internship
  affidavit, §6.54 exam-reforms undertaking, Annexure 3 §3.1(c) partial-OC period) and carry no invented dates.
* **Document validity** — computed only where the catalogue holds an APH validity rule; otherwise NEEDS_VERIFICATION.
* **Regions** — Regional Officers see and act only on institutions in their configured regions (`user_regions`).
  The APH does not map states to regional offices; the demo regions are sample data.
* **Reports** (`/official/reports`) — pendency by stage with filters (date range, region, category, stage, assignee, EVC
  status, compliance, overdue) and CSV export (audited, formula-injection safe, no contact details).
* **Rule publication** — the official who verified a rule cannot approve it for execution (`rules.publisher` approves).

## Architecture

```
server/
  catalogue/        22 categories: fields, document requirements, checks, routes — every item source-referenced
  rules/            conditions.ts (safe structured-condition interpreter), ruleset.ts (rule generation), engine.ts
  workflow/         backend state machine (states, role-guarded transitions, per-category routes)
  db/               adapter (PGlite / pg), SQL migration, seed, reset
  routes/           auth, catalogue, institution (applicant API), official (minimal console + rules governance)
  services.ts       validation runs, transitions, notifications, compliance obligations, appeal eligibility
src/                React app — one shared design system (components/ui.tsx, components/Layout.tsx):
                      institution: overview, applications, application detail, respond-to-notice, wizard, EVC, decisions, compliance
                      officials:   role overview, review queue, application workspace (report, document verification,
                                   re-scrutiny comparison, EVC, decision, audit), EVC week calendar, supervisor oversight,
                                   people & permissions, escalations, notifications & jobs, regulatory rules
supabase/rls.sql    RLS lockdown for a Supabase deployment (untested)
tests/              engine.test.ts, workflow.test.ts
```

Key controls: scrypt password hashes; opaque session tokens stored hashed, HttpOnly + SameSite=strict cookies; roles always
read from the database; every endpoint checks role, institution membership and workflow state; files checked by content
signature (PDF/JPG/PNG, 10 MB), stored privately with SHA-256 and full version history; append-only audit log and workflow
history (DB triggers); rate limiting on login and API; optimistic concurrency on drafts and transitions.

## Rules engine

* Rules are stored in `regulatory_rules` with `rule_id`, `rule_version`, structured JSON `condition`, `severity`,
  `aph_reference`, `source_evidence`, `verification_status`, `lifecycle_status`, `approved_by`, `approved_at`.
* Conditions use a fixed operator set (`eq`, `in`, `yearsSinceGte`, `gtRatioOf`, `yearsUntilLtField`, …). Nothing from
  the database is executed as code; malformed conditions are refused.
* Only `APPROVED_FOR_EXECUTION` rules can block submission. `NEEDS_VERIFICATION` / `VERIFIED` rules only produce
  HUMAN_REVIEW findings; `DRAFT` / `RETIRED` rules are skipped.
* Each run stores the rule set version, evaluation date, input hash and every finding. Same input + same rule versions
  + same date ⇒ same result (tested).
* Re-scrutiny runs only rules that target, or depend on, the changed fields/documents.
* The engine never grants or rejects approval. Decisions are recorded by the `DECISION_AUTHORITY` role.

**Development seed approval:** rules derived from verified sources are seeded as `APPROVED_FOR_EXECUTION` with
`approved_by = "DEVELOPMENT SEED — … pending official sign-off"`. A real deployment needs an authorised official to review
and approve each rule (the Regulatory rules page supports the lifecycle).

## Test results (this build)

* `tests/scrutiny.test.ts` (23 tests) covers the 10-step scrutiny → notice → correction → targeted re-scrutiny →
  authorised EVC handoff → scheduling scenario, the scrutiny official's two actions, append-only document examination
  records (role, stage and document checks), role dashboard data (activity, supervisor-only pipeline and people,
  institution-scoped overview), plus missing documents, invalid and truncated files, unknown expiry
  (UNABLE_TO_VERIFY), unresolved corrections, overdue deadlines with escalation, duplicate-notification suppression,
  assignment/role/institution access control, failed delivery + retry, and the login rate limit.
* `tests/evc_scheduling.test.ts` (12 tests) covers availability listing, overlap blocking, capacity message with
  alternatives, concurrent invitations, release on decline / cancel, self-only responses, partial acceptance, reschedule
  revalidation, report-before-visit blocking, private evidence and duplicate suppression.
* `npm test`: **100 / 100 passed** (25 engine, 22 workflow, 23 scrutiny, 18 EVC / Bureau / compliance / security, 12 EVC scheduling). The workflow suite's 22 integration/API end-to-end tests cover login,
  role enforcement, institution isolation (URL/ID tampering), drafts, file-type rejection, blocked submission,
  server-generated reference + timestamp, duplicate submission, deficiency → correction → scoped re-scrutiny, EVC
  scheduling/report disclosure, decision authority, appeal once within 7 days, SAC → Council final decision, compliance
  obligations, append-only audit, and disabled ODL/OL submission.
* `npm run typecheck` and `npm run build`: pass.
* Manually verified in the browser: login, dashboard, category search, dynamic form, conditional checklist, validation
  (expired fire certificate blocked), profile safeguard, submission, tracking, corrections, decisions/appeals, official queue.
  After the UI redesign, on an isolated instance with synthetic data: institution overview, applications, respond to a
  notice (structured field correction + package submission), scrutiny overview and document examination, re-scrutiny
  item review and review submission, EVC calendar and visit confirmation, supervisor oversight, people & permissions,
  escalations, review queue, rules, notifications & jobs.
* Not automated: browser-level E2E (no Playwright/browser binaries installed); file selection in the upload dialog was
  exercised through the same API rather than a real file picker.

## Requirements that remain unverified

See also Help → *Source discrepancies register* (`server/catalogue/discrepancies.ts`).

1. **ODL / OL** — no document checklist in Annexure 2 or Chapter V; final submission disabled (drafts only).
2. **Conversion into University** — Chapter IV / UGC requirements referenced but not established; HUMAN_REVIEW notice on every application.
3. **Integrated / Dual Degree** — UGC norms referenced by §2.10(a) are outside the supplied sources.
4. **Annexure 1 pp. 78-79 items (vii)-(xiii)** — general applicability ambiguous; offered as optional uploads.
5. **Merger "all Annexure 2 documents except Clause 2.10.2(b)"** — clause does not exist in this APH edition.
6. **FN/OCI/Gulf** — Annexure 2 §2.5 says "at EVC" but Table 2.3 has no EVC; collected at submission, flagged.
7. **Audited accounts "previous year"** — reference point undefined; mismatch is advisory only.
8. **Appeal deadline day-count** — implemented as end of the 7th day (IST) after the trigger date; trigger is LoD issue
   (Ch. I §1.11(a)) or EC decision upload (Ch. II §2.24(a)). Appeals against new-institution LoR are not configured.
9. **Security Deposit 15-day clock** — "date of intimation" taken as the decision upload date.
10. **FPM Ph.D. ratio** — §2.12(g) defines only the 10- and 20-seat thresholds.
11. **Annexure 2 §2.1(iii) "Clause 7.17"** — treated as Ch. VI §6.17(g).
12. Field names are FlowGuard software fields, not official AICTE portal field names.
13. **Scrutiny correction deadline** — the APH prescribes none; deficiencies default to "requires authorised configuration".
14. **Escalation hierarchy and reminder intervals** — not defined in the APH; the Supervisor role and 7/3/1-day
    reminders are system policy (`server/policy.ts`).
15. **Scrutiny vs re-scrutiny officials** — modelled as separate roles; the APH describes the committees, not software roles.
16. **Technical signature check** detects a PDF signature structure only; it does not validate the certificate chain.
17. **EVC member selection method** — APH §1.9(a) (automated portal) vs Definition 29 (Regional Officer constitutes);
    the manual registry procedure needs authorised confirmation before real use.
18. **Annexure 16 §16.5 seat 3** — whether "CPWD, NBCC, DRDO, CSIR" qualifies non-CoA architects / officers, and whether a
    Professor of Architecture fits "Assistant Professor of Architecture", are routed to human review.
19. **Deemed-University status** — not held on the institution record; the chairman requirement is always flagged for review.
20. **EVC acknowledgement period, report period, visit-outcome grace, expiry alert window** — not in the APH; operational
    settings awaiting authorisation.
21. **Regions** — no state → regional office mapping in the sources; regions and Regional Officer scopes must be configured.
22. **Regulation Bureau escalation queue** — the Bureau is named in §1.10(a); the queue, triggers and actions are a FlowGuard design.
23. **Undertaking dates** — the internship affidavit is uploaded "before downloading the EoA" (no calendar date); the
    UHV undertaking's "before AY 2024-25" date has passed and is not tracked.

## Integrations awaiting configuration (not implemented / not tested)

* **Supabase Postgres** — set `DATABASE_URL`; adapter written, not tested against a live project. Apply `supabase/rls.sql`.
* **Supabase Auth** — not wired; local auth is used. **Supabase Storage** — local private storage is used; adapter not written.
* **AICTE portal / NSWS integration** — none. References like `FG-202627-000001` are FlowGuard tracking IDs.
* **DSC signature verification** — not implemented; applicants declare DSC and reviewers verify.
* **Email / SMS** — none; notifications are in-app only.
* **College ID verification** — none; IDs are shown as UNVERIFIED.
* **Regional Coordinator / separate EVC Coordinator roles** — not created; the Regional Officer acts as EVC coordinator.
* **Role administration UI** — roles are seeded/configured in the database; People & permissions is read-only.
