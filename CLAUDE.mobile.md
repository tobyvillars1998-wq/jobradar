# JobRadar — Build Summary

Quick reference for continuing development. Covers what exists, what is dormant but built, and what still needs to be created.

---

## What Is This

A personal job-search dashboard. It pulls listings from multiple sources, scores each one against a candidate profile using Claude AI, and presents them in a filterable UI. Auth-gated — only you can see it.

---

## Active Sources (all running now)

| Source | File | How it works |
|---|---|---|
| RemoteOK | `src/api/fetchRemoteOK.js` | Public JSON API, no key needed |
| Arbeitnow | `src/api/fetchArbeitnow.js` | Public JSON API, no key needed |
| Jobicy | `src/api/fetchJobicy.js` | Public JSON API, no key needed |
| Himalayas | `src/api/fetchHimalayas.js` | Public JSON API, no key needed |
| GitHub (known repos) | `src/api/fetchGitHub.js` | Fetches READMEs from two curated repos, parses markdown tables with regex |

The two GitHub repos currently scraped:
- `remoteintech/remote-jobs` — companies with remote positions
- `poteto/hiring-without-whiteboards` — companies that don't use whiteboard interviews

---

## Dormant Source — Built but NOT Wired In

### GitHub Search (`src/api/fetchGitHubSearch.js`)

Discovers job-listing repos dynamically via GitHub topic search, then uses Claude Haiku to extract structured listings from their READMEs. More powerful than the known-repos approach but costs API tokens per run.

**To enable it — 3 steps:**

1. **Aggregator** — `src/app/api/jobs/route.js`
   ```js
   import { fetchGitHubSearch } from '@/api/fetchGitHubSearch'
   // Add fetchGitHubSearch() to the Promise.allSettled array
   // Add githubsearch entry to the sources object in the return
   ```

2. **UI filter** — `src/app/page.js` line 7
   ```js
   const SOURCES = ['all', 'remoteok', 'himalayas', 'jobicy', 'arbeitnow', 'github', 'githubsearch']
   ```

3. The route `src/app/api/jobs/githubsearch/route.js` is already created — nothing to do there.

**Tuning knobs inside `fetchGitHubSearch.js`:**
- `SEARCH_TOPICS` — GitHub topics to query
- `MAX_REPOS_PER_TOPIC` — how many repos per topic (controls cost and latency)
- `MIN_HEURISTIC_SIGNALS` — how strict the pre-filter is before sending to Claude

---

## Key Infrastructure Files

| File | Purpose |
|---|---|
| `src/app/api/jobs/route.js` | Aggregator — calls all sources in parallel, deduplicates by `applyUrl` |
| `src/app/api/score/route.js` | Calls the aggregator then runs every job through Claude scoring |
| `src/app/api/status/route.js` | Persists per-job statuses: `new / saved / applied / skipped` |
| `src/utils/scoreJob.js` | Sends a single job + candidate profile to Claude Haiku, returns score + reasoning |
| `src/utils/filters.js` | `RELEVANT_TAGS` and `DEAL_BREAKERS` — edit here to change what jobs are kept |
| `src/utils/candidateProfile.example.js` | Shape of the candidate profile object used for scoring |
| `src/app/profile/page.js` | UI for viewing and updating skills |
| `src/app/api/profile/route.js` | GET/PUT profile |
| `src/app/api/profile/skills/route.js` | POST to add a skill from the dashboard |

---

## Auth

Built with NextAuth. Routes under `src/app/api/auth/`:
- `[...nextauth]/route.js` — main NextAuth handler
- `register/route.js` — create account
- `forgot-password/route.js` — request reset
- `reset-password/route.js` — apply reset token

All API routes are auth-gated via `getServerSession()`.

---

## Job Schema

Every source normalises its output to this shape:

```js
{
  id: 'source-slugified-company-title',   // unique, stable
  source: 'remoteok' | 'github' | etc,
  title: string,
  company: string,
  description: string,
  tags: string[],                          // lowercase tech/skill tags
  salary: { min, max, currency } | null,
  location: string,
  applyUrl: string,
  postedAt: string | null,
  score: number | null,                    // 0–100, added by scoreJob
  reasoning: string | null,
  matchingSkills: string[],
  missingSkills: string[],
  status: 'new' | 'saved' | 'applied' | 'skipped',
}
```

---

## Environment Variables Required

```
GITHUB_TOKEN          # GitHub personal access token — increases rate limit from 60 to 5000 req/hr
ANTHROPIC_API_KEY     # Claude API key — used for job scoring and GitHub search extraction
NEXTAUTH_SECRET       # Random secret for NextAuth session signing
NEXTAUTH_URL          # Full URL of the app (e.g. http://localhost:3000)
```

---

## What Still Needs to Be Built

### High priority

- **Caching** — every page load re-fetches and re-scores all sources. Add a simple in-memory or Redis cache with a TTL (e.g. 30 min). The score route is the expensive one.
- **More known GitHub repos** — add entries to the `GITHUB_REPOS` array in `fetchGitHub.js`. Good candidates:
  - `felipefialho/remote-jobs` (Brazilian remote jobs, good international mix)
  - `jessicard/remote-jobs` (older but large)
  - `tramcar/tramcar` (self-hosted job board data)
- **Enable githubsearch** — follow the 3 steps above when you're ready to pay the Claude token cost per run.

### Medium priority

- **Better deduplication** — currently deduped by `applyUrl` only. Add a secondary pass deduping by `(company + title)` to catch the same job posted on multiple boards with different URLs.
- **Salary parsing** — `fetchGitHubSearch` always returns `salary: null`. Add a Claude prompt or regex pass to extract salary ranges from descriptions.
- **Scheduled refresh** — add a cron route or Vercel cron job to pre-fetch and cache results in the background, so the first page load is instant.

### Nice to have

- **Email digest** — daily email of jobs scored above a threshold. Needs a mailer (Resend or Nodemailer) and a cron trigger.
- **Persistent job history** — statuses currently stored in memory/local. Add a database (SQLite via Prisma is lightest) so history survives restarts.
- **Apply tracking** — record when you applied and to what, link back to the job listing.
- **More job boards** — Otta, Greenhouse feeds, Lever feeds, We Work Remotely.
- **Tag filtering in UI** — currently only filter by source and score. Add a tag multi-select.
- **Dark mode** — Tailwind dark: classes are not applied yet.

---

## Branch

All current work lives on: `claude/setup-feature-branch-v05IB`
