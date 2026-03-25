# Cage Management

This document describes the database schema, RLS policies, roles/permissions model, and how to use the admin cage management pages.

---

## Database Schema

Run the following SQL in your Supabase SQL editor (**Dashboard → SQL Editor**).

### 1. Add `officer` to the `user_role` enum

```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'officer';
```

> **Note:** `ALTER TYPE … ADD VALUE` cannot be run inside a transaction in PostgreSQL. If your Supabase migration runner wraps statements in transactions, execute this step manually in the SQL editor first.

---

### 2. Create the `cages` table

```sql
CREATE TABLE public.cages (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  location            text        NULL,
  assigned_officer_id uuid        NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  fish_count          integer     NOT NULL DEFAULT 0 CHECK (fish_count >= 0),
  status              text        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'inactive')),
  notes               text        NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on every row update
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER cages_updated_at
  BEFORE UPDATE ON public.cages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

### 3. Create the `cage_harvests` table

```sql
CREATE TABLE public.cage_harvests (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  cage_id       uuid        NOT NULL REFERENCES public.cages(id) ON DELETE CASCADE,
  harvest_count integer     NOT NULL CHECK (harvest_count > 0),
  harvested_at  timestamptz NOT NULL DEFAULT now(),
  notes         text        NULL,
  created_by    uuid        NOT NULL REFERENCES public.profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX cage_harvests_cage_id_harvested_at_idx
  ON public.cage_harvests (cage_id, harvested_at DESC);
```

---

### 4. Row Level Security (RLS)

#### Enable RLS

```sql
ALTER TABLE public.cages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cage_harvests ENABLE ROW LEVEL SECURITY;
```

#### `cages` policies

```sql
-- Admin/owner: full access
CREATE POLICY "cages_admin_all"
  ON public.cages
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

-- Officer: can view their assigned cage
CREATE POLICY "cages_officer_select"
  ON public.cages
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'officer'
    AND assigned_officer_id = auth.uid()
  );

-- Officer: can update only operational fields (fish_count, notes)
-- Immutable fields (name, location, status, assigned_officer_id) must not change.
CREATE POLICY "cages_officer_update"
  ON public.cages
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'officer'
    AND assigned_officer_id = auth.uid()
  )
  WITH CHECK (
    -- Prevent officers from modifying structural/assignment fields
    name               = (SELECT name               FROM public.cages WHERE id = cages.id) AND
    location           IS NOT DISTINCT FROM (SELECT location           FROM public.cages WHERE id = cages.id) AND
    status             = (SELECT status             FROM public.cages WHERE id = cages.id) AND
    assigned_officer_id IS NOT DISTINCT FROM (SELECT assigned_officer_id FROM public.cages WHERE id = cages.id)
  );
```

> **Alternative:** You can enforce the officer field restriction with a `BEFORE UPDATE` trigger instead of the `WITH CHECK` clause above. The application-layer API routes (`/admin/cages/[id]/update`) already enforce this at the server level as a defense-in-depth measure.

#### `cage_harvests` policies

```sql
-- Admin/owner: full access
CREATE POLICY "cage_harvests_admin_all"
  ON public.cage_harvests
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
  );

-- Officer: can view harvests for their assigned cage
CREATE POLICY "cage_harvests_officer_select"
  ON public.cage_harvests
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'officer'
    AND cage_id IN (
      SELECT id FROM public.cages WHERE assigned_officer_id = auth.uid()
    )
  );

-- Officer: can insert harvest rows for their assigned cage (created_by must be themselves)
CREATE POLICY "cage_harvests_officer_insert"
  ON public.cage_harvests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'officer'
    AND created_by = auth.uid()
    AND cage_id IN (
      SELECT id FROM public.cages WHERE assigned_officer_id = auth.uid()
    )
  );
```

---

## Roles & Permissions

| Action                                    | `admin` / `owner` | `officer`                        | `employee` |
|-------------------------------------------|:-----------------:|:--------------------------------:|:----------:|
| Create cage                               | ✅                | ❌                               | ❌         |
| View all cages                            | ✅                | ❌ (only assigned cage)          | ❌         |
| Update cage name / location / status      | ✅                | ❌                               | ❌         |
| Assign / reassign officer                 | ✅                | ❌                               | ❌         |
| Update `fish_count` / `notes`             | ✅                | ✅ (assigned cage only)          | ❌         |
| Record harvest                            | ✅                | ✅ (assigned cage only)          | ❌         |
| View harvest history                      | ✅                | ✅ (assigned cage only)          | ❌         |

### How roles are stored

Roles are stored in `public.profiles.role` as the `user_role` enum. Valid values after this migration: `employee`, `officer`, `admin`, `owner`.

Admins create users (including officers) via `/admin/users`. Officers log in with their username and password like any other user.

---

## How to Use the Admin Pages

### `/admin/cages` — Cage List

- **Access:** `admin` and `owner` roles only.
- **What you see:** A table of all cages with name, location, assigned officer username, current fish count, and status.
- **Create a cage:** Click **+ New Cage** to expand the inline form. Fill in:
  - **Cage Name** (required)
  - **Location** (optional)
  - **Assigned Officer** — dropdown populated with all users who have the `officer` role
  - **Initial Fish Count** (defaults to 0)
  - **Status** (`active` or `inactive`)
  - **Notes** (optional)
- Click a cage row's name link to navigate to the cage detail page.

### `/admin/cages/[id]` — Cage Detail

- **Access:** `admin`/`owner` (all cages) or `officer` (their assigned cage only).
- **Header:** Cage name, location, assigned officer, and status badge.
- **Stats cards:**
  - **Current Fish Count** — latest value from `cages.fish_count`
  - **Total Harvested** — sum of all `cage_harvests.harvest_count` for this cage
  - **Last Harvest** — date of the most recent harvest entry
- **Edit form:**
  - Admins can edit all fields (name, location, status, assigned officer, fish count, notes).
  - Officers can only update `fish_count` and `notes`.
- **Record Harvest form:** Enter harvest count (required), optional date (defaults to now), and optional notes.
- **Harvest History table:** All past harvest events sorted newest-first, showing date, count, notes, and who recorded it.

### Navigation

The **Admin** landing page (`/admin`) contains a **Cage Management** card that links to `/admin/cages`. Officers navigating directly to `/admin/cages/[id]` for their assigned cage will be allowed through by the middleware.
