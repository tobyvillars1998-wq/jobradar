# JobRadar

An AI-powered job search dashboard that pulls remote job listings from multiple sources, scores each one against your personal skills profile using Claude AI, and presents a ranked shortlist every morning.

Built as both a daily-use personal tool and a portfolio project demonstrating AI-assisted development.

## What It Does

- Fetches jobs from 5 sources in parallel (RemoteOK, Arbeitnow, Jobicy, Himalayas, GitHub)
- Deduplicates listings across sources by apply URL
- Pre-filters out deal-breakers (senior roles, clearance requirements, etc.)
- Scores each job 0–100 using Claude Haiku against your personal skills profile
- Caches scores per user in Supabase to avoid redundant API calls on refresh
- Displays a ranked dashboard with match reasoning, skill gaps, and salary info
- Lets you mark jobs as Saved, Applied, or Skipped — persisted per user in Supabase
- Full auth system — email/password login, registration, and forgot password flow
- Profile editor — update your target roles, skills, deal-breakers, salary, and location at any time

## Tech Stack

- **Next.js 16.2** (App Router) + **React 19**
- **Tailwind CSS v4**
- **Anthropic Claude API** — `claude-haiku-4-5-20251001` for AI scoring
- **NextAuth v4** — email/password auth with JWT sessions
- **Supabase** — stores users, profiles, scores, and statuses
- **axios** for external API requests
- Deployable to **Vercel**

## Job Sources

| Source | Endpoint | Auth |
|--------|----------|------|
| RemoteOK | `https://remoteok.com/api` | None |
| Arbeitnow | `https://www.arbeitnow.com/api/job-board-api` | None |
| Jobicy | `https://jobicy.com/api/v2/remote-jobs` | None |
| Himalayas | `https://himalayas.app/jobs/api` | None |
| GitHub (hiring-without-whiteboards) | `poteto/hiring-without-whiteboards` README | Optional `GITHUB_TOKEN` |

## Project Structure

```
src/
  api/           # Fetchers for each job board
  app/
    api/         # Next.js route handlers (jobs, score, status, auth, profile)
    page.js      # Dashboard UI
    login/       # Login / register / forgot password
    profile/     # Profile editor
  components/
    JobCard.js   # Individual job card component
  lib/
    supabase.js  # Supabase browser + service role clients
    rateLimit.js # In-memory rate limiter for auth routes
  utils/
    filters.js   # Shared tag/keyword filter config
    scoreJob.js  # Claude scoring logic
```

## Getting Started

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create a Supabase project and run the following SQL to set up the schema:

```sql
CREATE TABLE users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  hashed_password text NOT NULL,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES users(id),
  target_roles text[],
  skills text[],
  deal_breakers text[],
  min_salary int,
  location text[]
);

CREATE TABLE scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  job_id text NOT NULL,
  score int,
  reasoning text,
  matching_skills text[],
  missing_skills text[],
  scored_at timestamptz DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

CREATE TABLE statuses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  job_id text NOT NULL,
  status text NOT NULL,
  UNIQUE (user_id, job_id)
);

CREATE TABLE password_resets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT NOW()
);
```

3. Create `.env.local` with your credentials (see `env.example` for the full list):

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
NEXTAUTH_SECRET=any_random_string
NEXTAUTH_URL=http://localhost:3000
```

4. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Register an account, fill out your profile, then load the dashboard. On first load it fetches and scores all jobs — this takes a minute while the cache warms up. Subsequent loads are fast.

## Dashboard Features

- **Score badges** — color-coded: green (80+), yellow (60–79), red (<60)
- **Filters** — search by title/company, min score, job source, hide skipped
- **Stats bar** — live count of great/good/saved/applied jobs
- **Job cards** — matching skills (green), missing skills (red), collapsible AI reasoning, Apply button
- **Status tracking** — Saved / Applied / Skipped with optimistic UI updates
- **Refresh button** — re-fetches jobs and statuses without a page reload

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel
2. Add all env vars from `.env.local` to your Vercel project settings (swap `NEXTAUTH_URL` for your production domain)
3. Deploy — scores and statuses persist in Supabase across deployments
