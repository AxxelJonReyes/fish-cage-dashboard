# Role-Based Access Control (RBAC)

This document describes who can do what in the Fish Cage Dashboard.
All permissions are enforced at **two layers**:

1. **Database layer** — PostgreSQL Row Level Security (RLS) policies.
2. **Application layer** — server-side checks in Next.js Server Components
   and API route handlers.

---

## Roles

| Role | Description |
|------|-------------|
| `owner` | Business owner. Equivalent to `admin` for all purposes. Full access. |
| `admin` | Administrator. Full access. Can manage users, cages, finances. |
| `officer` | Cage officer. Manages their assigned cage(s). |
| `employee` | Field employee. Read-only on assigned cage(s); can submit own reports. |

Roles are stored in `public.profiles.role` as the `user_role` Postgres enum.

---

## RBAC Helper Functions

The following `SECURITY DEFINER` functions are available for use in RLS
policies and application code:

| Function | Returns | Usage |
|----------|---------|-------|
| `public.current_user_role()` | `user_role` | Get current caller's role |
| `public.is_admin()` | `boolean` | `true` for `admin` or `owner` |
| `public.is_officer()` | `boolean` | `true` for `officer` |
| `public.is_employee()` | `boolean` | `true` for `employee` |

These functions use `SECURITY DEFINER` to safely read `profiles` from within
other RLS policies without causing infinite recursion.

---

## Permissions Matrix

### Profiles (`public.profiles` and `public.profiles_public`)

`public.profiles` is locked down to admin/owner and own-row reads. Finance
columns (`salary`, `advances`, `admin_notes`) are never visible to
officers or employees via this table.

For UI joins that only need display names (harvest history, assignment lists,
etc.), officers and employees must query the **`public.profiles_public` view**
instead. This view exposes only `id`, `username`, `full_name`, and `role`.

| Action | admin/owner | officer | employee |
|--------|:-----------:|:-------:|:--------:|
| Read all profiles (full row, incl. finance fields) | ✅ | ❌ | ❌ |
| Read own profile (full row) | ✅ | ✅ | ✅ |
| Read any user's display name via `profiles_public` | ✅ | ✅ | ✅ |
| Update any profile (all fields) | ✅ | ❌ | ❌ |
| Update own profile (non-finance) | ✅ | app-layer | app-layer |
| View `salary` / `advances` / `admin_notes` | ✅ | ❌ | ❌ |

> **Note for Navbar:** Every user can read their own profile row to get their
> `role` and `full_name` for display. This is enforced by the
> `profiles_own_select` policy.
>
> **Note for display-name joins:** When building queries that need another
> user's name (e.g. "harvested by", "assigned employee"), use
> `profiles_public` — not `profiles` — so that non-admin callers can resolve
> names without triggering a permission error or accidentally reading finance
> fields.

---

### Cages (`public.cages`)

| Action | admin/owner | officer | employee |
|--------|:-----------:|:-------:|:--------:|
| Create cage | ✅ | ❌ | ❌ |
| Read all cages | ✅ | ❌ | ❌ |
| Read assigned cage | ✅ | ✅ | ✅ (via `cage_employees`) |
| Update all fields (name, location, status, officer) | ✅ | ❌ | ❌ |
| Update `fish_count` / `notes` | ✅ | ✅ (assigned cage only) | ❌ |
| Archive/delete cage | ✅ | ❌ | ❌ |
| Assign officer to cage | ✅ | ❌ | ❌ |

> **Employee cage visibility:** Employees see only the cages listed in
> `cage_employees` where `employee_id = auth.uid()`.

---

### Cage Harvests (`public.cage_harvests`)

| Action | admin/owner | officer | employee |
|--------|:-----------:|:-------:|:--------:|
| Record harvest | ✅ | ✅ (assigned cage only) | ❌ |
| Read harvest history | ✅ | ✅ (assigned cage only) | ❌ |
| Delete harvest | ✅ | ❌ | ❌ |

---

### Cage Employee Assignments (`public.cage_employees`)

| Action | admin/owner | officer | employee |
|--------|:-----------:|:-------:|:--------:|
| Assign employee to cage | ✅ | ❌ | ❌ |
| Unassign employee from cage | ✅ | ❌ | ❌ |
| Read all assignments | ✅ | ✅ (own cages) | ✅ (own rows) |

---

### Cage Employee Notes (`public.cage_employee_notes`)

| Action | admin/owner | officer | employee |
|--------|:-----------:|:-------:|:--------:|
| Create note | ✅ | ✅ (assigned cage only) | ❌ |
| Read all notes | ✅ | ✅ (assigned cage only) | ✅ (own notes only) |
| Update note | ✅ | ✅ (assigned cage only) | ❌ |
| Delete note | ✅ | ❌ | ❌ |

---

### Tasks (`public.tasks`)

| Action | admin/owner | officer | employee |
|--------|:-----------:|:-------:|:--------:|
| Create task | ✅ | ❌ | ❌ |
| Read all tasks | ✅ | ✅ (read-only) | ✅ (read-only) |
| Update task | ✅ | ❌ | ❌ |
| Delete task | ✅ | ❌ | ❌ |

> **Universal tasks:** A task with `cage_id = NULL` applies to all/no specific
> cage. All authenticated users can read it.

---

### Reports / Incidents (`public.reports`)

| Action | admin/owner | officer | employee |
|--------|:-----------:|:-------:|:--------:|
| Create report (any cage or universal) | ✅ | ✅ | ✅ |
| Read all reports | ✅ | ❌ | ❌ |
| Read own reports | ✅ | ✅ | ✅ |
| Update/delete any report | ✅ | ❌ | ❌ |

> **Universal reports:** Setting `cage_id = NULL` is explicitly allowed for
> all submitters. The INSERT policy only requires `created_by = auth.uid()`.
>
> **`created_by_role`:** This column is always set by the DB trigger
> `set_reports_created_by_role` (BEFORE INSERT). Any value supplied by the
> client in the INSERT payload is overwritten. This prevents role spoofing.

---

### Report Attachments (`public.report_attachments`)

| Action | admin/owner | officer | employee |
|--------|:-----------:|:-------:|:--------:|
| Upload attachment | ✅ | ✅ (own reports) | ✅ (own reports) |
| Read attachment metadata | ✅ | ✅ (own reports) | ✅ (own reports) |
| Delete attachment | ✅ | ❌ | ❌ |

---

### Business Ledger (`public.business_ledger`)

| Action | admin/owner | officer | employee |
|--------|:-----------:|:-------:|:--------:|
| Create entry | ✅ | ❌ | ❌ |
| Read all entries | ✅ | ❌ | ❌ |
| Update entry | ✅ | ❌ | ❌ |
| Delete entry | ✅ | ❌ | ❌ |

---

### Audit Log (`public.audit_log`)

| Action | admin/owner | officer | employee |
|--------|:-----------:|:-------:|:--------:|
| Read all audit rows | ✅ | ❌ | ❌ |
| Read own authored rows | ✅ | ✅ | ✅ |
| Insert directly | ❌ | ❌ | ❌ |

> **Trigger-only writes:** All `audit_log` inserts are performed by
> `SECURITY DEFINER` trigger functions. No client policy allows direct INSERT.

---

## Storage (Supabase Storage buckets)

File attachments are stored in the `report-attachments` private bucket.
Storage policies are configured in the Supabase Dashboard (not via SQL).
See `supabase/README.md` § Storage for bucket policy details.

| Action | admin/owner | officer | employee |
|--------|:-----------:|:-------:|:--------:|
| Upload file (own report folder) | ✅ | ✅ | ✅ |
| Read file (own report folder) | ✅ | ✅ | ✅ |
| Read any file | ✅ | ❌ | ❌ |
| Delete file | ✅ | ✅ (own) | ✅ (own) |

---

## Middleware enforcement

The Next.js middleware (`middleware.ts`) provides a **first line of defense**:

| Path | Requirement |
|------|-------------|
| `/dashboard`, `/cages`, `/tasks`, `/incidents` | Authenticated |
| `/admin/*` | `admin` or `owner` role |
| `/admin/cages/*` | `admin`, `owner`, **or** `officer` (own cage detail only) |

The database RLS policies are the **authoritative enforcement layer**.
Middleware and server-side checks are defense-in-depth.

---

## Adding new roles or permissions

1. Add the enum value to `user_role` in a new migration file.
2. Update `public.current_user_role()` if needed (it reads from `profiles`,
   so new enum values are picked up automatically).
3. Add `is_<newrole>()` helper function.
4. Add RLS policies to affected tables.
5. Update this document.
