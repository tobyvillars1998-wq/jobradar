'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

function TagInput({ tags, onChange, placeholder, enterOnly = false }) {
  const [input, setInput] = useState('')

  function addTag(value) {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
    }
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || (!enterOnly && e.key === ',')) {
      e.preventDefault()
      addTag(input)
    }
  }

  function removeTag(index) {
    onChange(tags.filter((_, i) => i !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span key={i} className="flex items-center gap-1 bg-zinc-100 text-zinc-700 text-xs font-medium px-2 py-1 rounded-md">
              {tag}
              <button type="button" onClick={() => removeTag(i)} className="text-zinc-400 hover:text-zinc-700 leading-none ml-0.5">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addTag(input)}
        placeholder={placeholder}
        className="text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400 placeholder:text-zinc-400"
      />
    </div>
  )
}

export default function ProfilePage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [targetRoles, setTargetRoles] = useState([])
  const [skills, setSkills] = useState([])
  const [dealBreakers, setDealBreakers] = useState([])
  const [minSalary, setMinSalary] = useState('')
  const [location, setLocation] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const mounted = useRef(false)
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return }
    setError(null)
    setSuccess(false)
  }, [firstName, lastName, email, targetRoles, skills, dealBreakers, minSalary, location])

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        const parts = (data.name || '').split(' ')
        setFirstName(parts[0] || '')
        setLastName(parts.slice(1).join(' '))
        setEmail(data.email || '')
        setTargetRoles(data.targetRoles || [])
        setSkills(data.skills || [])
        setDealBreakers(data.dealBreakers || [])
        setMinSalary(data.minSalary || '')
        setLocation(data.location?.length ? data.location : ['Remote'])
      })
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!firstName.trim()) { setError('First name is required'); return }
    if (!lastName.trim()) { setError('Last name is required'); return }
    if (!email.trim()) { setError('Email is required'); return }

    const name = [firstName.trim(), lastName.trim()].join(' ')

    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email.trim(),
          targetRoles,
          skills,
          dealBreakers,
          minSalary: minSalary ? Number(minSalary) : null,
          location: location,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      setSuccess(true)
    } catch {
      setError('Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold text-zinc-800">Profile</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 flex flex-col gap-4">
        {loading ? (
          <div className="text-sm text-zinc-400 py-4">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

            {/* Account details */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col gap-4">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Account details</h2>

              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400"
                    placeholder="First name"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Job search profile */}
            <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col gap-4">
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Job search profile</h2>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Target roles</label>
                <p className="text-xs text-zinc-400">Press Enter or comma to add</p>
                <TagInput tags={targetRoles} onChange={setTargetRoles} placeholder="e.g. Frontend Developer" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Skills</label>
                <p className="text-xs text-zinc-400">Press Enter or comma to add</p>
                <TagInput tags={skills} onChange={setSkills} placeholder="e.g. React, Node.js" />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-zinc-600">Deal breakers</label>
                <p className="text-xs text-zinc-400">Jobs matching these will be filtered out</p>
                <TagInput tags={dealBreakers} onChange={setDealBreakers} placeholder="e.g. Senior, Security clearance" />
              </div>

              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">Minimum salary (USD)</label>
                  <input
                    type="number"
                    value={minSalary}
                    onChange={e => setMinSalary(e.target.value)}
                    className="text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400"
                    placeholder="70000"
                    min="0"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-xs font-medium text-zinc-600">Location</label>
                  <p className="text-xs text-zinc-400">Include state/country — press Enter to add</p>
                  <TagInput tags={location} onChange={setLocation} placeholder="e.g. Springfield, MO" enterOnly />
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
            {success && <p className="text-xs text-green-600">Profile saved.</p>}

            <button
              type="submit"
              disabled={saving}
              className="bg-zinc-800 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-zinc-700 disabled:opacity-50 transition-colors self-start"
            >
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
