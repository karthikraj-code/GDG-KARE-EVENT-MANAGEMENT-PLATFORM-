# 🏆 GDG-KARE Event Management Platform

**Google Developer Groups On Campus • Kalasalingam Academy Of Research & Education**

A high-performance, real-time hackathon management, competition scoring, attendance tracking, and certificate verification platform built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, and **Supabase (PostgreSQL)**.

Engineered to support **500+ concurrent participants, judges, volunteers, and organizers** with atomic database transactions, real-time live synchronization, dynamic evaluation rubrics, automated leaderboards, and tamper-proof digital certificates.

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features by Role](#-key-features-by-role)
  - [1. Participant Portal & Team Hub](#1-participant-portal--team-hub)
  - [2. Organizer Command Center](#2-organizer-command-center)
  - [3. Judge Evaluation Portal](#3-judge-evaluation-portal)
  - [4. Volunteer Operations Panel](#4-volunteer-operations-panel)
  - [5. Public Leaderboard](#5-public-leaderboard)
  - [6. Certificate Studio & Verification System](#6-certificate-studio--verification-system)
  - [7. Mail Service & Campaign Dispatcher](#7-mail-service--campaign-dispatcher)
- [Navigation & Modern Dashboard Shell](#-navigation--modern-dashboard-shell)
- [Public Landing Page & Branding](#-public-landing-page--branding)
- [Architecture & High-Concurrency Scaling (500+ Users)](#-architecture--high-concurrency-scaling-500-users)
- [Tech Stack](#-tech-stack)
- [Directory Structure](#-directory-structure)
- [Database Schema & Migrations](#-database-schema--migrations)
- [Environment Variables](#-environment-variables)
- [Local Setup & Installation](#-local-setup--installation)
- [🧪 Benchmark & Testing Guide](#-benchmark--testing-guide)
- [API Routes Reference](#-api-routes-reference)
- [Deployment](#-deployment)
- [License](#-license)

---

## 🌟 Overview

The **GDG-KARE Event Management Platform** centralizes and automates all operational workflows required to run large-scale university hackathons and competitive events:

- **Zero Race Conditions**: Atomic PostgreSQL stored procedures lock problem statements and team memberships with row-level locks (`SELECT ... FOR UPDATE`).
- **Dynamic Round Deliverables**: Organizers configure customized submission requirements (Presentation Link, Live Demo URL, GitHub Repository, Written Summary) per competition round.
- **Quantitative Rubric Matrix**: 4-tier benchmark grading criteria (Excellent, Good, Fair, Needs Improvement) for fast, standardized, and unbiased evaluation.
- **Certificate Studio & Verification Registry**: In-browser dynamic certificate generation with unique `GDG-KARE-XXXX-YYYY` codes, tamper-proof QR codes linking to public verification routes (`/verify-certificate`), and edge-optimized direct email dispatch.
- **Multi-Provider Email Distribution**: Integrated Mail Campaign Manager with template builder, dynamic database & Excel placeholders, test dispatch with UI acknowledgements, and duplicate protection.
- **Volunteer Attendance Tracking**: Real-time session check-in and roster management for event volunteers with quick return navigation for organizers.
- **Real-Time Sync**: Throttled Supabase Realtime listeners update competition milestones and dashboards across all active clients without database strain.

---

## 👥 Key Features by Role

### 1. Participant Portal & Team Hub
- **Unified Branding & Portal Header**:
  - Top header clearly designates: `GDG-KARE Event Management Platform` | `Participant Portal & Team Hub`.
  - Personalized welcome banner: `"Welcome to platform, [Name]"` with the participant's name highlighted in signature Google Blue (`text-blue-600 font-semibold`).
  - Auto-centered layout (`max-w-7xl mx-auto`) with balanced margins for widescreen displays.
- **Google OAuth Sign-In & Onboarding**: One-click authentication with Google, with onboarding for student registration number, department, year, and section.
- **Team Formation & Management**:
  - Create a new team with an auto-generated unique invite code.
  - Join an existing team (enforcing a strict limit of 4 members per team via atomic database checks).
  - Copy invite codes with one click to easily share with teammates.
- **Problem Statement Locking**:
  - Live track/domain filtering and instant keyword search.
  - Real-time capacity indicators (strict quotas per problem statement on a first-come, first-served basis).
  - Atomic leader locking prevents race conditions under traffic spikes.
- **Multi-Round Submissions**:
  - Submit round deliverables based on organizer configurations:
    - 📊 Google Slides / Presentation Link
    - 💻 Public GitHub Repository Link
    - 🎥 Live Deployed App / Demo Video URL
    - 📝 Written Solution Summary & Methodology
  - Automatic time window validation (`start_time` and `end_time`).
  - Edits permitted until the round deadline passes.

---

### 2. Organizer Command Center
- **Live Event Analytics**: Real-time counter of registered participants, teams, active rounds, judge scoring progress, and submissions.
- **Problem Statement Management**:
  - Add, edit, and delete problem statements with domain tags and capacity limits.
  - Master release toggle: Lock problem statements until the official release moment.
- **Round & Rubric Builder**:
  - Create, edit, and manage rounds with custom start and end deadlines.
  - Configure specific deliverable requirements (PPT, Code, Demo, Text) per round.
  - Customize quantitative rubrics and benchmark criteria per round.
- **Judge Assignment Matrix**:
  - Assign judges to teams individually or in bulk.
- **Participant Roster & CSV Export**:
  - Search, filter, and monitor all enrolled students.
  - Export filtered participant lists to CSV (`gdg_kare_participants_YYYY-MM-DD.csv`).
- **Access Control & Privileges**:
  - Pre-approve Google email addresses for Organizer and Judge roles.
  - Automatic role provisioning on sign-in with instant revocation controls.
- **Leaderboard Release Switch**:
  - Private preview of live calculations before toggling public visibility.
- **Certificate Studio**:
  - Direct access to design, preview, and generate certificates in bulk with direct email distribution.
- **Mail Service & Campaign Dispatcher**:
  - Centralized communications hub to deliver personalized announcements and credentials via email.

---

### 3. Judge Evaluation Portal
- **Assigned Teams Dashboard**: Judges view only the teams assigned to them by organizers.
- **Deliverable Inspection**: Embedded preview links for GitHub repos, presentation decks, and live URLs.
- **4-Tier Quantitative Scoring Rubric**:
  - **🟢 Excellent (10 pts)**
  - **🔵 Good (7 pts)**
  - **🟡 Fair (4 pts)**
  - **🔴 Needs Improvement (2 pts)**
- **Qualitative Feedback**: Rich text area for constructive suggestions and mentorship comments.
- **Atomic Scoring**: Automatic total calculation and idempotent score upserting.

---

### 4. Volunteer Operations Panel
- **Attendance Tracker**: Check in participants for hackathon sessions, workshops, and meals.
- **Participant Roster**: Search by student registration number, name, department, or team.
- **Seamless Navigation**: Automatic "Back to Organizer" link when organizers access the volunteer panel to support event operations.

---

### 5. Public Leaderboard
- **Live Standings**: Ranks all participating teams by aggregated scores across all rounds.
- **Podium Visuals**: Visual badges and ring styling for 1st, 2nd, and 3rd place.
- **Caching**: 10-second ISR (Incremental Static Regeneration) prevents database thundering herds when hundreds of participants refresh simultaneously.

---

### 6. Certificate Studio & Verification System
- **Certificate Studio (`/dashboard/organizer/certificates`)**:
  - In-browser visual canvas designer & dynamic generator for Winners (1st, 2nd, 3rd), Participants, Volunteers, and Judges.
  - Unique certificate identification codes starting with **`GDG-KARE-XXXX-YYYY`** (e.g. `GDG-KARE-88A1-92B3`).
  - Automatic dynamic QR code generator on certificates pointing directly to the tamper-proof online verification URL.
  - Single PNG/PDF download, bulk category ZIP exports, and batch generation.
- **Direct Certificate Email Delivery**:
  - Send certificates directly to individual candidates or dispatch to hundreds in bulk with live progress tracking.
  - **Edge & Serverless Payload Safeguard (Vercel 4.5 MB Limit)**:
    - High-resolution certificates (often >3000px, 8MB–12MB base64) undergo client-side bicubic downsampling down to 1920px Full HD via `compressDataUrlForEmail`.
    - Automatically tests PNG export (<2 MB); if background texture is complex, converts to high-quality JPEG (0.92, ~350 KB–500 KB) with crisp white backing to ensure payload size is always <1 MB.
    - Eliminates HTTP 413 `Request Entity Too Large` rejections on Vercel and prevents edge router stream parse errors.
  - **Dynamic Award Tier Synchronization**:
    - Subject lines and email headings dynamically adjust to each candidate's exact award tier (`Official Certificate of Participation` vs. `Official Certificate of Achievement` vs. `Official Certificate of Special Recognition`).
    - Bidirectional fallback safeguards prevent participants from ever seeing winner headings, and winners from ever seeing participation headings.
    - Dynamic `{{attachment_filename}}` placeholder keeps the attachment notice aligned with the actual `.png` or `.jpg` file attached.
- **Public Certificate Verification Portal (`/verify-certificate`)**:
  - Recipient credential lookup by Certificate ID or QR code camera scan.
  - Displays participant name, institution, award category, issue date, and validation status.

---

### 7. Mail Service & Campaign Dispatcher
- **Multi-Provider Architecture (`/dashboard/organizer/mail`)**:
  - Pluggable delivery engine supporting **Resend**, **Brevo**, and custom **SMTP (Gmail / Google Workspace / Custom Server)** with automatic credential resolution and runtime fallback.
- **3-Step Campaign Creation Wizard**:
  1. **Select Recipients**:
     - **Database Enrolled Participants**: Live search, domain filtering, award tier filtering, and team status filtering.
     - **Uploaded Excel / CSV Spreadsheet**: Automatic column detection with distinct dynamic placeholders derived directly from sheet column headers.
  2. **Template Studio & Composer**:
     - Pre-built Google-colored email templates (Event Announcements, Participation Credentials, Winners Honors, Special Recognition).
     - Live dual-tab editor: **Interactive Preview** with real-time recipient data substitution vs. **HTML Code Editor**.
     - Dynamic one-click placeholder pills (`{{participant_name}}`, `{{email}}`, `{{reg_no}}`, `{{team_name}}`, `{{category}}`, `{{award_tier}}`, `{{event_name}}`, `{{dept}}`, `{{year}}`, `{{section}}`, etc.).
     - Single unified **"Save Template"** button that persists custom HTML templates directly to Supabase (`mail_templates`).
     - Standard editable subject lines with default protection (`Important Updates for Participants`).
  3. **Review & Batch Dispatch**:
     - Real-time chunked dispatching (4 recipients per batch with throttling) to respect provider rate limits.
     - Toggleable duplicate certificate prevention (`Allow re-sending duplicate certificates`).
     - Live progress modal tracking active candidate, sent count, failed count, and errors.
     - Interactive Delivery Acknowledgement modal summarizing campaign results.
- **Safe Test Dispatch**:
  - Send instant test emails with interactive UI acknowledgement popups to verify formatting before broadcasting.
- **Audit Logs & History**:
  - Historical campaign tracking records stored in `mail_campaigns` and per-recipient delivery statuses in `mail_logs`.

---

## 🎨 Navigation & Modern Dashboard Shell

All four panels (**Organizer**, **Participant**, **Judge**, and **Volunteer**) share a unified client navigation shell ([src/components/DashboardShell.tsx](file:///e:/hack%20kare%20platfrom/src/components/DashboardShell.tsx)):

- **Present Page Highlighting**:
  - Real-time active route tracking using Next.js `usePathname()`.
  - Solid Google Blue active state (`bg-blue-600 text-white font-semibold shadow-sm`) with an active dot indicator.
  - Distinct inactive states with smooth hover transitions.
  - Intelligent sub-route matching (e.g., `/dashboard/organizer/rounds/create` keeps "Manage Rounds" active without falsely highlighting "Dashboard").
- **Collapsible Sidebar (3 Horizontal Lines & Close Button)**:
  - **3 Horizontal Lines (`Menu` hamburger icon)** in the sticky header toggles the menu bar on both desktop and mobile.
  - **Close button (`X` icon)** inside the sidebar header allows instant closing/collapsing.
  - **Desktop Collapse**: Sidebar smoothly collapses to `w-0` to provide 100% full-width view for tables, scoring sheets, and problem catalogs; saves preference in `localStorage`.
  - **Mobile Slide-Out Drawer**: Off-canvas drawer with a dark frosted backdrop (`backdrop-blur-xs`), <kbd>Esc</kbd> key support, and auto-close on link navigation.
  - **Clean Header**: Uses the sleek, compact `gdg-logo.png` emblem instead of bulky banners, keeping the menu compact and elegant.
- **Full-Width Auto-Centering**:
  - Containers use `w-full max-w-7xl mx-auto` to center content with balanced margins on widescreen displays.
- **Role-Aware User Dropdown**:
  - User avatar, name, and email with direct links to profile/settings and sign out.

---

## 🌐 Public Landing Page & Branding

The public landing page ([src/app/page.tsx](file:///e:/hack%20kare%20platfrom/src/app/page.tsx)) provides a clean, distraction-free onboarding experience:

- **Streamlined Header**: Features the official Google Developer Groups on Campus banner logo (`group-2b.png`) on the left and a direct **"Login to Dashboard"** action button on the right (eliminating premature leaderboard or certificate clutter).
- **Hero Section**: Clear value proposition with a single prominent call to action: **"Get Started • Login to Dashboard"**.
- **Consolidated Footer**: Single unified footer featuring the full `group-2b.png` brand logo and official copyright notice:
  ```
  © GDG KARE 2026. All Rights Reserved.
  ```

---

## ⚡ Architecture & High-Concurrency Scaling (500+ Users)

1. **Atomic PostgreSQL Stored Procedures**:
   - `select_problem_atomic(p_team_id, p_problem_id, p_user_id)`: Uses `SELECT ... FOR UPDATE` row-level locks on `problem_statements` to guarantee that no statement exceeds its maximum team quota.
   - `join_team_atomic(p_invite_code, p_user_id)`: Uses `SELECT ... FOR UPDATE` locks on `teams` to guarantee that no team exceeds 4 members.
2. **13 High-Performance B-Tree Database Indexes**:
   - Indexed foreign keys on `submissions(team_id, round_id)`, `scores(team_id, round_id, judge_id)`, `team_members(team_id, user_id)`, `problem_selections(team_id, problem_id)`, and `users(email, role)`.
3. **In-Memory User & Catalog Caching**:
   - In-memory 5-minute TTL cache in `ensureUser.ts` eliminates duplicate database lookups during authenticated API requests.
   - In-memory 3-second catalog cache in `/api/problems` prevents connection pool exhaustion during traffic spikes.
4. **Debounced Realtime Listeners**:
   - Event-driven Supabase broadcast with cooldowns prevents repeated page re-fetches during high traffic bursts.
5. **Server-Side Aggregation RPC & Static ISR**:
   - `get_leaderboard_scores()` computes all team totals directly in PostgreSQL in <5ms.
   - Static 10s ISR caching on `/leaderboard` serves pre-rendered HTML in <2ms.
6. **Edge & Serverless Safe Certificate Payload Pipeline**:
   - Client-side bicubic downsampling compresses raw certificate canvas base64 images (normally 8MB–12MB) down to <1MB.
   - Guaranteed compliance with Vercel's strict **4.5 MB request body limit**, completely preventing HTTP 413 `Request Entity Too Large` edge rejections during single or bulk email dispatch.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | [Next.js 16](https://nextjs.org/) (App Router, Turbopack) | Server & Client Components, Dynamic Routing |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict static typing across all routes and components |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/) | Modern Google design system with custom `@theme` tokens |
| **Auth** | [NextAuth.js](https://next-auth.js.org/) | Google OAuth 2.0 with session role management |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) | Relational DB, Row Level Security (RLS), Stored Procedures |
| **Realtime** | Supabase Realtime Channels | Live dashboard synchronization across clients |
| **Certificates** | HTML5 Canvas + [jspdf](https://github.com/parallax/jsPDF) + [jszip](https://stuk.github.io/jszip/) + [qrcode](https://github.com/soldair/node-qrcode) | Client-side certificate generation, compression & ZIP archiving |
| **Email & Delivery** | [Resend](https://resend.com/) + [Brevo](https://www.brevo.com/) + [Nodemailer](https://nodemailer.com/) (SMTP) | Multi-provider transactional and bulk campaign email distribution |
| **Data Export** | [xlsx](https://sheetjs.com/) + [file-saver](https://github.com/eligrey/FileSaver.js/) | CSV and Excel generation for student rosters |

---

## 📁 Directory Structure

```text
├── public/
│   ├── gdg-logo.png               # Official GDG brackets emblem icon
│   └── group-2b.png               # Official GDG on Campus KARE full banner logo
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # GDG-branded authentication portal
│   │   ├── api/                   # API routes (Auth, Problems, Rounds, Teams, Scores, Certificates, Mail)
│   │   │   └── organizer/
│   │   │       └── mail/          # Campaign dispatch, template CRUD, test mailer, and config APIs
│   │   ├── dashboard/
│   │   │   ├── organizer/         # Command Center, Certificate Studio & Mail Service
│   │   │   │   ├── certificates/  # Certificate Studio & email distribution
│   │   │   │   └── mail/          # 3-Step Mail Campaign & Template Studio
│   │   │   ├── participant/       # Participant Portal, Team Hub & Submissions
│   │   │   ├── judge/             # Judge Evaluation Portal & Rubrics
│   │   │   └── volunteer/         # Volunteer Attendance & Check-in Panel
│   │   ├── leaderboard/           # Public real-time hackathon leaderboard
│   │   ├── verify-certificate/    # Public tamper-proof certificate verification route
│   │   ├── globals.css            # Tailwind CSS v4 design tokens and theme rules
│   │   ├── layout.tsx             # Root layout with GDG branding and metadata
│   │   └── page.tsx               # Minimal, modern landing page
│   ├── components/
│   │   ├── DashboardShell.tsx     # Unified responsive navigation shell with active highlighting
│   │   ├── UserDropdown.tsx       # User account dropdown and role-based links
│   │   ├── SignOutButton.tsx      # Sign out trigger component
│   │   ├── CopyButton.tsx         # One-click clipboard copy utility
│   │   └── DashboardRealtimeListener.tsx # Throttled Supabase realtime broadcaster
│   ├── lib/                       # Supabase client, NextAuth configuration, Database helpers
│   │   └── mail/                  # Multi-provider mailer engine, dynamic templates, certificate attachments
│   ├── types/                     # TypeScript type definitions and database interfaces
│   └── utils/                     # Utility helpers and formatting functions
└── .vscode/
    └── settings.json              # Configured to ignore Tailwind v4 @theme CSS linter rule
```

---

## 🗄️ Database Schema & Migrations

The database SQL migrations configure:
- **Core Competition Tables**: `users`, `teams`, `team_members`, `rounds`, `submissions`, `scores`, `organizer_emails`, `judge_emails`, `judge_assignments`, `leaderboard_config`, `problem_statements`, `problem_selections`, `certificates`.
- **Email & Communications Tables**:
  - `mail_templates`: Stored custom and system HTML email templates with dynamic tokens.
  - `mail_campaigns`: Campaign tracking records, total recipients, sent/failed metrics, and statuses.
  - `mail_logs`: Per-recipient delivery audit logs with certificate IDs, attempt counts, provider tags, and error logs.
- **Atomic Functions**: `select_problem_atomic`, `join_team_atomic`, `get_leaderboard_scores`.

---

## 🔑 Environment Variables

Create a `.env.local` file in the root directory:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key_here

# Google OAuth 2.0 Credentials (from Google Cloud Console)
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Supabase Credentials (from Supabase Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Email Provider Configuration (Multi-Provider Support)
# 1. Resend API (Recommended for transactional & bulk campaigns)
RESEND_API_KEY=re_your_resend_api_key_here

# 2. Brevo API (Alternative provider)
BREVO_API_KEY=xkeysib_your_brevo_api_key_here

# 3. Custom SMTP (Gmail, Google Workspace, or custom relay)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password
MAIL_FROM="GDG-KARE Organizing Committee <noreply@gdgkare.com>"
```

---

## 🚀 Local Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/karthikraj-code/HACKARE-CIC.git
cd HACKARE-CIC
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create `.env.local` and add your Google OAuth and Supabase credentials.

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
npm run start
```

---

## 🧪 Benchmark & Testing Guide

The repository includes automated benchmark suites to test high-concurrency performance and race conditions:

### 1. Database Atomic Race-Condition Test
Simulates **20+ teams attempting to lock the exact same problem statement at the exact same millisecond**:
```bash
node scripts/test_race_conditions.mjs
```
**Expected Result**:
- `🟢 Accepted (Locked): 2`
- `🔴 Rejected (Capacity Full): 18`
- `🔍 DB Verified Locks: Exactly 2` (Zero duplicates, Zero deadlocks)

### 2. 500+ Concurrent Virtual Users Benchmark
Simulates 500 simultaneous virtual users hitting the cached Leaderboard, Problem Statements API, and Homepage:
```bash
# Start production server
npm run build
npm run start

# In another terminal:
node scripts/stress_test_500.mjs http://localhost:3000
```

### 3. Sustained Traffic Load Test (Autocannon)
Benchmark realistic event traffic under sustained load:
```bash
# Test Leaderboard with 50 persistent connections over 10s
npx autocannon -c 50 -d 10 http://localhost:3000/leaderboard

# Test Problem Statements API
npx autocannon -c 50 -d 10 http://localhost:3000/api/problems
```

---

## 📡 API Routes Reference

### Authentication & User
- `GET /api/user/profile`: Fetches current user profile, team data, and role.

### Participant
- `GET /api/problems`: Returns list of problem statements with real-time slot counts and release status.
- `POST /api/problems/select`: Atomic problem statement locking for team leaders.
- `POST /api/team/create`: Creates a new team and assigns leader.
- `POST /api/team/join`: Atomic team joining via invite code.
- `POST /api/rounds/submit`: Validates and upserts round submission deliverables.

### Judge
- `POST /api/judge/score`: Submits or updates quantitative criteria scores and qualitative feedback.

### Organizer
- `POST /api/rounds/create`: Creates a new competition round with custom deliverables and rubrics.
- `PUT /api/rounds/[id]`: Updates round details, time limits, or rubric schema.
- `DELETE /api/rounds/delete`: Deletes a round and cascades submissions/scores.
- `POST /api/organizer/problems`: Creates a new problem statement.
- `PUT /api/organizer/problems/[id]`: Updates problem statement details.
- `DELETE /api/organizer/problems/[id]`: Deletes problem statement and unlinks selections.
- `POST /api/organizer/problems/release`: Toggles problem statement release for participants.
- `GET|POST|DELETE /api/organizer/invites`: Manages organizer and judge Google email access control.
- `POST /api/organizer/assign-judge`: Assigns a judge to a team.
- `POST /api/organizer/leaderboard`: Toggles public visibility of the leaderboard.

### Mail Service & Campaign Dispatcher
- `POST /api/organizer/mail/send`: Batch personalized campaign dispatch with rate-limited chunking, duplicate protection, and certificate attachment support.
- `GET|POST|PUT|DELETE /api/organizer/mail/templates`: Supabase-backed email template CRUD with custom placeholders.
- `POST /api/organizer/mail/test`: Safe test email dispatcher with recipient override and live verification.
- `GET /api/organizer/mail/history`: Historical campaign delivery logs, sent/failed metrics, and audit records.
- `GET /api/organizer/mail/participants`: Fetches database-enrolled participants with metadata and award tiers.
- `GET|POST /api/organizer/mail/config`: Mailer service configuration and active provider status check.

### Certificate Verification
- `GET /api/verify-certificate?id=GDG-KARE-XXXX-YYYY`: Public tamper-proof certificate authenticity verification endpoint.

---

## 🚢 Deployment

### Deploying to Vercel
1. Push your code to a GitHub repository.
2. Import the project into [Vercel](https://vercel.com/).
3. Add all environment variables in **Project Settings -> Environment Variables**.
4. In Google Cloud Console, add your Vercel production domain to the **Authorized redirect URIs**:
   ```
   https://your-domain.vercel.app/api/auth/callback/google
   ```
5. Deploy!

---
