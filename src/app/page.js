'use client'

import { useState, useEffect, useMemo } from 'react'
import JobCard from '@/components/JobCard'

const SOURCES = ['all', 'remoteok', 'himalayas', 'jobicy', 'arbeitnow']

export default function Dashboard() {
  const [jobs, setJobs] = useState([])
  const [statuses, setStatuses] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [minScore, setMinScore] = useState(0)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')
  const [hideSkipped, setHideSkipped] = useState(true)

  async function fetchStatuses() {
    const res = await fetch('/api/status')
    return res.json()
  }

  async function fetchJobs() {
    const res = await fetch('/api/score')
    const data = await res.json()
    return data.jobs || []
  }

  useEffect(() => {
    Promise.all([fetchJobs(), fetchStatuses()])
      .then(([jobs, statuses]) => {
        setJobs(jobs)
        setStatuses(statuses)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleRefresh() {
    setRefreshing(true)
    setError(null)
    try {
      const [jobs, statuses] = await Promise.all([fetchJobs(), fetchStatuses()])
      setJobs(jobs)
      setStatuses(statuses)
    } catch (err) {
      setError(err.message)
    } finally {
      setRefreshing(false)
    }
  }

  async function handleStatusChange(id, status) {
    // Optimistic update
    setStatuses(prev => {
      const next = { ...prev }
      if (status === 'new') delete next[id]
      else next[id] = status
      return next
    })

    // Persist to server
    try {
      await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
    } catch {
      // If server save fails, revert
      const fresh = await fetchStatuses()
      setStatuses(fresh)
    }
  }

  const filteredJobs = useMemo(() => {
    const q = search.toLowerCase()
    return jobs
      .map(job => ({ ...job, status: statuses[job.id] || 'new' }))
      .filter(job => {
        if (hideSkipped && job.status === 'skipped') return false
        if (job.score != null && job.score < minScore) return false
        if (source !== 'all' && job.source !== source) return false
        if (q && !`${job.title} ${job.company}`.toLowerCase().includes(q)) return false
        return true
      })
  }, [jobs, statuses, minScore, search, source, hideSkipped])

  const stats = useMemo(() => {
    const all = jobs.map(j => ({ ...j, status: statuses[j.id] || 'new' }))
    return {
      total: all.length,
      great: all.filter(j => (j.score ?? 0) >= 80).length,
      good: all.filter(j => (j.score ?? 0) >= 60 && (j.score ?? 0) < 80).length,
      saved: all.filter(j => j.status === 'saved').length,
      applied: all.filter(j => j.status === 'applied').length,
    }
  }, [jobs, statuses])

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">JobRadar</h1>
            <p className="text-xs text-zinc-400">AI-scored remote jobs for Toby</p>
          </div>
          <div className="flex items-center gap-4">
            {!loading && (
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span><strong className="text-green-700">{stats.great}</strong> great</span>
                <span><strong className="text-yellow-700">{stats.good}</strong> good</span>
                <span><strong className="text-blue-700">{stats.saved}</strong> saved</span>
                <span><strong className="text-zinc-700">{stats.applied}</strong> applied</span>
                <span className="text-zinc-300">|</span>
                <span>{stats.total} total</span>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="text-sm px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search title or company..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-48 text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-500">Min score</label>
            <input
              type="number"
              min={0}
              max={100}
              value={minScore}
              onChange={e => setMinScore(Number(e.target.value))}
              className="w-16 text-sm border border-zinc-200 rounded-lg px-2 py-2 outline-none focus:border-zinc-400"
            />
          </div>
          <select
            value={source}
            onChange={e => setSource(e.target.value)}
            className="text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400 bg-white capitalize"
          >
            {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
            <input
              type="checkbox"
              checked={hideSkipped}
              onChange={e => setHideSkipped(e.target.checked)}
              className="accent-zinc-600"
            />
            Hide skipped
          </label>
        </div>

        {/* States */}
        {loading && (
          <div className="text-center py-24 text-zinc-400">
            <div className="text-4xl mb-3">⏳</div>
            <p className="text-sm">Fetching and scoring jobs with Claude...</p>
            <p className="text-xs mt-1 text-zinc-300">This may take a minute on first load</p>
          </div>
        )}

        {error && (
          <div className="text-center py-16 text-red-500">
            <p className="font-medium">Failed to load jobs</p>
            <p className="text-sm mt-1 text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && filteredJobs.length === 0 && (
          <div className="text-center py-16 text-zinc-400">
            <p>No jobs match your filters.</p>
          </div>
        )}

        {/* Job list */}
        {!loading && !error && filteredJobs.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-zinc-400">{filteredJobs.length} jobs shown</p>
            {filteredJobs.map(job => (
              <JobCard
                key={job.id}
                job={job}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
