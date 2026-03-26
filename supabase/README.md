# Supabase — Migration Guide

This directory contains the SQL migration files for the Fish Cage Dashboard's
Supabase (PostgreSQL) database.

---

## Directory layout

```
supabase/
├── README.md                           ← this file
└── migrations/
    └── 20260326000000_core_rbac_audit.sql
```

---

## How to apply migrations in Supabase

> **Important:** Supabase does not automatically run `.sql` files from your
> repo. You must paste them into the SQL Editor manually (or use the Supabase
> CLI if you have it configured). The files here are the **source of truth** —
> keep them in sync with whatever runs in production.

### Step-by-step (SQL Editor)

1. Open **[Supabase Dashboard](https://supabase.com/dashboard)** and select
   your project.

2. Navigate to **SQL Editor** (left sidebar → `< >` icon).

3. Click **New query**.

4. Open `supabase/migrations/20260326000000_core_rbac_audit.sql` in your
   editor and **copy the entire contents**.

5. Paste into the Supabase SQL Editor query window.

6. Click **Run** (or press `Ctrl/Cmd + Enter`).

7. Verify: you should see `Success. No rows returned` (or similar) in the
   results panel. Errors will appear in red — see the troubleshooting section
   below.

---

## Prerequisites (must exist before running the migration)

The migration assumes the following objects already exist in your database.
These are created by the earlier setup steps documented in the project README
and `docs/cages.md`:

| Object | How it was created |
|--------|--------------------|
| `public.profiles` | Initial auth setup (see `README.md`) |
| `user_role` enum with `'employee'` and `'admin'` values | Initial auth setup |
| `public.cages` | `docs/cages.md` step 2 |
| `public.cage_harvests` | `docs/cages.md` step 3 |
| `public.set_updated_at()` function | `docs/cages.md` step 2 |
| RLS enabled on `cages` and `cage_harvests` | `docs/cages.md` step 4 |

If you are starting fresh (empty database), run the prerequisite SQL from
`docs/cages.md` first, then run this migration.

---

## What the migration adds

### RBAC helper functions

| Function | Returns | Description |
|----------|---------|-------------|
| `public.current_user_role()` | `user_role` | The role of the calling user (reads `profiles`). Named to avoid collision with PostgreSQL's built-in `current_role`. |
| `public.is_admin()` | `boolean` | `true` if role is `admin` or `owner` |
| `public.is_officer()` | `boolean` | `true` if role is `officer` |
| `public.is_employee()` | `boolean` | `true` if role is `employee` |

All four functions use `SECURITY DEFINER` so they can query `profiles` without
triggering the profiles RLS policies (which would cause infinite recursion).

### New tables

| Table | Purpose |
|-------|---------|
| `public.audit_log` | Immutable field-level change history |
| `public.cage_employees` | Many-to-many employee ↔ cage assignments |
| `public.cage_employee_notes` | Per-employee, per-cage notes |
| `public.tasks` | Admin-created tasks with priority and status |
| `public.reports` | Officer/employee incident & report submissions |
| `public.report_attachments` | File attachment metadata for reports |
| `public.business_ledger` | Admin-only financial records |

### Profiles extensions

The following columns are added to `public.profiles`:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `is_active` | `boolean` | `true` | Soft-disable a user without deleting |
| `salary` | `numeric` | `null` | Monthly/agreed salary (admin-visible only) |
| `advances` | `numeric` | `0` | Outstanding salary advances |
| `admin_notes` | `text` | `null` | Private admin notes about this employee |

### Audit triggers

Triggers automatically write to `audit_log` when sensitive fields change.
Clients cannot insert to `audit_log` directly; only the SECURITY DEFINER
trigger functions can.

| Trigger | Table | Fields tracked |
|---------|-------|----------------|
| `audit_profiles` | `profiles` | `salary`, `advances`, `admin_notes`, `is_active` |
| `audit_business_ledger` | `business_ledger` | `entry_type`, `amount`, `entry_date`, `category`, `notes` |
| `audit_cage_employees` | `cage_employees` | assignment add/remove |
| `audit_cage_employee_notes` | `cage_employee_notes` | `note` insert/update/delete |
| `audit_tasks` | `tasks` | `title`, `description`, `status`, `priority`, `due_date`, `assigned_to` |
| `audit_reports` | `reports` | `title`, `description`, `priority`, `cage_id` |

---

## Verification steps

After running the migration, verify the following in the SQL Editor:

```sql
-- 1. Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'audit_log', 'cage_employees', 'cage_employee_notes',
    'tasks', 'reports', 'report_attachments', 'business_ledger'
  )
ORDER BY table_name;
-- Expected: 7 rows

-- 2. Check profiles new columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('is_active', 'salary', 'advances', 'admin_notes')
ORDER BY column_name;
-- Expected: 4 rows

-- 3. Check RBAC functions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('current_user_role', 'is_admin', 'is_officer', 'is_employee')
ORDER BY routine_name;
-- Expected: 4 rows

-- 4. Check audit triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'audit_%'
ORDER BY trigger_name;
-- Expected: 6 rows (audit_profiles, audit_business_ledger, audit_cage_employees,
--           audit_cage_employee_notes, audit_tasks, audit_reports)

-- 5. Check RLS is enabled on new tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'audit_log', 'cage_employees', 'cage_employee_notes',
    'tasks', 'reports', 'report_attachments', 'business_ledger'
  )
ORDER BY tablename;
-- Expected: 7 rows, all with rowsecurity = true

-- 6. Smoke-test a helper function (run as a non-admin test user or use service role)
SELECT public.is_admin(); -- returns true/false depending on calling user
```

---

## Troubleshooting

### `ERROR: cannot alter type "user_role" inside a transaction`

The `ALTER TYPE … ADD VALUE` statements (for `'officer'` and `'owner'`) cannot
run inside a transaction block. If you see this error:

1. Click **New query** in the SQL Editor.
2. Run only these two lines first (each separately if needed):
   ```sql
   ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'officer';
   ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'owner';
   ```
3. Then run the full migration file.

### `ERROR: policy "xyz" already exists`

Each policy creation is preceded by `DROP POLICY IF EXISTS`. If you see this,
ensure you are pasting the complete migration file (not a partial copy).

### `ERROR: relation "public.cages" does not exist`

The prerequisites are not yet set up. Run the SQL from `docs/cages.md` first.

### `ERROR: function public.set_updated_at() does not exist`

Same as above — `set_updated_at()` is created in the cages setup step. If you
need it standalone:

```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
```

---

## Storage (Supabase Storage — manual setup)

File attachments for reports use Supabase Storage, which cannot be configured
via SQL. After applying the migration, configure storage in the dashboard:

1. Go to **Storage** (left sidebar).
2. Click **New bucket**.
   - Name: `report-attachments`
   - Public: **off** (private bucket)
3. Click **Policies** on the new bucket.
4. Add the following RLS policies for the bucket:

   **INSERT** (authenticated users can upload to their own report folder):
   ```
   (auth.uid()::text = (storage.foldername(name))[1])
   ```

   **SELECT** (authenticated users can read their own files; admins can read all):
   ```
   (auth.uid()::text = (storage.foldername(name))[1])
   OR
   ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner'))
   ```

   **DELETE** (owner or admin):
   ```
   (auth.uid()::text = (storage.foldername(name))[1])
   OR
   ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner'))
   ```

5. When uploading files from the application, use the path pattern:
   `{user_id}/{report_id}/{filename}`

---

## Re-running the migration

The migration is designed to be **idempotent**:
- Tables use `CREATE TABLE IF NOT EXISTS`
- Functions use `CREATE OR REPLACE FUNCTION`
- Policies use `DROP POLICY IF EXISTS` then `CREATE POLICY`
- Column additions use `ADD COLUMN IF NOT EXISTS`
- Triggers use `DROP TRIGGER IF EXISTS` then `CREATE TRIGGER`

Re-running will not duplicate data or break existing rows.

---

## Future migrations

Name subsequent migration files with a newer timestamp prefix:

```
supabase/migrations/20260401000000_next_feature.sql
```

Always run migrations in **chronological order** (oldest first).
