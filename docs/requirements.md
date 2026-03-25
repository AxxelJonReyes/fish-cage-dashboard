# Fish Cage Dashboard — MVP Requirements Checklist

> **Version:** MVP (Phase 1)
> **Last Updated:** 2026-03-25

This document lists all requirements that must be met before the MVP is considered complete. Each item is a testable acceptance criterion.

---

## Authentication & Access Control

- [ ] **REQ-AUTH-01** Users can log in with an email address and password.
- [ ] **REQ-AUTH-02** Users are assigned one of three roles: Admin, Officer, or Employee.
- [ ] **REQ-AUTH-03** Users can only see cages they are assigned to (Employees and Officers); Admins see all cages.
- [ ] **REQ-AUTH-04** Role-based access is enforced on both the UI (hidden controls) and the API (rejected requests).
- [ ] **REQ-AUTH-05** Admin can create, edit, and deactivate user accounts.
- [ ] **REQ-AUTH-06** Deactivated users cannot log in.
- [ ] **REQ-AUTH-07** All sensitive API routes require a valid authenticated session.

---

## Cages

- [ ] **REQ-CAGE-01** The system supports at least 4 fish cages.
- [ ] **REQ-CAGE-02** Each cage has a name, optional location description, and an assigned primary officer.
- [ ] **REQ-CAGE-03** Admin can create and edit cages.
- [ ] **REQ-CAGE-04** Admin can assign/unassign officers and employees to cages.

---

## Fish Estimate (Quarterly)

- [ ] **REQ-FE-01** Employees can submit a quarterly fish estimate (one number) for their assigned cage.
- [ ] **REQ-FE-02** Only one estimate per cage per quarter/year combination is allowed at a time (duplicate prevention).
- [ ] **REQ-FE-03** A submitted estimate starts in "Pending" status.
- [ ] **REQ-FE-04** Officers (for their assigned cages) and Admins can approve or reject a pending estimate.
- [ ] **REQ-FE-05** When approving or rejecting, the reviewer must optionally add a comment.
- [ ] **REQ-FE-06** The audit trail records: submitter name, submission time, reviewer name, review time, and final status.
- [ ] **REQ-FE-07** The owner dashboard shows the latest approved estimate per cage.
- [ ] **REQ-FE-08** The owner dashboard shows the sum of all latest approved estimates.
- [ ] **REQ-FE-09** A quarterly history chart (bar or line) shows approved estimates per cage over time.
- [ ] **REQ-FE-10** Employees cannot approve or reject estimates (including their own).

---

## Water Quality

- [ ] **REQ-WQ-01** Employees can submit a water quality reading with at least these parameters: dissolved oxygen (DO), pH, temperature, ammonia.
- [ ] **REQ-WQ-02** Each reading is timestamped and linked to the employee who recorded it.
- [ ] **REQ-WQ-03** Admin and Officers can configure min/max thresholds per parameter per cage.
- [ ] **REQ-WQ-04** Readings that are outside the configured threshold are flagged with a visual warning.
- [ ] **REQ-WQ-05** The owner dashboard shows the latest water quality reading per cage with out-of-range indicators.
- [ ] **REQ-WQ-06** Each cage page shows a history table of all water quality readings.

---

## Fish Size Measurements

- [ ] **REQ-FM-01** Employees can record a batch of fish size measurements (individual values, up to 30 per session).
- [ ] **REQ-FM-02** Measurements can be entered in centimeters (cm) or inches (in); the unit is stored with the session.
- [ ] **REQ-FM-03** The system calculates and displays the average measurement per session.
- [ ] **REQ-FM-04** A growth trend chart shows average fish size over time per cage.

---

## Daily Operations Log

- [ ] **REQ-LOG-01** Employees can submit a daily log entry with a type (Feeding, Maintenance, Observation) and free-text notes.
- [ ] **REQ-LOG-02** Log entries are timestamped and linked to the submitting employee.
- [ ] **REQ-LOG-03** The cage page shows a scrollable timeline of all log entries, newest first.
- [ ] **REQ-LOG-04** The owner dashboard shows the "last updated" time per cage (time of most recent log entry).

---

## Incidents

- [ ] **REQ-INC-01** Employees can report an incident with a title, description, and severity level (Low, Medium, High).
- [ ] **REQ-INC-02** Incidents start in "Open" status.
- [ ] **REQ-INC-03** Officers and Admins can change an incident status to "Resolved."
- [ ] **REQ-INC-04** Any user with cage access can add comments to an incident.
- [ ] **REQ-INC-05** The owner dashboard shows recent open incidents across all cages.

---

## Tasks

- [ ] **REQ-TASK-01** Officers and Admins can create tasks with a title, description, assigned employee, and due date.
- [ ] **REQ-TASK-02** Tasks have a status: To Do, In Progress, Done.
- [ ] **REQ-TASK-03** Assigned employees can update the status of their tasks.
- [ ] **REQ-TASK-04** Any user with cage access can add comments to a task.
- [ ] **REQ-TASK-05** The owner dashboard shows all tasks where the due date has passed and status ≠ Done.
- [ ] **REQ-TASK-06** The cage task list can be filtered by status and due date.

---

## Owner Dashboard

- [ ] **REQ-DASH-01** The dashboard is the default landing page for Admin users after login.
- [ ] **REQ-DASH-02** The dashboard shows one summary card per cage: latest approved fish estimate, water quality status, open incidents count, overdue tasks count, and last updated time.
- [ ] **REQ-DASH-03** The dashboard shows the total estimated fish across all cages.
- [ ] **REQ-DASH-04** The dashboard shows a quarterly fish estimate history chart.
- [ ] **REQ-DASH-05** The dashboard shows a list of all open incidents across all cages.
- [ ] **REQ-DASH-06** The dashboard shows all overdue tasks across all cages.

---

## Mobile / UI

- [ ] **REQ-UI-01** All screens are usable on a 375px-wide (standard Android) viewport without horizontal scrolling.
- [ ] **REQ-UI-02** Key actions (submit log, submit water quality, update task) require no more than 3 taps from the cage detail page.
- [ ] **REQ-UI-03** Charts are readable on mobile screens (no text overlap, touch-friendly tooltips).
- [ ] **REQ-UI-04** Out-of-range values use a color indicator (red/orange) that is visible without relying on color alone (icon or label).
- [ ] **REQ-UI-05** Loading states are shown for all async data fetches.
- [ ] **REQ-UI-06** Error messages are shown in plain language when an action fails.

---

## Audit Trail

- [ ] **REQ-AUDIT-01** Every fish estimate submission and review action is recorded permanently and cannot be deleted.
- [ ] **REQ-AUDIT-02** The audit trail for each estimate shows: who submitted, when, who reviewed, when, decision, and comment.
- [ ] **REQ-AUDIT-03** All log entries, water quality readings, and measurements show the submitting user's name and timestamp.

---

## Out of Scope for MVP

The following features are explicitly **not** included in MVP:

- Financial module (revenue, expenses, profit charts, CSV export) — **V2**
- Offline / sync support — **V2**
- Push notifications / email alerts — **V2**
- Photo attachments on incidents — **V2**
- PDF report export — **V2**
- Multi-language (Filipino) support — **V2**
- Native mobile app — **V2**
- Historical data import — **V2**
