-- =============================================================================
-- Migration: 20260326000000_core_rbac_audit.sql
-- Fish Cage Dashboard — RBAC helpers, audit log, extended profiles,
-- cage_employees, cage_employee_notes, tasks, reports, business_ledger,
-- and audit triggers.
--
-- Apply in Supabase SQL Editor:
--   Dashboard → SQL Editor → New query → paste entire file → Run
--
-- Prerequisites (must already exist in your project):
--   • public.profiles  (id uuid PK, role user_role, username text, full_name text)
--   • user_role enum   (at minimum: 'employee', 'admin')
--   • public.cages     (id uuid PK, assigned_officer_id uuid → profiles.id)
--   • public.set_updated_at() trigger function
--
-- Safe to re-run: uses IF NOT EXISTS, CREATE OR REPLACE, and
-- DROP … IF EXISTS where appropriate.
-- =============================================================================


-- =============================================================================
-- 0. Ensure required enum values exist
-- =============================================================================

-- Add 'officer' to user_role if not already present.
-- NOTE: ALTER TYPE … ADD VALUE cannot run inside a transaction block.
-- If your migration runner wraps statements in transactions, run this
-- statement separately in the SQL Editor first.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'officer'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'officer';
  END IF;
END;
$$;

-- Add 'owner' to user_role if not already present.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'owner'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'owner';
  END IF;
END;
$$;


-- =============================================================================
-- 1. RBAC helper functions
--
-- These functions are SECURITY DEFINER so they execute as the function owner
-- (bypassing RLS on profiles) when called from within other RLS policies.
-- This prevents infinite recursion: a policy on cages that calls is_admin()
-- can read profiles without triggering the profiles SELECT policy again.
--
-- SET search_path = public prevents schema-injection attacks.
-- =============================================================================

-- Returns the user_role of the currently authenticated user.
-- Named current_user_role() to avoid collision with PostgreSQL's built-in
-- current_role (which returns the current session/database role).
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Returns true when the caller is admin or owner.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('admin', 'owner')
$$;

-- Returns true when the caller has the officer role.
CREATE OR REPLACE FUNCTION public.is_officer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'officer'
$$;

-- Returns true when the caller has the employee role.
CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'employee'
$$;


-- =============================================================================
-- 2. audit_log table
--
-- Immutable history of field-level changes to sensitive entities.
-- Rows are inserted ONLY by trigger functions (SECURITY DEFINER).
-- No client INSERT policy is granted — the default-deny RLS blocks it.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type         text        NOT NULL,          -- e.g. 'profile', 'task', 'business_ledger'
  entity_id           uuid        NOT NULL,          -- PK of the affected row
  field_name          text        NOT NULL,          -- name of the changed column
  old_value           text        NULL,              -- previous value cast to text
  new_value           text        NULL,              -- new value cast to text
  changed_by_user_id  uuid        NULL
                        REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_by_role     text        NULL,              -- role at time of change
  changed_at          timestamptz NOT NULL DEFAULT now(),
  reason              text        NULL               -- optional context/comment
);

CREATE INDEX IF NOT EXISTS audit_log_entity_idx
  ON public.audit_log (entity_type, entity_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS audit_log_user_idx
  ON public.audit_log (changed_by_user_id, changed_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admin/owner: read all audit logs.
DROP POLICY IF EXISTS "audit_log_admin_select" ON public.audit_log;
CREATE POLICY "audit_log_admin_select"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Any user: read log rows they themselves authored (their own history).
DROP POLICY IF EXISTS "audit_log_own_select" ON public.audit_log;
CREATE POLICY "audit_log_own_select"
  ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (changed_by_user_id = auth.uid());

-- No INSERT / UPDATE / DELETE policies for clients.
-- Only the SECURITY DEFINER trigger functions may write to this table.


-- =============================================================================
-- 3. Extend public.profiles
--
-- Adds finance/admin columns used for Feature #1 (Employee list).
-- Uses ADD COLUMN IF NOT EXISTS so re-running is safe.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active   boolean  NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS salary      numeric  NULL,
  ADD COLUMN IF NOT EXISTS advances    numeric  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS admin_notes text     NULL;

-- Ensure RLS is enabled on profiles.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Admin/owner: full read access to all profiles (including finance fields).
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Every authenticated user: read their own profile row.
-- This keeps the Navbar role-lookup working for all roles.
DROP POLICY IF EXISTS "profiles_own_select" ON public.profiles;
CREATE POLICY "profiles_own_select"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admin/owner: update any profile (including finance fields).
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Officers/employees can read other profiles only for username/full_name lookups
-- needed in the assignment UI; finance fields are never returned in those queries.
-- The application layer must SELECT only non-sensitive columns when non-admin.


-- =============================================================================
-- 4. cage_employees — many-to-many employee ↔ cage assignment
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.cage_employees (
  cage_id     uuid        NOT NULL REFERENCES public.cages(id)    ON DELETE CASCADE,
  employee_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        NULL REFERENCES public.profiles(id)     ON DELETE SET NULL,
  PRIMARY KEY (cage_id, employee_id)
);

CREATE INDEX IF NOT EXISTS cage_employees_employee_idx
  ON public.cage_employees (employee_id);

ALTER TABLE public.cage_employees ENABLE ROW LEVEL SECURITY;

-- Admin/owner: full access (assign, unassign, read).
DROP POLICY IF EXISTS "cage_employees_admin_all" ON public.cage_employees;
CREATE POLICY "cage_employees_admin_all"
  ON public.cage_employees
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Employee: select only their own assignment rows.
DROP POLICY IF EXISTS "cage_employees_employee_select" ON public.cage_employees;
CREATE POLICY "cage_employees_employee_select"
  ON public.cage_employees
  FOR SELECT
  TO authenticated
  USING (
    public.is_employee()
    AND employee_id = auth.uid()
  );

-- Officer: select rows for cages where they are the assigned officer.
DROP POLICY IF EXISTS "cage_employees_officer_select" ON public.cage_employees;
CREATE POLICY "cage_employees_officer_select"
  ON public.cage_employees
  FOR SELECT
  TO authenticated
  USING (
    public.is_officer()
    AND cage_id IN (
      SELECT id FROM public.cages WHERE assigned_officer_id = auth.uid()
    )
  );


-- =============================================================================
-- 5. cage_employee_notes — per-employee, per-cage notes
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.cage_employee_notes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cage_id     uuid        NOT NULL REFERENCES public.cages(id)    ON DELETE CASCADE,
  employee_id uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid        NULL REFERENCES public.profiles(id)     ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS cage_employee_notes_cage_employee_idx
  ON public.cage_employee_notes (cage_id, employee_id);

-- Reuse the existing set_updated_at() trigger function.
DROP TRIGGER IF EXISTS cage_employee_notes_updated_at ON public.cage_employee_notes;
CREATE TRIGGER cage_employee_notes_updated_at
  BEFORE UPDATE ON public.cage_employee_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.cage_employee_notes ENABLE ROW LEVEL SECURITY;

-- Admin/owner: full access.
DROP POLICY IF EXISTS "cage_employee_notes_admin_all" ON public.cage_employee_notes;
CREATE POLICY "cage_employee_notes_admin_all"
  ON public.cage_employee_notes
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Officer: read notes for cages they are assigned to.
DROP POLICY IF EXISTS "cage_employee_notes_officer_select" ON public.cage_employee_notes;
CREATE POLICY "cage_employee_notes_officer_select"
  ON public.cage_employee_notes
  FOR SELECT
  TO authenticated
  USING (
    public.is_officer()
    AND cage_id IN (
      SELECT id FROM public.cages WHERE assigned_officer_id = auth.uid()
    )
  );

-- Officer: insert notes for their assigned cages (created_by must be themselves).
DROP POLICY IF EXISTS "cage_employee_notes_officer_insert" ON public.cage_employee_notes;
CREATE POLICY "cage_employee_notes_officer_insert"
  ON public.cage_employee_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_officer()
    AND created_by = auth.uid()
    AND cage_id IN (
      SELECT id FROM public.cages WHERE assigned_officer_id = auth.uid()
    )
  );

-- Officer: update notes for their assigned cages.
DROP POLICY IF EXISTS "cage_employee_notes_officer_update" ON public.cage_employee_notes;
CREATE POLICY "cage_employee_notes_officer_update"
  ON public.cage_employee_notes
  FOR UPDATE
  TO authenticated
  USING (
    public.is_officer()
    AND cage_id IN (
      SELECT id FROM public.cages WHERE assigned_officer_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_officer()
    AND cage_id IN (
      SELECT id FROM public.cages WHERE assigned_officer_id = auth.uid()
    )
  );

-- Employee: read-only — their own note rows only.
DROP POLICY IF EXISTS "cage_employee_notes_employee_select" ON public.cage_employee_notes;
CREATE POLICY "cage_employee_notes_employee_select"
  ON public.cage_employee_notes
  FOR SELECT
  TO authenticated
  USING (
    public.is_employee()
    AND employee_id = auth.uid()
  );


-- =============================================================================
-- 6. cages — add employee SELECT policy
--
-- Employees need to read cage rows for the cages they are assigned to
-- (via cage_employees). This policy is additive to the existing admin/officer
-- policies already in the schema.
-- =============================================================================

DROP POLICY IF EXISTS "cages_employee_select" ON public.cages;
CREATE POLICY "cages_employee_select"
  ON public.cages
  FOR SELECT
  TO authenticated
  USING (
    public.is_employee()
    AND id IN (
      SELECT cage_id FROM public.cage_employees WHERE employee_id = auth.uid()
    )
  );


-- =============================================================================
-- 7. tasks — admin-created work items
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text        NULL,
  due_date    date        NOT NULL,
  priority    text        NOT NULL DEFAULT 'medium'
                          CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status      text        NOT NULL DEFAULT 'open'
                          CHECK (status IN ('open', 'in_progress', 'done')),
  cage_id     uuid        NULL REFERENCES public.cages(id)    ON DELETE SET NULL,
  assigned_to uuid        NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by  uuid        NOT NULL REFERENCES public.profiles(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_cage_id_idx    ON public.tasks (cage_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks (assigned_to);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx    ON public.tasks (due_date);
CREATE INDEX IF NOT EXISTS tasks_status_idx      ON public.tasks (status);

DROP TRIGGER IF EXISTS tasks_updated_at ON public.tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Admin/owner: full access (create, read, update, delete).
DROP POLICY IF EXISTS "tasks_admin_all" ON public.tasks;
CREATE POLICY "tasks_admin_all"
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Officers and employees: read-only access to all tasks.
-- (They need to see what's assigned to their cage or to them.)
DROP POLICY IF EXISTS "tasks_authenticated_select" ON public.tasks;
CREATE POLICY "tasks_authenticated_select"
  ON public.tasks
  FOR SELECT
  TO authenticated
  USING (true);


-- =============================================================================
-- 8. reports — officer / employee incident and report submissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reports (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  description     text        NULL,
  priority        text        NOT NULL DEFAULT 'medium'
                              CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  cage_id         uuid        NULL REFERENCES public.cages(id) ON DELETE SET NULL,
  created_by      uuid        NOT NULL REFERENCES public.profiles(id),
  created_by_role text        NULL,  -- snapshot of role at submission time
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_cage_id_idx    ON public.reports (cage_id);
CREATE INDEX IF NOT EXISTS reports_created_by_idx ON public.reports (created_by);

DROP TRIGGER IF EXISTS reports_updated_at ON public.reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Admin/owner: full access to all reports.
DROP POLICY IF EXISTS "reports_admin_all" ON public.reports;
CREATE POLICY "reports_admin_all"
  ON public.reports
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Officers and employees: insert their own reports.
-- Universal reports (cage_id = NULL) are explicitly allowed.
DROP POLICY IF EXISTS "reports_authenticated_insert" ON public.reports;
CREATE POLICY "reports_authenticated_insert"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Officers and employees: read their own reports only.
DROP POLICY IF EXISTS "reports_own_select" ON public.reports;
CREATE POLICY "reports_own_select"
  ON public.reports
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());


-- =============================================================================
-- 8b. report_attachments — file attachments for reports
--
-- Storage design note:
--   • Bucket name (recommended): "report-attachments"
--   • Bucket type: private (Supabase Storage managed — not configured via SQL)
--   • storage_path stores the object key within that bucket, e.g.:
--       "{report_id}/{filename}"
--   • Use Supabase Storage signed URLs (createSignedUrl) to serve files.
--   • Configure bucket RLS in Supabase Dashboard → Storage → Policies:
--       - INSERT: auth.uid() = (SELECT created_by FROM reports WHERE id = report_id)
--       - SELECT: same condition OR is_admin()
--   See docs/rbac.md § Storage for bucket policy details.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.report_attachments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    uuid        NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  storage_path text        NOT NULL,
  metadata     jsonb       NULL,   -- optional: {filename, size, mime_type, ...}
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid        NULL REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS report_attachments_report_id_idx
  ON public.report_attachments (report_id);

ALTER TABLE public.report_attachments ENABLE ROW LEVEL SECURITY;

-- Admin/owner: full access.
DROP POLICY IF EXISTS "report_attachments_admin_all" ON public.report_attachments;
CREATE POLICY "report_attachments_admin_all"
  ON public.report_attachments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Any authenticated user: insert attachments for reports they own.
DROP POLICY IF EXISTS "report_attachments_own_insert" ON public.report_attachments;
CREATE POLICY "report_attachments_own_insert"
  ON public.report_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND report_id IN (
      SELECT id FROM public.reports WHERE created_by = auth.uid()
    )
  );

-- Any authenticated user: read attachments for their own reports.
DROP POLICY IF EXISTS "report_attachments_own_select" ON public.report_attachments;
CREATE POLICY "report_attachments_own_select"
  ON public.report_attachments
  FOR SELECT
  TO authenticated
  USING (
    report_id IN (
      SELECT id FROM public.reports WHERE created_by = auth.uid()
    )
  );


-- =============================================================================
-- 9. business_ledger — admin-only financial records
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.business_ledger (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_type  text        NOT NULL
                          CHECK (entry_type IN ('income', 'expense', 'tax', 'payroll', 'other')),
  amount      numeric     NOT NULL CHECK (amount > 0),
  entry_date  date        NOT NULL,
  category    text        NULL,
  notes       text        NULL,
  created_by  uuid        NOT NULL REFERENCES public.profiles(id),
  updated_by  uuid        NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS business_ledger_entry_date_idx
  ON public.business_ledger (entry_date DESC);

CREATE INDEX IF NOT EXISTS business_ledger_entry_type_idx
  ON public.business_ledger (entry_type);

DROP TRIGGER IF EXISTS business_ledger_updated_at ON public.business_ledger;
CREATE TRIGGER business_ledger_updated_at
  BEFORE UPDATE ON public.business_ledger
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.business_ledger ENABLE ROW LEVEL SECURITY;

-- Admin/owner only.
DROP POLICY IF EXISTS "business_ledger_admin_all" ON public.business_ledger;
CREATE POLICY "business_ledger_admin_all"
  ON public.business_ledger
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- =============================================================================
-- 10. Audit trigger infrastructure
--
-- A single SECURITY DEFINER helper writes one row to audit_log per changed
-- field. All per-table trigger functions call this helper.
-- auth.uid() returns the Supabase Auth UID even inside SECURITY DEFINER
-- functions because it reads from the request.jwt.claims session config.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.audit_log_field(
  p_entity_type text,
  p_entity_id   uuid,
  p_field_name  text,
  p_old_value   text,
  p_new_value   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  -- Capture role; gracefully handle the case where auth.uid() is NULL
  -- (e.g. service-role operations or direct DB access).
  BEGIN
    v_role := public.current_user_role()::text;
  EXCEPTION WHEN OTHERS THEN
    v_role := NULL;
  END;

  INSERT INTO public.audit_log (
    entity_type, entity_id, field_name,
    old_value, new_value,
    changed_by_user_id, changed_by_role
  ) VALUES (
    p_entity_type, p_entity_id, p_field_name,
    p_old_value, p_new_value,
    auth.uid(), v_role
  );
END;
$$;


-- =============================================================================
-- 10a. Audit trigger: profiles
--      Tracks changes to salary, advances, admin_notes, and is_active.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_audit_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.salary IS DISTINCT FROM NEW.salary THEN
    PERFORM public.audit_log_field(
      'profile', NEW.id, 'salary',
      OLD.salary::text, NEW.salary::text
    );
  END IF;

  IF OLD.advances IS DISTINCT FROM NEW.advances THEN
    PERFORM public.audit_log_field(
      'profile', NEW.id, 'advances',
      OLD.advances::text, NEW.advances::text
    );
  END IF;

  IF OLD.admin_notes IS DISTINCT FROM NEW.admin_notes THEN
    PERFORM public.audit_log_field(
      'profile', NEW.id, 'admin_notes',
      OLD.admin_notes, NEW.admin_notes
    );
  END IF;

  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    PERFORM public.audit_log_field(
      'profile', NEW.id, 'is_active',
      OLD.is_active::text, NEW.is_active::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_profiles();


-- =============================================================================
-- 10b. Audit trigger: business_ledger
--      Tracks any field change on a ledger entry.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_audit_business_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.entry_type IS DISTINCT FROM NEW.entry_type THEN
    PERFORM public.audit_log_field(
      'business_ledger', NEW.id, 'entry_type', OLD.entry_type, NEW.entry_type
    );
  END IF;

  IF OLD.amount IS DISTINCT FROM NEW.amount THEN
    PERFORM public.audit_log_field(
      'business_ledger', NEW.id, 'amount', OLD.amount::text, NEW.amount::text
    );
  END IF;

  IF OLD.entry_date IS DISTINCT FROM NEW.entry_date THEN
    PERFORM public.audit_log_field(
      'business_ledger', NEW.id, 'entry_date',
      OLD.entry_date::text, NEW.entry_date::text
    );
  END IF;

  IF OLD.category IS DISTINCT FROM NEW.category THEN
    PERFORM public.audit_log_field(
      'business_ledger', NEW.id, 'category', OLD.category, NEW.category
    );
  END IF;

  IF OLD.notes IS DISTINCT FROM NEW.notes THEN
    PERFORM public.audit_log_field(
      'business_ledger', NEW.id, 'notes', OLD.notes, NEW.notes
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_business_ledger ON public.business_ledger;
CREATE TRIGGER audit_business_ledger
  AFTER UPDATE ON public.business_ledger
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_business_ledger();


-- =============================================================================
-- 10c. Audit trigger: cage_employees
--      Tracks employee assignment additions and removals.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_audit_cage_employees()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_log_field(
      'cage_employee_assignment', NEW.employee_id,
      'cage_id',
      NULL,                  -- no previous cage assignment (this field)
      NEW.cage_id::text
    );

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.audit_log_field(
      'cage_employee_assignment', OLD.employee_id,
      'cage_id',
      OLD.cage_id::text,
      NULL                   -- removed
    );
  END IF;

  RETURN NULL; -- return value ignored for AFTER triggers
END;
$$;

DROP TRIGGER IF EXISTS audit_cage_employees ON public.cage_employees;
CREATE TRIGGER audit_cage_employees
  AFTER INSERT OR DELETE ON public.cage_employees
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_cage_employees();


-- =============================================================================
-- 10d. Audit trigger: cage_employee_notes
--      Tracks inserts, updates, and deletes of cage-employee notes.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_audit_cage_employee_notes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_log_field(
      'cage_employee_note', NEW.id, 'note',
      NULL, NEW.note
    );

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.note IS DISTINCT FROM NEW.note THEN
      PERFORM public.audit_log_field(
        'cage_employee_note', NEW.id, 'note',
        OLD.note, NEW.note
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.audit_log_field(
      'cage_employee_note', OLD.id, 'note',
      OLD.note, NULL
    );
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_cage_employee_notes ON public.cage_employee_notes;
CREATE TRIGGER audit_cage_employee_notes
  AFTER INSERT OR UPDATE OR DELETE ON public.cage_employee_notes
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_cage_employee_notes();


-- =============================================================================
-- 10e. Audit trigger: tasks
--      Tracks updates to title, description, status, priority, due_date,
--      and assigned_to.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_audit_tasks()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    PERFORM public.audit_log_field(
      'task', NEW.id, 'title', OLD.title, NEW.title
    );
  END IF;

  IF OLD.description IS DISTINCT FROM NEW.description THEN
    PERFORM public.audit_log_field(
      'task', NEW.id, 'description', OLD.description, NEW.description
    );
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.audit_log_field(
      'task', NEW.id, 'status', OLD.status, NEW.status
    );
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    PERFORM public.audit_log_field(
      'task', NEW.id, 'priority', OLD.priority, NEW.priority
    );
  END IF;

  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    PERFORM public.audit_log_field(
      'task', NEW.id, 'due_date', OLD.due_date::text, NEW.due_date::text
    );
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    PERFORM public.audit_log_field(
      'task', NEW.id, 'assigned_to',
      OLD.assigned_to::text, NEW.assigned_to::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_tasks ON public.tasks;
CREATE TRIGGER audit_tasks
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_tasks();


-- =============================================================================
-- 10f. Audit trigger: reports
--      Tracks updates to title, description, priority, and cage_id.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.trg_audit_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    PERFORM public.audit_log_field(
      'report', NEW.id, 'title', OLD.title, NEW.title
    );
  END IF;

  IF OLD.description IS DISTINCT FROM NEW.description THEN
    PERFORM public.audit_log_field(
      'report', NEW.id, 'description', OLD.description, NEW.description
    );
  END IF;

  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    PERFORM public.audit_log_field(
      'report', NEW.id, 'priority', OLD.priority, NEW.priority
    );
  END IF;

  IF OLD.cage_id IS DISTINCT FROM NEW.cage_id THEN
    PERFORM public.audit_log_field(
      'report', NEW.id, 'cage_id',
      OLD.cage_id::text, NEW.cage_id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_reports ON public.reports;
CREATE TRIGGER audit_reports
  AFTER UPDATE ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_reports();


-- =============================================================================
-- End of migration
-- =============================================================================
