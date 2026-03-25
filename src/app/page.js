'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { signOut } from 'next-auth/react'
import JobCard from '@/components/JobCard'

const SOURCES = ['all', 'remoteok', 'himalayas', 'jobicy', 'arbeitnow', 'github']

export default function Dashboard() {
  const [jobs, setJobs] = useState([])
  const [statuses, setStatuses] = useState({})
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
    if (!res.ok) throw new Error(data.error || 'Failed to load jobs')
    return data.jobs || []
  }

  useEffect(() => {
    setLoading(true)
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

  async function handleAddSkill(skill) {
    await fetch('/api/profile/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill }),
    })
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

            {/* Hamburger menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                aria-label="Menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Zm0 5.25a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-xl shadow-lg py-1 z-20">
                  <div className="px-3 py-2 text-xs font-medium text-zinc-400 uppercase tracking-wide">Pages</div>
                  <a href="/" className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-zinc-400">
                      <path fillRule="evenodd" d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z" clipRule="evenodd" />
                    </svg>
                    Dashboard
                  </a>
                  <a href="/profile" className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z" clipRule="evenodd" />
                    </svg>
                    Profile
                  </a>
                  <div className="border-t border-zinc-100 mt-1 pt-1">
                    <button
                      onClick={() => signOut({ callbackUrl: '/login' })}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-1.04a.75.75 0 1 0-1.056-1.062l-2.5 2.5a.75.75 0 0 0 0 1.062l2.5 2.5a.75.75 0 1 0 1.056-1.062l-1.048-1.04h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
                      </svg>
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                onAddSkill={handleAddSkill}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
