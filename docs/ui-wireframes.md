# Fish Cage Dashboard — UI Wireframes (Mobile-First, Text Format)

> All wireframes are designed for a **375px wide** viewport (standard Android).
> Desktop layouts adapt these using a sidebar nav and wider content columns.
> `[ ]` = button or tappable element. `[___]` = input field. `(•)` = selected radio. `( )` = unselected radio.

---

## Navigation Structure

```
├── Login
├── Dashboard (Admin only)
├── Cage List (Employee, Officer)
│   └── Cage Detail
│       ├── Tab: Overview
│       ├── Tab: Fish Estimate
│       ├── Tab: Water Quality
│       ├── Tab: Measurements
│       ├── Tab: Daily Log
│       ├── Tab: Incidents
│       └── Tab: Tasks
├── Admin
│   ├── User Management
│   └── Financials (V2)
└── Profile / Settings
```

---

## Screen 1 — Login

```
┌─────────────────────────────┐
│                             │
│   🐟 Fish Cage Dashboard    │
│                             │
│   Laguna Lake Operations    │
│                             │
│ ─────────────────────────── │
│                             │
│  Email                      │
│  [________________________] │
│                             │
│  Password                   │
│  [________________________] │
│                             │
│  [      Log In             ]│
│                             │
│  Forgot password?           │
│                             │
└─────────────────────────────┘
```

**Behavior:**
- Admin → redirected to Dashboard
- Officer/Employee → redirected to Cage List
- Wrong credentials → inline error "Incorrect email or password."

---

## Screen 2 — Owner Dashboard

```
┌─────────────────────────────┐
│ ≡  Dashboard           🔔  │
├─────────────────────────────┤
│                             │
│ Total Fish (All Cages)      │
│ ╔═══════════════════════╗   │
│ ║   52,000 estimated    ║   │
│ ║   Q2 2025 (approved)  ║   │
│ ╚═══════════════════════╝   │
│                             │
│ ── Cage Status ──           │
│                             │
│ ┌───────────────────────┐   │
│ │ 🟢 Cage 1             │   │
│ │ Fish: 13,000 (Q2)     │   │
│ │ Water: Normal ✅       │   │
│ │ Incidents: 0 open     │   │
│ │ Tasks: 0 overdue      │   │
│ │ Last log: 2h ago      │   │
│ │             [View >]  │   │
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │ 🔴 Cage 2             │   │
│ │ Fish: 14,200 (Q2)     │   │
│ │ Water: ⚠️ pH high     │   │
│ │ Incidents: 1 open     │   │
│ │ Tasks: 2 overdue      │   │
│ │ Last log: 1d ago      │   │
│ │             [View >]  │   │
│ └───────────────────────┘   │
│                             │
│ (... more cages ...)        │
│                             │
│ ── Quarterly Estimates ──   │
│                             │
│ [Bar chart: Q1-Q4 per cage] │
│  Q1  Q2  Q3  Q4             │
│  ▓▓  ▓▓  ▓▓  ░░  Cage 1    │
│  ▓▓  ▓▓  ▓▓  ░░  Cage 2    │
│  ▓▓  ▓▓  ░░  ░░  Cage 3    │
│  ▓▓  ▓▓  ░░  ░░  Cage 4    │
│                             │
│ ── Open Incidents ──        │
│                             │
│ 🔴 Cage 2 · Fish die-off    │
│    Reported 2d ago          │
│    Severity: High   [View]  │
│                             │
│ ── Overdue Tasks ──         │
│                             │
│ Cage 3 · Fix north panel    │
│ Due: Jun 30 · Assigned: Ana │
│                  [View]     │
│                             │
└─────────────────────────────┘
```

---

## Screen 3 — Cage List (Employee / Officer)

```
┌─────────────────────────────┐
│ ≡  My Cages                │
├─────────────────────────────┤
│                             │
│ ┌───────────────────────┐   │
│ │ Cage 1                │   │
│ │ Officer: Pedro Reyes  │   │
│ │ 🟢 All systems normal │   │
│ │              [View >] │   │
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │ Cage 2                │   │
│ │ Officer: Pedro Reyes  │   │
│ │ ⚠️ pH out of range   │   │
│ │              [View >] │   │
│ └───────────────────────┘   │
│                             │
└─────────────────────────────┘
```

---

## Screen 4 — Cage Detail (Tabbed)

```
┌─────────────────────────────┐
│ ←  Cage 1                  │
│    Officer: Pedro Reyes     │
├─────────────────────────────┤
│ Ovrvw│Estmt│Water│Meas│Logs │
│ ─────│     │     │    │     │
├─────────────────────────────┤
│                             │
│ ── Overview Tab ──          │
│                             │
│ Fish Estimate               │
│ 13,000 · Q2 2025 · ✅ Appr. │
│                             │
│ Water Quality (latest)      │
│ DO: 6.8  pH: 7.2  Temp: 27° │
│ NH₃: 0.04 · Updated 3h ago  │
│                             │
│ Open Incidents: 0           │
│ Overdue Tasks: 1            │
│ Last Activity: 2h ago       │
│                             │
│ Assigned Employees:         │
│ • Ana Reyes                 │
│ • Mark Cruz                 │
│                             │
└─────────────────────────────┘
```

---

## Screen 5 — Fish Estimate Tab

```
┌─────────────────────────────┐
│ ←  Cage 1 · Fish Estimate  │
├─────────────────────────────┤
│                             │
│ ── Current Quarter ──       │
│ Q3 2025 · Jul–Sep           │
│                             │
│ Status: No submission yet   │
│                             │
│ [ + Submit New Estimate ]   │
│                             │
│ ── History ──               │
│                             │
│ Q2 2025                     │
│ 13,000 fish · ✅ Approved    │
│ Submitted: Ana · Jul 1      │
│ Approved: Pedro · Jul 2     │
│ Comment: "Looks accurate"   │
│                 [Details >] │
│                             │
│ Q1 2025                     │
│ 11,500 fish · ✅ Approved    │
│ Submitted: Ana · Apr 3      │
│ Approved: Pedro · Apr 5     │
│                 [Details >] │
│                             │
└─────────────────────────────┘
```

**Submit Estimate Form (bottom sheet / new screen):**

```
┌─────────────────────────────┐
│ ←  Submit Fish Estimate    │
│    Cage 1 · Q3 2025         │
├─────────────────────────────┤
│                             │
│ Estimated Fish Count        │
│ [________________________] │
│  Enter a whole number       │
│                             │
│ Notes (optional)            │
│ [________________________] │
│ [                          ]│
│                             │
│ [     Submit for Review    ]│
│                             │
│ ⚠️ Once submitted, your    │
│ officer will review this    │
│ estimate before it appears  │
│ on the dashboard.           │
│                             │
└─────────────────────────────┘
```

**Estimate Review Screen (Officer/Admin):**

```
┌─────────────────────────────┐
│ ←  Review Fish Estimate    │
│    Cage 1 · Q3 2025         │
├─────────────────────────────┤
│                             │
│ Estimated Count: 13,500     │
│ Submitted by: Ana Reyes     │
│ Submitted at: Jul 1, 8:03am │
│                             │
│ Notes:                      │
│ "Sample count from net test │
│  on July 15."               │
│                             │
│ Your Comment (optional)     │
│ [________________________] │
│                             │
│ [✅ Approve] [❌ Reject]    │
│                             │
└─────────────────────────────┘
```

---

## Screen 6 — Water Quality Tab

```
┌─────────────────────────────┐
│ ←  Cage 1 · Water Quality  │
├─────────────────────────────┤
│                             │
│ [ + Add Reading ]           │
│                             │
│ ── Latest Reading ──        │
│ Jun 28, 7:00am · Ana        │
│                             │
│  DO:   6.8 mg/L  ✅          │
│  pH:   9.1       ⚠️ HIGH    │
│  Temp: 28°C      ✅          │
│  NH₃:  0.05 mg/L ✅          │
│                             │
│ ── History ──               │
│                             │
│ Jun 27 · Mark               │
│ DO:6.5 pH:7.3 T:27 NH₃:0.04 │
│                             │
│ Jun 26 · Ana                │
│ DO:6.2 pH:7.0 T:29 NH₃:0.06 │
│                    [More ↓] │
│                             │
└─────────────────────────────┘
```

**Add Water Quality Reading (bottom sheet):**

```
┌─────────────────────────────┐
│ ←  Add Water Quality       │
├─────────────────────────────┤
│                             │
│ Date & Time                 │
│ [Jun 28, 2025 ▼] [07:00 ▼] │
│                             │
│ Dissolved Oxygen (mg/L)     │
│ [________________________] │
│                             │
│ pH                          │
│ [________________________] │
│                             │
│ Temperature (°C)            │
│ [________________________] │
│                             │
│ Ammonia (mg/L)              │
│ [________________________] │
│                             │
│ Notes                       │
│ [________________________] │
│                             │
│ [      Save Reading        ]│
│                             │
└─────────────────────────────┘
```

---

## Screen 7 — Fish Measurements Tab

```
┌─────────────────────────────┐
│ ←  Cage 1 · Measurements   │
├─────────────────────────────┤
│                             │
│ [ + Record Measurements ]   │
│                             │
│ ── Growth Chart ──          │
│ [Line chart: avg cm / date] │
│  Jun ──●─────●──────●       │
│  May ─────●──────────       │
│  18 ─── 19 ─── 20 ─── cm   │
│                             │
│ ── Sessions ──              │
│                             │
│ Jun 15 · Ana · 20 fish      │
│ Avg: 18.4 cm                │
│                 [Details >] │
│                             │
│ May 15 · Ana · 20 fish      │
│ Avg: 16.2 cm                │
│                 [Details >] │
│                             │
└─────────────────────────────┘
```

**Add Measurements Form:**

```
┌─────────────────────────────┐
│ ←  Record Measurements     │
│    Cage 1                   │
├─────────────────────────────┤
│                             │
│ Date                        │
│ [Jun 15, 2025 ▼]            │
│                             │
│ Unit  (•) cm   ( ) inches   │
│                             │
│ Fish Sizes (one per line    │
│ or comma-separated)         │
│ [________________________] │
│ [                          ]│
│ [17.5, 18.0, 19.2, 18.8,  ]│
│ [17.0 ...                  ]│
│                             │
│ Sample count: 5             │
│ Average: 18.1 cm            │
│                             │
│ Notes                       │
│ [________________________] │
│                             │
│ [      Save Session        ]│
│                             │
└─────────────────────────────┘
```

---

## Screen 8 — Daily Log Tab

```
┌─────────────────────────────┐
│ ←  Cage 1 · Daily Log      │
├─────────────────────────────┤
│                             │
│ [ + Add Log Entry ]         │
│                             │
│ ── Jun 28, 2025 ──          │
│                             │
│ 🍚 7:05am · Ana             │
│ Feeding                     │
│ Fed 25kg pellets. Fish      │
│ feeding actively.           │
│                             │
│ 🔧 9:30am · Mark            │
│ Maintenance                 │
│ Replaced broken float on    │
│ south corner.               │
│                             │
│ ── Jun 27, 2025 ──          │
│                             │
│ 👁 6:45am · Ana             │
│ Observation                 │
│ Water color slightly green. │
│ Will monitor.               │
│                             │
│ 🍚 7:10am · Ana             │
│ Feeding                     │
│ Fed 25kg pellets.           │
│                             │
└─────────────────────────────┘
```

**Add Log Entry (bottom sheet):**

```
┌─────────────────────────────┐
│ ←  Add Log Entry           │
├─────────────────────────────┤
│                             │
│ Type                        │
│ (•) 🍚 Feeding              │
│ ( ) 🔧 Maintenance          │
│ ( ) 👁 Observation          │
│                             │
│ Date & Time                 │
│ [Today ▼] [07:05 ▼]         │
│                             │
│ Notes                       │
│ [________________________] │
│ [                          ]│
│ [                          ]│
│                             │
│ [      Save Entry          ]│
│                             │
└─────────────────────────────┘
```

---

## Screen 9 — Incidents Tab

```
┌─────────────────────────────┐
│ ←  Cage 1 · Incidents      │
├─────────────────────────────┤
│                             │
│ [ + Report Incident ]       │
│                             │
│ Filter: [All ▼] [Open ▼]    │
│                             │
│ ┌───────────────────────┐   │
│ │ 🔴 HIGH · OPEN        │   │
│ │ Fish die-off observed  │   │
│ │ Jun 25 · Ana          │   │
│ │ 3 comments            │   │
│ │              [View >] │   │
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │ 🟡 MEDIUM · RESOLVED  │   │
│ │ Net panel tear        │   │
│ │ Jun 10 · Mark         │   │
│ │ 1 comment             │   │
│ │              [View >] │   │
│ └───────────────────────┘   │
│                             │
└─────────────────────────────┘
```

---

## Screen 10 — Tasks Tab

```
┌─────────────────────────────┐
│ ←  Cage 1 · Tasks          │
├─────────────────────────────┤
│                             │
│ [+ Create Task] (Officer+) │
│                             │
│ Filter: [All ▼] [My Tasks ▼]│
│                             │
│ ┌───────────────────────┐   │
│ │ ⏰ OVERDUE            │   │
│ │ Replace north panel   │   │
│ │ Due: Jun 30 · Ana     │   │
│ │ Status: To Do         │   │
│ │ [Mark In Progress]    │   │
│ │              [View >] │   │
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │ 🔵 IN PROGRESS        │   │
│ │ Clean cage net        │   │
│ │ Due: Jul 5 · Mark     │   │
│ │     [Mark Done]       │   │
│ │              [View >] │   │
│ └───────────────────────┘   │
│                             │
│ ┌───────────────────────┐   │
│ │ ✅ DONE               │   │
│ │ Record water quality  │   │
│ │ Due: Jun 28 · Ana     │   │
│ │              [View >] │   │
│ └───────────────────────┘   │
│                             │
└─────────────────────────────┘
```

---

## Screen 11 — Admin: User Management

```
┌─────────────────────────────┐
│ ←  Admin · Users           │
├─────────────────────────────┤
│                             │
│ [ + Invite User ]           │
│                             │
│ Search: [________________]  │
│                             │
│ ── Officers ──              │
│                             │
│ Pedro Reyes                 │
│ pedro@example.com · Officer │
│ Cages: 1, 2        [Edit >] │
│                             │
│ ── Employees ──             │
│                             │
│ Ana Reyes                   │
│ ana@example.com · Employee  │
│ Cages: 1           [Edit >] │
│                             │
│ Mark Cruz                   │
│ mark@example.com · Employee │
│ Cages: 1, 3        [Edit >] │
│                             │
│ ── Inactive ──              │
│                             │
│ Juan Santos (deactivated)   │
│                    [Edit >] │
│                             │
└─────────────────────────────┘
```

---

## Responsive / Desktop Adaptation Notes

On screens wider than **768px**:
- A **sidebar nav** replaces the hamburger menu (≡)
- The dashboard cage cards display in a **2-column grid**
- The cage detail tabs become a **side tab panel** (tabs on left, content on right)
- Charts expand to fill available width
- Forms use a centered **max-width: 640px** container

**Mobile-first CSS breakpoints:**
```
Default:   0px      → single column, stacked layout
sm:        640px    → slightly wider inputs
md:        768px    → sidebar nav, 2-col grids
lg:        1024px   → wider dashboard, larger charts
```
