# JobRadar

An AI-powered job search dashboard that pulls remote job listings from multiple free job boards, scores each one against a candidate profile using Claude AI, and presents a ranked shortlist every morning.

Built as both a daily-use personal tool and a portfolio project demonstrating AI-assisted development.

## What It Does

- Fetches jobs from 4 sources in parallel (RemoteOK, Arbeitnow, Jobicy, Himalayas)
- Deduplicates listings across sources by apply URL
- Pre-filters out deal-breakers (senior roles, clearance requirements, etc.)
- Scores each job 0–100 using Claude Haiku against your skills profile
- Caches scores to avoid redundant API calls on refresh
- Displays a ranked dashboard with match reasoning, skill gaps, and salary info
- Lets you mark jobs as Saved, Applied, or Skipped — persisted across sessions

## Tech Stack

- **Next.js 16.2** (App Router) + **React 19**
- **Tailwind CSS v4**
- **Anthropic Claude API** — `claude-haiku-4-5-20251001` for AI scoring
- **axios** for external API requests
- Local JSON file storage (`data/scores.json`, `data/statuses.json`) in dev; **Upstash Redis** in production
- Deployable to **Vercel**

## Job Sources

| Source | Endpoint |
|--------|----------|
| RemoteOK | `https://remoteok.com/api` |
| Arbeitnow | `https://www.arbeitnow.com/api/job-board-api` |
| Jobicy | `https://jobicy.com/api/v2/remote-jobs` |
| Himalayas | `https://himalayas.app/jobs/api` |

All sources are free public APIs — no auth required.

## Project Structure

```
src/
  api/           # Fetchers for each job board
  app/
    api/         # Next.js route handlers (jobs, score, status)
    page.js      # Dashboard UI
  components/
    JobCard.js   # Individual job card component
  utils/
    candidateProfile.js  # Skills, target roles, deal-breakers
    filters.js           # Shared tag/keyword filter config
    scoreJob.js          # Claude scoring logic
data/
  scores.json    # Cached AI scores
  statuses.json  # Saved/Applied/Skipped status per job
```

## Getting Started

1. Clone the repo and install dependencies:

```bash
npm install
```

2. Create `.env.local` and add your Anthropic API key:

```
ANTHROPIC_API_KEY=your_key_here
```

3. Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). On first load it fetches and scores all jobs — this takes a minute. Subsequent loads use the cached scores.

## Dashboard Features

- **Score badges** — color-coded: green (80+), yellow (60–79), red (<60)
- **Filters** — search by title/company, min score, job source, hide skipped
- **Stats bar** — live count of great/good/saved/applied jobs
- **Job cards** — matching skills (green), missing skills (red), collapsible AI reasoning, Apply button
- **Status tracking** — Saved / Applied / Skipped with optimistic UI updates
- **Refresh button** — re-fetches jobs and statuses without a page reload

## Deploying to Vercel (with persistent remote storage)

The app uses a storage abstraction that switches automatically between local JSON files (dev) and Upstash Redis (production). Setting up Upstash gives you persistent scores and statuses that survive redeployments and are accessible from anywhere.

### 1. Create a free Upstash Redis database

Go to [console.upstash.com](https://console.upstash.com), create a free Redis database, and copy the **REST URL** and **REST Token** from the database details page.

### 2. Set environment variables

Add these to your `.env.local` for local testing, and to your Vercel project's **Settings → Environment Variables** for production:

```
ANTHROPIC_API_KEY=your_anthropic_key
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### 3. Deploy

Push to GitHub and import the repo in [vercel.com/new](https://vercel.com/new). Vercel auto-detects Next.js — no extra configuration needed.

> **Local dev without Upstash:** If the Upstash env vars are absent, the app falls back to `data/scores.json` and `data/statuses.json` as before — no changes to your local workflow.
