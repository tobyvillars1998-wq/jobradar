# What Was Just Added

## New Files

- `src/api/fetchGitHubSearch.js` — general GitHub topic search fetcher
- `src/app/api/jobs/githubsearch/route.js` — route handler at `GET /api/jobs/githubsearch`

## How It Works

1. Searches GitHub for repos tagged with topics like `job-board`, `hiring`, `remote-jobs`
2. Fetches each repo's README via GitHub Contents API
3. Heuristic pre-filter skips READMEs that don't look job-related (counts signals like table columns, salary mentions, "open positions" keywords)
4. Passes qualifying READMEs to Claude Haiku to extract structured job listings
5. Normalises output to the shared job schema with `source: 'githubsearch'`

## How to Enable It (3 steps)

**Currently dormant — has no effect until wired in.**

**1. `src/app/api/jobs/route.js`** — add to the aggregator:
```js
import { fetchGitHubSearch } from '@/api/fetchGitHubSearch'

// Add to Promise.allSettled array:
fetchGitHubSearch()

// Add to the sources object in the return:
githubsearch: results[5].status === 'fulfilled' ? results[5].value.length : 'failed',
```

**2. `src/app/page.js` line 7** — add to the source filter dropdown:
```js
const SOURCES = ['all', 'remoteok', 'himalayas', 'jobicy', 'arbeitnow', 'github', 'githubsearch']
```

**3. Nothing else** — `src/app/api/jobs/githubsearch/route.js` already exists and is ready.

## Tuning Knobs

All three are constants at the top of `fetchGitHubSearch.js`:

- `SEARCH_TOPICS` — which GitHub topics to query
- `MAX_REPOS_PER_TOPIC` — repos fetched per topic (default 5 × 6 topics = up to 30 Claude calls per run)
- `MIN_HEURISTIC_SIGNALS` — how many signals a README needs to pass the pre-filter before being sent to Claude
