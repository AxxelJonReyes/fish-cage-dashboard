# Fish Cage Dashboard — Data Model

> **Note:** This schema is designed for PostgreSQL (via Supabase).
> All tables use UUID primary keys. Timestamps are stored in UTC.
> Soft deletes (`deleted_at`) are used — no records are hard-deleted.

---

## Entity Relationship Overview

```
User ──────────────────────────────────┐
  │                                    │
  ├── CageAssignment ──── Cage ─────── FishEstimate
  │                         │          │
  │                         ├── WaterQualityReading
  │                         ├── WaterQualityThreshold
  │                         ├── FishMeasurementSession
  │                         │     └── FishMeasurementEntry
  │                         ├── DailyLog
  │                         ├── Incident ── IncidentComment
  │                         └── Task ────── TaskComment
  │
  ├── RevenueEntry
  └── ExpenseEntry
```

---

## Tables

### `users`

Stores all application users.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | Auto-generated |
| `email` | TEXT UNIQUE NOT NULL | Used for login |
| `full_name` | TEXT NOT NULL | Displayed throughout the app |
| `role` | ENUM: `admin`, `officer`, `employee` | Role-based access control |
| `is_active` | BOOLEAN DEFAULT TRUE | False = cannot log in |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated |
| `deleted_at` | TIMESTAMPTZ NULL | Soft delete |

**Notes:**
- Password is managed by Supabase Auth (not stored in this table directly)
- `role` is the single most important field for all access control decisions

---

### `cages`

One row per fish cage.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `name` | TEXT NOT NULL | e.g., "Cage 1", "North Cage" |
| `location_notes` | TEXT NULL | Free-text description of location |
| `officer_id` | UUID FK → users.id NULL | Primary officer assigned |
| `is_active` | BOOLEAN DEFAULT TRUE | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `deleted_at` | TIMESTAMPTZ NULL | Soft delete |

---

### `cage_assignments`

Many-to-many: which employees are assigned to which cages.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `cage_id` | UUID FK → cages.id NOT NULL | |
| `user_id` | UUID FK → users.id NOT NULL | |
| `assigned_at` | TIMESTAMPTZ | When this assignment was made |
| `assigned_by` | UUID FK → users.id | Admin who made the assignment |

**Unique constraint:** `(cage_id, user_id)`

**Notes:**
- Officers are assigned via `cages.officer_id`; employees are assigned via this table
- Admin can see all cages without an explicit assignment

---

### `fish_estimates`

Quarterly fish estimate with full approval workflow. Multiple revisions per (cage, year, quarter) are supported; when a new revision is submitted, all older pending revisions for that same (cage, year, quarter) are automatically marked as superseded.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `cage_id` | UUID FK → cages.id NOT NULL | |
| `year` | INTEGER NOT NULL | e.g., 2025 |
| `quarter` | INTEGER NOT NULL (1–4) | Q1=1, Q2=2, Q3=3, Q4=4 |
| `revision` | INTEGER NOT NULL DEFAULT 1 | Starts at 1; increments each time a new estimate is submitted for the same (cage, year, quarter) |
| `estimated_count` | INTEGER NOT NULL | Number of fish estimated alive |
| `notes` | TEXT NULL | Optional notes from submitter |
| `status` | ENUM: `pending`, `approved`, `rejected`, `superseded` DEFAULT `pending` | `superseded` is set exclusively by the system via Rule B; it cannot be set manually |
| `submitted_by` | UUID FK → users.id NOT NULL | Employee who submitted |
| `submitted_at` | TIMESTAMPTZ NOT NULL | |
| `reviewed_by` | UUID FK → users.id NULL | Officer or Admin who reviewed |
| `reviewed_at` | TIMESTAMPTZ NULL | |
| `review_comment` | TEXT NULL | Comment from reviewer |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Unique constraint:** `(cage_id, year, quarter, revision)` — one row per revision per cage per quarter

**Superseding rule (Rule B):** When a new estimate is submitted for a (cage, year, quarter) that already has one or more `pending` estimates, the server automatically marks all those older `pending` estimates as `superseded` before inserting the new row. Only the newly inserted revision remains in `pending` status. `approved` and `rejected` estimates are never changed.

**Notes:**
- `status` transitions: `pending` → `approved`, `rejected`, or `superseded`
- Once a record reaches `approved`, `rejected`, or `superseded`, it is never modified (audit integrity)
- The **current fish estimate** for a cage and quarter is the `approved` estimate with the highest `revision` number among all `approved` rows for that (cage, year, quarter)

---

### `fish_estimate_audit_log`

Immutable audit trail for every status change on a fish estimate.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `estimate_id` | UUID FK → fish_estimates.id NOT NULL | |
| `action` | ENUM: `submitted`, `approved`, `rejected`, `superseded` | |
| `actor_id` | UUID FK → users.id NOT NULL | User who performed the action |
| `actor_role` | TEXT NOT NULL | Role at time of action (snapshot) |
| `comment` | TEXT NULL | |
| `action_at` | TIMESTAMPTZ NOT NULL | |

**Notes:**
- Rows in this table are never updated or deleted
- The `actor_role` column is a snapshot so role changes don't retroactively alter history

---

### `water_quality_readings`

Each row is one water quality measurement session for a cage.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `cage_id` | UUID FK → cages.id NOT NULL | |
| `recorded_by` | UUID FK → users.id NOT NULL | |
| `recorded_at` | TIMESTAMPTZ NOT NULL | When the reading was taken |
| `dissolved_oxygen_mgl` | NUMERIC(5,2) NULL | Dissolved oxygen in mg/L |
| `ph` | NUMERIC(4,2) NULL | pH (0–14) |
| `temperature_celsius` | NUMERIC(4,1) NULL | Temperature in °C |
| `ammonia_mgl` | NUMERIC(5,3) NULL | Ammonia in mg/L |
| `notes` | TEXT NULL | Optional field notes |
| `created_at` | TIMESTAMPTZ | |

**Notes:**
- Parameters are nullable so employees can record partial readings
- Out-of-range detection is performed by comparing to `water_quality_thresholds` at query time (not stored)

---

### `water_quality_thresholds`

Admin-configured acceptable ranges per parameter per cage.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `cage_id` | UUID FK → cages.id NOT NULL | |
| `parameter` | ENUM: `dissolved_oxygen`, `ph`, `temperature`, `ammonia` | |
| `min_value` | NUMERIC(6,3) NULL | Null = no lower bound |
| `max_value` | NUMERIC(6,3) NULL | Null = no upper bound |
| `updated_by` | UUID FK → users.id NOT NULL | |
| `updated_at` | TIMESTAMPTZ | |

**Unique constraint:** `(cage_id, parameter)`

---

### `fish_measurement_sessions`

Groups individual fish measurements taken on the same day.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `cage_id` | UUID FK → cages.id NOT NULL | |
| `recorded_by` | UUID FK → users.id NOT NULL | |
| `recorded_at` | TIMESTAMPTZ NOT NULL | Date/time of measurement |
| `unit` | ENUM: `cm`, `in` DEFAULT `cm` | Unit for all entries in this session |
| `sample_count` | INTEGER | Computed: count of entries |
| `average_size` | NUMERIC(6,2) | Computed: mean of entries |
| `notes` | TEXT NULL | |
| `created_at` | TIMESTAMPTZ | |

---

### `fish_measurement_entries`

Individual fish size measurements within a session.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `session_id` | UUID FK → fish_measurement_sessions.id NOT NULL | |
| `value` | NUMERIC(6,2) NOT NULL | Size in the session's unit |
| `sort_order` | INTEGER NULL | Optional ordering within session |

---

### `daily_logs`

Operational log entries per cage.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `cage_id` | UUID FK → cages.id NOT NULL | |
| `log_type` | ENUM: `feeding`, `maintenance`, `observation` | |
| `notes` | TEXT NOT NULL | Description of the activity |
| `logged_by` | UUID FK → users.id NOT NULL | |
| `logged_at` | TIMESTAMPTZ NOT NULL | When the activity occurred |
| `created_at` | TIMESTAMPTZ | |

---

### `incidents`

Issues or problems reported at a cage.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `cage_id` | UUID FK → cages.id NOT NULL | |
| `title` | TEXT NOT NULL | Short summary |
| `description` | TEXT NOT NULL | Full description |
| `severity` | ENUM: `low`, `medium`, `high` | |
| `status` | ENUM: `open`, `resolved` DEFAULT `open` | |
| `reported_by` | UUID FK → users.id NOT NULL | |
| `reported_at` | TIMESTAMPTZ NOT NULL | |
| `resolved_by` | UUID FK → users.id NULL | |
| `resolved_at` | TIMESTAMPTZ NULL | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `incident_comments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `incident_id` | UUID FK → incidents.id NOT NULL | |
| `comment_text` | TEXT NOT NULL | |
| `commented_by` | UUID FK → users.id NOT NULL | |
| `commented_at` | TIMESTAMPTZ NOT NULL | |
| `created_at` | TIMESTAMPTZ | |

---

### `tasks`

Work items assigned to employees.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `cage_id` | UUID FK → cages.id NOT NULL | |
| `title` | TEXT NOT NULL | |
| `description` | TEXT NULL | |
| `assigned_to` | UUID FK → users.id NULL | Employee assigned |
| `due_date` | DATE NULL | |
| `status` | ENUM: `todo`, `in_progress`, `done` DEFAULT `todo` | |
| `created_by` | UUID FK → users.id NOT NULL | Officer or Admin |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### `task_comments`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `task_id` | UUID FK → tasks.id NOT NULL | |
| `comment_text` | TEXT NOT NULL | |
| `commented_by` | UUID FK → users.id NOT NULL | |
| `commented_at` | TIMESTAMPTZ NOT NULL | |
| `created_at` | TIMESTAMPTZ | |

---

### `revenue_entries` *(V2 — Financial Module)*

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `entry_date` | DATE NOT NULL | |
| `amount` | NUMERIC(12,2) NOT NULL | Philippine Pesos |
| `description` | TEXT NULL | |
| `type` | ENUM: `harvest_sale`, `other` | |
| `recorded_by` | UUID FK → users.id NOT NULL | |
| `created_at` | TIMESTAMPTZ | |

---

### `expense_entries` *(V2 — Financial Module)*

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `entry_date` | DATE NOT NULL | |
| `amount` | NUMERIC(12,2) NOT NULL | Philippine Pesos |
| `description` | TEXT NULL | |
| `category` | ENUM: `feed`, `labor`, `fingerlings`, `maintenance`, `equipment`, `other` | |
| `recorded_by` | UUID FK → users.id NOT NULL | |
| `created_at` | TIMESTAMPTZ | |

---

## Key Design Decisions

### 1. Immutable Audit Trail
The `fish_estimate_audit_log` table is append-only. No UPDATE or DELETE is permitted on it (enforced at the database level via a trigger or RLS policy). This ensures the owner always has a trustworthy record of who submitted and who approved each fish estimate.

### 2. Soft Deletes
All main entities use a `deleted_at` timestamp instead of physical deletion. This preserves referential integrity and allows recovery of accidentally "deleted" data.

### 3. Computed vs Stored Aggregates
- `average_size` and `sample_count` on `fish_measurement_sessions` are computed on insert/update (via a trigger or application logic) for query performance.
- All other aggregates (total fish, overdue task count, etc.) are computed at query time.

### 4. Unit Flexibility
Fish measurements store the unit alongside the session (cm or in). The UI converts for display; the stored value is always the raw input.

### 5. Revision-Based Resubmission
Each fish estimate submission for the same (cage, year, quarter) receives an incrementing `revision` number (1, 2, 3…). The unique constraint `(cage_id, year, quarter, revision)` allows multiple rows per quarter while preventing exact duplicates. When a new revision is submitted, all older `pending` revisions for that same (cage, year, quarter) are automatically marked `superseded` (Rule B). This preserves the full submission history for auditing while keeping exactly one active `pending` estimate at any time.

> The dashboard uses the `approved` estimate with the highest `revision` as the current fish estimate for each (cage, year, quarter).
