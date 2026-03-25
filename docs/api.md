# Fish Cage Dashboard — Draft REST API

> **Base URL:** `/api/v1/`
> **Auth:** All endpoints (except `/auth/login`) require a valid session token (Bearer JWT from Supabase Auth).
> **Format:** JSON request and response bodies.
> **Errors:** Standard HTTP status codes. Error body: `{ "error": "message" }`

---

## Conventions

| Symbol | Meaning |
|--------|---------|
| 🔓 | Public (no auth required) |
| 👤 | Authenticated users |
| 🟢 | Employee or above |
| 🔵 | Officer or above |
| 🔴 | Admin only |
| `{id}` | UUID path parameter |

---

## Authentication

### `POST /auth/login` 🔓
Log in with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

**Response `200`:**
```json
{
  "access_token": "...",
  "user": {
    "id": "uuid",
    "full_name": "Maria Santos",
    "role": "employee",
    "email": "user@example.com"
  }
}
```

---

### `POST /auth/logout` 👤
Invalidate the current session.

**Response `204`:** No content.

---

### `POST /auth/password-reset` 🔓
Request a password reset email.

**Request:** `{ "email": "user@example.com" }`
**Response `200`:** `{ "message": "Reset email sent if account exists." }`

---

## Users

### `GET /users` 🔴
List all users (admin only).

**Query params:** `?role=employee&is_active=true`

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "email": "...",
    "full_name": "...",
    "role": "employee",
    "is_active": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

### `POST /users` 🔴
Create a new user (admin only). Sends an invitation email.

**Request:**
```json
{
  "email": "newuser@example.com",
  "full_name": "Juan dela Cruz",
  "role": "employee"
}
```

**Response `201`:** Created user object.

---

### `GET /users/{id}` 🔴
Get a single user.

**Response `200`:** User object.

---

### `PATCH /users/{id}` 🔴
Update a user (role, full_name, is_active).

**Request:** Partial user fields.
**Response `200`:** Updated user object.

---

## Cages

### `GET /cages` 👤
List cages the current user has access to (employees/officers see assigned cages; admin sees all).

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "name": "Cage 1",
    "location_notes": "North side of lake",
    "officer": { "id": "uuid", "full_name": "Pedro Reyes" },
    "is_active": true
  }
]
```

---

### `POST /cages` 🔴
Create a new cage.

**Request:**
```json
{
  "name": "Cage 5",
  "location_notes": "...",
  "officer_id": "uuid"
}
```

**Response `201`:** Created cage object.

---

### `GET /cages/{id}` 👤
Get cage detail including assigned users.

**Response `200`:**
```json
{
  "id": "uuid",
  "name": "Cage 1",
  "location_notes": "...",
  "officer": { "id": "uuid", "full_name": "..." },
  "employees": [{ "id": "uuid", "full_name": "..." }],
  "is_active": true
}
```

---

### `PATCH /cages/{id}` 🔴
Update cage details.

---

### `POST /cages/{id}/assignments` 🔴
Assign a user to a cage.

**Request:** `{ "user_id": "uuid" }`
**Response `201`:** Assignment object.

---

### `DELETE /cages/{id}/assignments/{user_id}` 🔴
Remove a user from a cage assignment.

**Response `204`:** No content.

---

## Fish Estimates

### `GET /cages/{id}/fish-estimates` 🔵
List all fish estimates for a cage (most recent first).

**Query params:** `?year=2025&quarter=2&status=approved`

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "cage_id": "uuid",
    "year": 2025,
    "quarter": 2,
    "estimated_count": 12500,
    "status": "approved",
    "submitted_by": { "id": "uuid", "full_name": "..." },
    "submitted_at": "2025-07-01T08:00:00Z",
    "reviewed_by": { "id": "uuid", "full_name": "..." },
    "reviewed_at": "2025-07-02T10:00:00Z",
    "review_comment": "Looks accurate."
  }
]
```

---

### `POST /cages/{id}/fish-estimates` 🟢
Submit a new quarterly fish estimate.

**Request:**
```json
{
  "year": 2025,
  "quarter": 3,
  "estimated_count": 13000,
  "notes": "Sample count from net test on July 15."
}
```

**Response `201`:** Created estimate object (status = `pending`).
**Error `409`:** If an estimate already exists for (cage, year, quarter).

---

### `GET /cages/{id}/fish-estimates/{estimate_id}` 🔵
Get a single estimate with its full audit trail.

**Response `200`:**
```json
{
  "id": "uuid",
  "...": "...",
  "audit_log": [
    {
      "action": "submitted",
      "actor": { "id": "uuid", "full_name": "Ana" },
      "actor_role": "employee",
      "comment": null,
      "action_at": "2025-07-01T08:00:00Z"
    },
    {
      "action": "approved",
      "actor": { "id": "uuid", "full_name": "Pedro" },
      "actor_role": "officer",
      "comment": "Verified on-site.",
      "action_at": "2025-07-02T10:00:00Z"
    }
  ]
}
```

---

### `POST /cages/{id}/fish-estimates/{estimate_id}/approve` 🔵
Approve a pending estimate. Only the cage's officer or an admin may call this.

**Request:** `{ "comment": "Verified." }` *(comment optional)*
**Response `200`:** Updated estimate object (status = `approved`).
**Error `403`:** If caller is an employee or is not the assigned officer.
**Error `409`:** If status is not `pending`.

---

### `POST /cages/{id}/fish-estimates/{estimate_id}/reject` 🔵
Reject a pending estimate.

**Request:** `{ "comment": "Count seems too high — please recount." }`
**Response `200`:** Updated estimate object (status = `rejected`).

---

### `GET /dashboard/fish-estimates/latest` 🔴
Returns the latest approved estimate per cage and the total. (Admin dashboard widget.)

**Response `200`:**
```json
{
  "total_estimated": 52000,
  "cages": [
    {
      "cage_id": "uuid",
      "cage_name": "Cage 1",
      "year": 2025,
      "quarter": 2,
      "estimated_count": 13000
    }
  ]
}
```

---

## Water Quality

### `GET /cages/{id}/water-quality` 👤
List water quality readings for a cage.

**Query params:** `?limit=50&before=2025-07-01`

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "recorded_at": "2025-06-28T07:00:00Z",
    "recorded_by": { "id": "uuid", "full_name": "Ana" },
    "dissolved_oxygen_mgl": 6.5,
    "ph": 7.2,
    "temperature_celsius": 28.0,
    "ammonia_mgl": 0.05,
    "flags": ["ph_out_of_range"]
  }
]
```

---

### `POST /cages/{id}/water-quality` 🟢
Submit a new water quality reading.

**Request:**
```json
{
  "recorded_at": "2025-06-28T07:00:00Z",
  "dissolved_oxygen_mgl": 6.5,
  "ph": 9.1,
  "temperature_celsius": 28.0,
  "ammonia_mgl": 0.05,
  "notes": "Noticed algae bloom near cage."
}
```

**Response `201`:** Created reading with `flags` array populated.

---

### `GET /cages/{id}/water-quality/thresholds` 🔵
Get configured thresholds for a cage.

**Response `200`:**
```json
[
  { "parameter": "ph", "min_value": 6.5, "max_value": 8.5 },
  { "parameter": "dissolved_oxygen", "min_value": 5.0, "max_value": null }
]
```

---

### `PUT /cages/{id}/water-quality/thresholds` 🔵
Create or update thresholds for a cage (upsert).

**Request:**
```json
[
  { "parameter": "ph", "min_value": 6.5, "max_value": 8.5 },
  { "parameter": "temperature", "min_value": 25.0, "max_value": 32.0 }
]
```

**Response `200`:** Updated threshold list.

---

## Fish Measurements

### `GET /cages/{id}/measurements` 👤
List fish measurement sessions for a cage.

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "recorded_at": "2025-06-15T08:00:00Z",
    "recorded_by": { "id": "uuid", "full_name": "..." },
    "unit": "cm",
    "sample_count": 20,
    "average_size": 18.4
  }
]
```

---

### `POST /cages/{id}/measurements` 🟢
Submit a new measurement session with individual entries.

**Request:**
```json
{
  "recorded_at": "2025-06-15T08:00:00Z",
  "unit": "cm",
  "measurements": [17.5, 18.0, 19.2, 18.8, 17.0],
  "notes": "Random net sample."
}
```

**Response `201`:** Session object with computed `average_size` and `sample_count`.

---

### `GET /cages/{id}/measurements/{session_id}` 👤
Get a session with all individual entries.

---

## Daily Logs

### `GET /cages/{id}/logs` 👤
List daily log entries (newest first).

**Query params:** `?log_type=feeding&limit=30`

**Response `200`:**
```json
[
  {
    "id": "uuid",
    "log_type": "feeding",
    "notes": "Fed 25kg pellets at 7am and 5pm.",
    "logged_by": { "id": "uuid", "full_name": "Ana" },
    "logged_at": "2025-06-28T07:05:00Z"
  }
]
```

---

### `POST /cages/{id}/logs` 🟢
Submit a new daily log entry.

**Request:**
```json
{
  "log_type": "feeding",
  "notes": "Fed 25kg pellets at 7am and 5pm.",
  "logged_at": "2025-06-28T07:05:00Z"
}
```

**Response `201`:** Created log entry.

---

## Incidents

### `GET /cages/{id}/incidents` 👤
List incidents for a cage.

**Query params:** `?status=open`

---

### `POST /cages/{id}/incidents` 🟢
Report a new incident.

**Request:**
```json
{
  "title": "Fish die-off observed",
  "description": "Found ~50 dead fish near north net panel this morning.",
  "severity": "high"
}
```

**Response `201`:** Created incident (status = `open`).

---

### `GET /cages/{id}/incidents/{incident_id}` 👤
Get incident detail with all comments.

---

### `PATCH /cages/{id}/incidents/{incident_id}` 🔵
Update incident status (e.g., mark as resolved). Officers and Admin only.

**Request:** `{ "status": "resolved" }`
**Response `200`:** Updated incident.

---

### `POST /cages/{id}/incidents/{incident_id}/comments` 👤
Add a comment to an incident.

**Request:** `{ "comment_text": "Water quality checked — DO was low at 3.2 mg/L." }`
**Response `201`:** Comment object.

---

## Tasks

### `GET /cages/{id}/tasks` 👤
List tasks for a cage.

**Query params:** `?status=todo&assigned_to={user_id}&overdue=true`

---

### `POST /cages/{id}/tasks` 🔵
Create a new task. Officers and Admin only.

**Request:**
```json
{
  "title": "Replace north net panel",
  "description": "Panel has a 10cm tear. Replace before next feeding.",
  "assigned_to": "uuid",
  "due_date": "2025-07-05"
}
```

**Response `201`:** Created task (status = `todo`).

---

### `GET /cages/{id}/tasks/{task_id}` 👤
Get task detail with comments.

---

### `PATCH /cages/{id}/tasks/{task_id}` 🟢
Update a task. Employees may only update `status` on their own tasks. Officers/Admin may update any field.

**Request:** `{ "status": "done" }`
**Response `200`:** Updated task.

---

### `POST /cages/{id}/tasks/{task_id}/comments` 👤
Add a comment to a task.

**Request:** `{ "comment_text": "Parts ordered, will install Thursday." }`
**Response `201`:** Comment object.

---

## Dashboard (Admin)

### `GET /dashboard/summary` 🔴
Returns all data needed for the owner dashboard in a single call (minimizes round trips).

**Response `200`:**
```json
{
  "fish_estimates": {
    "total_estimated": 52000,
    "cages": [{ "cage_id": "...", "cage_name": "...", "estimated_count": 13000, "year": 2025, "quarter": 2 }]
  },
  "water_quality": [
    { "cage_id": "...", "cage_name": "...", "latest_reading_at": "...", "has_alerts": true, "alert_params": ["ph"] }
  ],
  "recent_incidents": [
    { "id": "...", "cage_name": "...", "title": "...", "severity": "high", "reported_at": "..." }
  ],
  "overdue_tasks": [
    { "id": "...", "cage_name": "...", "title": "...", "due_date": "...", "assigned_to": "..." }
  ],
  "cage_last_updated": [
    { "cage_id": "...", "cage_name": "...", "last_log_at": "..." }
  ]
}
```

---

## Financial *(V2 — Not in MVP)*

### `GET /finance/revenue` 🔴
### `POST /finance/revenue` 🔴
### `PATCH /finance/revenue/{id}` 🔴
### `DELETE /finance/revenue/{id}` 🔴

### `GET /finance/expenses` 🔴
### `POST /finance/expenses` 🔴
### `PATCH /finance/expenses/{id}` 🔴
### `DELETE /finance/expenses/{id}` 🔴

### `GET /finance/summary` 🔴
Monthly profit summary (year, month, revenue, expenses, profit).

### `GET /finance/export` 🔴
Download CSV of all revenue and expense entries.

---

## HTTP Status Codes Used

| Code | Meaning |
|------|---------|
| 200 | OK — successful GET or PATCH |
| 201 | Created — successful POST |
| 204 | No Content — successful DELETE |
| 400 | Bad Request — invalid input |
| 401 | Unauthorized — not logged in |
| 403 | Forbidden — logged in but not permitted |
| 404 | Not Found — resource doesn't exist |
| 409 | Conflict — business rule violation (e.g., duplicate estimate) |
| 500 | Internal Server Error |
