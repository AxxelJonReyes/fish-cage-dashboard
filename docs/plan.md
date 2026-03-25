# Fish Cage Dashboard — Detailed Project Plan

> **Audience:** This document is intended for both technical developers and the non-technical business owner.
> Plain-language summaries are provided alongside technical details.

---

## Table of Contents

1. [Clarifying Questions](#1-clarifying-questions)
2. [Assumptions](#2-assumptions)
3. [Tech Stack Options](#3-tech-stack-options)
4. [User Stories](#4-user-stories)
5. [Screens / Pages](#5-screens--pages)
6. [Data Model Summary](#6-data-model-summary)
7. [API Outline](#7-api-outline)
8. [Permissions Matrix](#8-permissions-matrix)
9. [Metrics Definitions](#9-metrics-definitions)
10. [Milestones](#10-milestones)
11. [Risks & Mitigations](#11-risks--mitigations)

---

## 1. Clarifying Questions

> These questions would ideally be answered by the business owner before full development begins.
> Best-guess assumptions are listed in Section 2.

1. **How many cages exactly?** The problem says "approximately 4." Should the system support adding/removing cages dynamically, or is 4 fixed?
2. **Which quarters are used?** Calendar quarters (Jan–Mar, Apr–Jun, Jul–Sep, Oct–Dec) or a custom fiscal year?
3. **Who measures the fish estimate?** Is this always an employee, or can an officer measure it directly?
4. **What are the water quality parameters?** (e.g., dissolved oxygen, pH, temperature, ammonia, salinity?) Which ones are critical?
5. **What are the thresholds for each water quality parameter?** Are these fixed by regulation, or configurable per cage?
6. **How are fish sizes recorded?** One measurement per fish in a sample, or an average? How large is a typical sample?
7. **What are the expense categories?** (e.g., feed, labor, fingerlings, maintenance, equipment?) Can these be customized?
8. **Are employees assigned to specific cages permanently, or does this change?** Can one employee work on multiple cages?
9. **Is internet access reliable at the lake?** This affects whether offline/sync capability is needed in MVP.
10. **What devices are used?** Android phones only, or also iOS and desktop?
11. **Should historical data be imported?** Is there existing data (even in spreadsheets/Messenger) that should be migrated?
12. **What language should the UI be in?** Filipino, English, or both?

---

## 2. Assumptions

Based on the business description and best judgment:

| # | Assumption |
|---|-----------|
| A1 | 4 fish cages; system supports adding up to ~10 cages dynamically |
| A2 | Calendar quarters (Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep, Q4 = Oct–Dec) |
| A3 | Employees submit fish estimates; Officers or Admin approve them |
| A4 | Water quality parameters: dissolved oxygen (DO), pH, temperature, ammonia. Admin configures thresholds |
| A5 | Fish size = individual sample measurements (up to ~30 fish per sample); stored in cm, displayed in cm or in |
| A6 | Expense categories fixed in MVP: Feed, Labor, Fingerlings, Maintenance, Equipment, Other |
| A7 | Employees can be assigned to multiple cages; one primary officer per cage |
| A8 | Internet available most of the time; offline support is V2 |
| A9 | Android phones primary; responsive web covers this without a native app |
| A10 | UI in English for MVP; Filipino labels can be added in V2 |
| A11 | No historical data import in MVP; manual re-entry or CSV import in V2 |

---

## 3. Tech Stack Options

### Option A — Next.js + Supabase (Recommended for MVP)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (React, App Router) with Tailwind CSS |
| Backend / API | Next.js API Routes (serverless) |
| Database | PostgreSQL via Supabase (hosted) |
| Auth | Supabase Auth (email/password + role metadata) |
| Storage | Supabase Storage (for any future attachments) |
| Hosting | Vercel (free tier for MVP) |

**Pros:**
- Single codebase (frontend + backend)
- Supabase provides database, auth, and real-time out of the box
- Free tier is sufficient for MVP
- Row-level security (RLS) in Supabase enforces permissions at the database level
- Vercel deploys automatically from GitHub

**Cons:**
- Vendor lock-in on Supabase/Vercel (mitigated: both are standard PostgreSQL + standard hosting)
- Requires JavaScript/TypeScript knowledge

---

### Option B — React + Django REST Framework + PostgreSQL

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) with Tailwind CSS |
| Backend / API | Django REST Framework (Python) |
| Database | PostgreSQL (self-hosted or Railway/Render) |
| Auth | Django built-in auth + DRF token auth |
| Hosting | Render or Railway (free tiers available) |

**Pros:**
- Mature, well-documented stack
- Python is widely known; easier to find developers locally
- Full control over backend logic and auth

**Cons:**
- Two separate codebases (frontend + backend) — more complex to deploy
- More setup time for MVP
- No built-in real-time features (would need WebSockets or polling)

---

**Recommendation:** Use **Option A** (Next.js + Supabase) for MVP speed. Switch to Option B if the team has existing Python expertise.

---

## 4. User Stories

### Admin / Owner

| ID | Story |
|----|-------|
| US-A01 | As the owner, I want to see a dashboard with the latest approved fish estimate per cage and the total, so I know how many fish I have at a glance. |
| US-A02 | As the owner, I want to see a quarterly fish estimate history chart, so I can track growth trends across quarters. |
| US-A03 | As the owner, I want to see the latest water quality reading per cage with out-of-range flags, so I can respond quickly to problems. |
| US-A04 | As the owner, I want to see recent incidents and overdue tasks, so nothing falls through the cracks. |
| US-A05 | As the owner, I want to approve or reject fish estimate submissions with a comment, to maintain an accurate audit trail. |
| US-A06 | As the owner, I want to manage user accounts (create/deactivate employees and officers), so I control who has access. |
| US-A07 | As the owner, I want to record revenue and expenses and see a monthly profit chart, so I understand the business financial health. |
| US-A08 | As the owner, I want to export financial data as a CSV, so I can share it with an accountant. |

### Officer

| ID | Story |
|----|-------|
| US-O01 | As an officer, I want to see all cages I manage and their current status, so I can prioritize my day. |
| US-O02 | As an officer, I want to approve fish estimate submissions for my cages, so the owner sees accurate numbers. |
| US-O03 | As an officer, I want to assign tasks to employees with due dates, so work is tracked. |
| US-O04 | As an officer, I want to close an incident after reviewing it, so the issue history stays clean. |
| US-O05 | As an officer, I want to configure water quality thresholds per cage, so alerts are relevant to local conditions. |

### Employee

| ID | Story |
|----|-------|
| US-E01 | As an employee, I want to submit a daily operations log (feeding, maintenance, observations) for my cage, so the officer knows what happened. |
| US-E02 | As an employee, I want to record a water quality reading with multiple parameters, so the system can flag anomalies. |
| US-E03 | As an employee, I want to submit a quarterly fish estimate for review, so the officer/admin can approve it. |
| US-E04 | As an employee, I want to record fish size measurements (in cm or inches), so the team can track growth. |
| US-E05 | As an employee, I want to report an incident/issue with a description and photo (V2), so problems are documented. |
| US-E06 | As an employee, I want to see my open tasks with due dates, so I know what to do each day. |
| US-E07 | As an employee, I want to update a task status (In Progress / Done), so the officer knows I've completed it. |

---

## 5. Screens / Pages

See [docs/ui-wireframes.md](ui-wireframes.md) for detailed text wireframes.

| Screen | Who sees it | Purpose |
|--------|------------|---------|
| Login | All | Authenticate |
| Owner Dashboard | Admin | Overview of all cages |
| Cage List | Officer, Employee | List of assigned cages |
| Cage Detail | All (role-filtered) | All data for one cage |
| Fish Estimate Submission | Employee | Submit quarterly estimate |
| Fish Estimate Review | Officer, Admin | Approve/reject with comment |
| Water Quality Entry | Employee | Record a reading |
| Water Quality History | All | Chart + table of readings |
| Fish Measurements | Employee | Enter sample measurements |
| Fish Growth Chart | All | Growth trend over time |
| Daily Log Entry | Employee | Log feeding/maintenance/observation |
| Daily Log Timeline | All | Scrollable timeline per cage |
| Incident Report | Employee | Report an issue |
| Incident List / Detail | All | View + comment on incidents |
| Task List | All | View + update tasks |
| Task Create/Edit | Officer, Admin | Create tasks with due dates |
| Admin — User Management | Admin | Add/deactivate users, assign roles |
| Admin — Financials | Admin | Revenue/expense entries + chart |

---

## 6. Data Model Summary

See [docs/data-model.md](data-model.md) for full schema.

**Core entities:**

- **User** — name, email, role (admin/officer/employee), active flag
- **Cage** — name, location, assigned officer
- **CageAssignment** — links users to cages (many-to-many)
- **FishEstimate** — cage, quarter, year, estimated_count, submitted_by, status (pending/approved/rejected), approved_by, audit log
- **WaterQualityReading** — cage, timestamp, DO, pH, temperature, ammonia, recorded_by
- **WaterQualityThreshold** — cage, parameter, min_value, max_value
- **FishMeasurement** — cage, date, measurements (array of cm values), unit, recorded_by
- **DailyLog** — cage, date, type (feeding/maintenance/observation), notes, recorded_by
- **Incident** — cage, title, description, severity, status (open/resolved), reported_by
- **IncidentComment** — incident, user, comment, timestamp
- **Task** — cage, title, description, assigned_to, due_date, status, created_by
- **TaskComment** — task, user, comment, timestamp
- **RevenueEntry** — date, amount, description, type (harvest_sale/other), recorded_by
- **ExpenseEntry** — date, amount, description, category (feed/labor/fingerlings/maintenance/equipment/other), recorded_by

---

## 7. API Outline

See [docs/api.md](api.md) for full endpoint list.

Base URL: `/api/v1/`

Key resource groups:
- `/auth/` — login, logout, password reset
- `/users/` — CRUD (admin only)
- `/cages/` — list, detail
- `/cages/{id}/fish-estimates/` — submit, list, approve/reject
- `/cages/{id}/water-quality/` — submit, list, thresholds
- `/cages/{id}/measurements/` — submit, list
- `/cages/{id}/logs/` — submit, list
- `/cages/{id}/incidents/` — CRUD + comments
- `/cages/{id}/tasks/` — CRUD + comments
- `/finance/revenue/` — CRUD (admin only)
- `/finance/expenses/` — CRUD (admin only)
- `/finance/summary/` — monthly aggregated data

---

## 8. Permissions Matrix

| Action | Employee | Officer | Admin |
|--------|----------|---------|-------|
| View own cage data | ✅ | ✅ | ✅ |
| View all cage data | ❌ | ✅ | ✅ |
| Submit daily log | ✅ | ✅ | ✅ |
| Submit water quality | ✅ | ✅ | ✅ |
| Submit fish estimate | ✅ | ✅ | ✅ |
| **Approve fish estimate** | ❌ | ✅ (own cages) | ✅ |
| Submit fish measurements | ✅ | ✅ | ✅ |
| Create task | ❌ | ✅ | ✅ |
| Update task status | ✅ (own) | ✅ | ✅ |
| Report incident | ✅ | ✅ | ✅ |
| Close incident | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Configure thresholds | ❌ | ✅ | ✅ |
| View financials | ❌ | ❌ | ✅ |
| Enter revenue/expenses | ❌ | ❌ | ✅ |

---

## 9. Metrics Definitions

| Metric | Definition | Source |
|--------|-----------|--------|
| **Estimated Fish Alive (per cage)** | The most recently *approved* quarterly fish estimate for a cage | FishEstimate (status = approved) |
| **Total Fish Alive** | Sum of latest approved estimates across all cages | Derived |
| **Water Quality Status** | "Normal" if all latest readings are within thresholds; "Alert" if any reading is out-of-range | WaterQualityReading + WaterQualityThreshold |
| **Average Fish Size** | Mean of all measurements in the latest measurement session per cage | FishMeasurement |
| **Growth Rate** | Change in average fish size between measurement sessions | Derived |
| **Task Overdue** | Task where due_date < today and status ≠ "done" | Task |
| **Incident Open** | Incident where status = "open" | Incident |
| **Monthly Revenue** | Sum of RevenueEntry.amount for the calendar month | RevenueEntry |
| **Monthly Expenses** | Sum of ExpenseEntry.amount for the calendar month | ExpenseEntry |
| **Monthly Profit** | Monthly Revenue − Monthly Expenses | Derived |

---

## 10. Milestones

### Milestone 1 — Project Setup (Week 1–2)
- [ ] Initialize Next.js project with Tailwind CSS
- [ ] Set up Supabase project (database, auth)
- [ ] Define database schema and run migrations
- [ ] Set up GitHub repository with CI/CD (Vercel auto-deploy)
- [ ] Configure Row-Level Security policies in Supabase

### Milestone 2 — Auth + User Management (Week 2–3)
- [ ] Login / logout flow
- [ ] Role-based routing (redirect admin to dashboard, employee to cage list)
- [ ] Admin user management screen (invite/deactivate users)
- [ ] Cage assignment management

### Milestone 3 — Core Cage Pages (Week 3–5)
- [ ] Cage list screen
- [ ] Cage detail screen (tabbed: Logs | Water | Fish | Incidents | Tasks)
- [ ] Daily log entry + timeline
- [ ] Water quality entry + history table
- [ ] Fish measurements entry + growth chart
- [ ] Incident report + list + comments

### Milestone 4 — Fish Estimate Workflow (Week 5–6)
- [ ] Fish estimate submission form
- [ ] Pending estimates queue (officer/admin)
- [ ] Approve / reject with comment
- [ ] Audit trail display
- [ ] Quarter/year navigation

### Milestone 5 — Owner Dashboard (Week 6–7)
- [ ] Fish estimate summary cards (latest approved per cage + total)
- [ ] Quarterly history bar chart
- [ ] Water quality status cards with out-of-range flags
- [ ] Recent incidents widget
- [ ] Overdue tasks widget
- [ ] "Last updated" per cage

### Milestone 6 — Tasks Module (Week 7–8)
- [ ] Task create/edit (officer/admin)
- [ ] Task list with filters (status, due date, assigned)
- [ ] Task status update (employee)
- [ ] Task comments

### Milestone 7 — Testing + QA (Week 8–9)
- [ ] Manual testing on Android mobile browser
- [ ] Fix responsive layout issues
- [ ] Role-permission audit (verify matrix in Section 8)
- [ ] Performance check (Lighthouse score)

### Milestone 8 — MVP Launch (Week 9–10)
- [ ] Production deployment on Vercel
- [ ] Onboard owner + officers + employees
- [ ] Collect feedback for V2 backlog

### V2 Backlog (Post-MVP)
- [ ] Financial module (revenue, expenses, profit chart, CSV export)
- [ ] Offline/sync support
- [ ] Push notifications
- [ ] PDF report export
- [ ] Data import from spreadsheets
- [ ] Filipino language option

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Unreliable internet at the lake | High | High | Plan offline-first for V2; ensure employees can queue entries locally |
| Low tech literacy among employees | Medium | High | Simple, icon-driven mobile UI; onboarding walkthrough; Filipino labels in V2 |
| Inconsistent fish estimate submissions | Medium | High | Enforce quarterly cadence via reminders; hard-block duplicate submissions per cage per quarter |
| Scope creep delaying MVP | High | Medium | Freeze MVP scope after Milestone 1; log all new requests in GitHub Issues with `v2` label |
| Supabase free tier limits exceeded | Low | Medium | Monitor usage; Supabase Pro is ~$25/month; budget for this by Month 3 |
| Key employee not using the app | Medium | High | Involve employees in UAT; make daily log entry ≤3 taps from home screen |
| Data loss / accidental deletion | Low | High | Supabase automated backups; soft-delete pattern (no hard deletes in MVP) |
| Fish estimate disagreement (audit disputes) | Low | High | Immutable audit trail — every submission, approval, and rejection is stored permanently |
