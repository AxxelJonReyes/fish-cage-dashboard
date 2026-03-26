# Audit Logging

The Fish Cage Dashboard maintains an immutable audit trail for all changes to
sensitive data. This document describes what is logged, where it is stored,
and how to query the history.

---

## Overview

All audit records are stored in the `public.audit_log` table. Rows are written
exclusively by PostgreSQL trigger functions (`SECURITY DEFINER`). **No client
application or API route can insert directly into this table** — the RLS
policies deny all client-side INSERT/UPDATE/DELETE.

The audit log is **append-only from the application's perspective**. Admins
can read all rows; other users can read only rows they themselves authored.

---

## `public.audit_log` Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` | Unique row identifier |
| `entity_type` | `text` | Type of the changed entity (see table below) |
| `entity_id` | `uuid` | Primary key of the changed row |
| `field_name` | `text` | Name of the column that changed |
| `old_value` | `text` | Previous value, cast to text (`NULL` = was null or new row) |
| `new_value` | `text` | New value, cast to text (`NULL` = now null or row deleted) |
| `changed_by_user_id` | `uuid` | `profiles.id` of the user who triggered the change |
| `changed_by_role` | `text` | Role snapshot at time of change |
| `changed_at` | `timestamptz` | Timestamp (UTC) of the change |
| `reason` | `text` | Optional human note (reserved for future use) |

> **NULL values in `changed_by_user_id`:** When a change is made via the
> Supabase service-role key (e.g., server-side migrations or admin scripts),
> `auth.uid()` returns `NULL`. The row is still recorded with
> `changed_by_user_id = NULL` and `changed_by_role = NULL`.

---

## What is Logged

### `entity_type = 'profile'`

Source table: `public.profiles`
Trigger: `audit_profiles` (AFTER UPDATE)

| `field_name` | When logged |
|-------------|-------------|
| `salary` | Any change to the salary field |
| `advances` | Any change to advances outstanding |
| `admin_notes` | Any change to private admin notes |
| `is_active` | User activated or deactivated |

---

### `entity_type = 'business_ledger'`

Source table: `public.business_ledger`
Trigger: `audit_business_ledger` (AFTER UPDATE)

| `field_name` | When logged |
|-------------|-------------|
| `entry_type` | Changed from income/expense/tax/payroll/other |
| `amount` | Amount corrected |
| `entry_date` | Date corrected |
| `category` | Category changed |
| `notes` | Notes updated |

---

### `entity_type = 'cage_employee_assignment'`

Source table: `public.cage_employees`
Trigger: `audit_cage_employees` (AFTER INSERT OR DELETE)

| `field_name` | When logged |
|-------------|-------------|
| `cage_id` | Employee assigned to a cage (`old_value = NULL`, `new_value = cage UUID`) |
| `cage_id` | Employee removed from a cage (`old_value = cage UUID`, `new_value = NULL`) |

> `entity_id` is the **employee's** `profiles.id` so you can look up all
> cage assignments for a given employee.

---

### `entity_type = 'cage_employee_note'`

Source table: `public.cage_employee_notes`
Trigger: `audit_cage_employee_notes` (AFTER INSERT OR UPDATE OR DELETE)

| `field_name` | When logged |
|-------------|-------------|
| `note` | Note created (`old_value = NULL`) |
| `note` | Note text edited |
| `note` | Note deleted (`new_value = NULL`) |

---

### `entity_type = 'task'`

Source table: `public.tasks`
Trigger: `audit_tasks` (AFTER UPDATE)

| `field_name` | When logged |
|-------------|-------------|
| `title` | Title changed |
| `description` | Description updated |
| `status` | Status transition (e.g. `open` → `in_progress`) |
| `priority` | Priority changed |
| `due_date` | Due date moved |
| `assigned_to` | Assignee changed |

---

### `entity_type = 'report'`

Source table: `public.reports`
Trigger: `audit_reports` (AFTER UPDATE)

| `field_name` | When logged |
|-------------|-------------|
| `title` | Title changed |
| `description` | Description updated |
| `priority` | Priority changed |
| `cage_id` | Associated cage reassigned or cleared |

---

## Querying Audit History

### All changes to a specific employee's profile

```sql
SELECT
  field_name,
  old_value,
  new_value,
  changed_by_role,
  changed_at
FROM public.audit_log
WHERE entity_type = 'profile'
  AND entity_id = '<profiles.id>'
ORDER BY changed_at DESC;
```

### Full salary history across all employees

```sql
SELECT
  al.entity_id,
  p.full_name,
  al.old_value AS previous_salary,
  al.new_value AS new_salary,
  al.changed_by_role,
  al.changed_at
FROM public.audit_log al
LEFT JOIN public.profiles p ON p.id = al.entity_id
WHERE al.entity_type = 'profile'
  AND al.field_name = 'salary'
ORDER BY al.changed_at DESC;
```

### All changes to a specific business ledger entry

```sql
SELECT field_name, old_value, new_value, changed_at
FROM public.audit_log
WHERE entity_type = 'business_ledger'
  AND entity_id = '<business_ledger.id>'
ORDER BY changed_at DESC;
```

### Task status history

```sql
SELECT
  t.title,
  al.old_value AS from_status,
  al.new_value AS to_status,
  al.changed_by_user_id,
  al.changed_at
FROM public.audit_log al
JOIN public.tasks t ON t.id = al.entity_id
WHERE al.entity_type = 'task'
  AND al.field_name = 'status'
ORDER BY al.changed_at DESC;
```

### All cage assignment changes for an employee

```sql
SELECT
  al.old_value AS removed_from_cage,
  al.new_value AS added_to_cage,
  al.changed_at
FROM public.audit_log al
WHERE al.entity_type = 'cage_employee_assignment'
  AND al.entity_id = '<profiles.id>'
ORDER BY al.changed_at DESC;
```

---

## Access Control on `audit_log`

| Who | What |
|-----|------|
| `admin` / `owner` | Read **all** rows |
| `officer` / `employee` | Read only rows where `changed_by_user_id = auth.uid()` |
| Anyone | No INSERT / UPDATE / DELETE |

The two RLS policies on `audit_log`:
- `audit_log_admin_select` — uses `public.is_admin()`
- `audit_log_own_select` — `changed_by_user_id = auth.uid()`

---

## How Triggers Write to `audit_log`

All trigger functions call the shared helper:

```sql
public.audit_log_field(
  p_entity_type text,
  p_entity_id   uuid,
  p_field_name  text,
  p_old_value   text,
  p_new_value   text
)
```

This helper:
1. Resolves the current user role via `public.current_user_role()`.
2. Inserts one row per changed field.
3. Uses `SECURITY DEFINER` to bypass RLS on `audit_log` (since clients cannot
   insert directly).

If two fields change in the same UPDATE statement, two separate `audit_log`
rows are written (one per field), each with an identical `changed_at` timestamp.

---

## Extending the Audit Log

To add auditing to a new table:

1. Write a new trigger function following the pattern of the existing ones
   (see `supabase/migrations/20260326000000_core_rbac_audit.sql`, sections 10a–10f).
2. Call `public.audit_log_field()` for each field you want to track.
3. Attach the trigger with `AFTER INSERT OR UPDATE OR DELETE`.
4. Add the new `entity_type` values to this document.
