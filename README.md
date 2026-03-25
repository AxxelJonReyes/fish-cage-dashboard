# Fish Cage Dashboard

A mobile-first web application for managing tilapia fish cage operations on Laguna Lake. Replaces unstructured Messenger communication with structured logs, tasks, and a real-time owner dashboard.

---

## Product Overview

The Fish Cage Dashboard centralizes all operations for a tilapia fish cage business:

- **Structured communication** — replace Messenger threads with timestamped logs, tasks, and incident reports
- **Owner dashboard** — at-a-glance view of all cages: fish estimates, water quality, incidents, and tasks
- **Role-based access** — every action is tied to a named user and role; nothing is anonymous
- **Audit trail** — all data changes (especially fish estimates) are logged with who submitted and who approved

---

## Roles

| Role | Description |
|------|-------------|
| **Admin / Owner** | Full access. Approves fish estimates. Views financials. Manages users. |
| **Officer** | Manages one or more cages. Can approve fish estimates for their assigned cages. Views all cage data. |
| **Employee** | Can submit water quality readings, fish measurements, daily logs, and fish estimate submissions for their assigned cages. |

---

## Key Constraints

### Quarterly Fish Estimate
- Fish "estimated alive" is **not** measured daily.
- It is measured **4 times per year** (once per quarter: Q1–Q4).
- Each estimate is **one number per cage** for the entire quarter — no daily breakdown.
- Submission requires **approval** (Officer or Admin) before it appears on the dashboard.
- All submissions and approvals are recorded in an **audit trail**.

### Water Quality
- Entered **manually** by employees.
- Thresholds are configured by the Admin; out-of-range values are flagged automatically.

### Fish Size Measurements
- Employees record sample measurements in **cm or inches**.
- Used to track growth trends over time (charts).

---

## MVP vs V2

### MVP (Phase 1 — Build First)
- ✅ Owner dashboard (fish estimates, water quality, recent incidents, overdue tasks)
- ✅ Per-cage pages (assigned staff, quarterly fish estimate with approval, water quality, daily logs, incidents, tasks)
- ✅ Fish measurement tracking + growth chart
- ✅ Role-based access control (Admin, Officer, Employee)
- ✅ Audit trail for fish estimate submissions and approvals
- ✅ Mobile-first responsive UI

### V2 (Future Enhancements)
- 💰 Financial module (revenue, expenses, profit chart, CSV export)
- 📊 Advanced analytics and trend forecasting
- 📱 Native mobile app (iOS/Android)
- 🔔 Push notifications and email alerts
- 🌐 Multi-language support (Filipino/English)
- 📤 Export reports to PDF

---

## Documentation

| File | Description |
|------|-------------|
| [docs/plan.md](docs/plan.md) | Full project plan: user stories, screens, data model, API, permissions, milestones, risks |
| [docs/requirements.md](docs/requirements.md) | Concise MVP requirements checklist |
| [docs/data-model.md](docs/data-model.md) | Database schema with approval workflow |
| [docs/api.md](docs/api.md) | Draft REST API endpoints |
| [docs/ui-wireframes.md](docs/ui-wireframes.md) | Text wireframes (mobile-first) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 15](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Database / Auth | [Supabase](https://supabase.com) (PostgreSQL + Auth + RLS) |
| Linting | ESLint (`eslint-config-next`) |
| Formatting | Prettier + `prettier-plugin-tailwindcss` |

See [docs/plan.md](docs/plan.md#tech-stack-options) for full tech stack rationale.

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Open .env.local and fill in your Supabase project URL and keys:
#   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
#   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>   # server-only, never expose in client code

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |

---

Contributions and feedback welcome — please open an issue using the provided templates in [`.github/ISSUE_TEMPLATE/`](.github/ISSUE_TEMPLATE/).

---

## Authentication Setup

The app uses **Supabase Auth** (email + password). There is no public sign-up page — administrators create users from the Supabase Dashboard.

### Creating Users

1. Go to your Supabase project → **Authentication → Users → Add user**.
2. Enter the user's email and a temporary password.
3. The user can log in immediately at `/login`.

### Profiles Table & Trigger

Each user must have a row in `public.profiles` with at least a `role` column (`admin`, `owner`, or `employee`). Add a trigger in Supabase so a profile row is created automatically on signup:

```sql
-- 1. Create the profiles table (if not already done)
create table if not exists public.profiles (
  id   uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'employee'
);

-- 2. Enable RLS and allow users to read their own profile
alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- 3. Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

### Roles

| Role | Admin nav link visible |
|------|------------------------|
| `admin` | ✅ Yes |
| `owner` | ✅ Yes |
| `employee` | ❌ No |

To promote a user to admin/owner, update their `profiles.role` directly in Supabase → **Table Editor → profiles**.