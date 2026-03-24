'use client'

import { useState } from 'react'

const STATUS_OPTIONS = ['new', 'saved', 'applied', 'skipped']

function scoreColor(score) {
  if (score == null) return 'bg-zinc-200 text-zinc-600'
  if (score >= 80) return 'bg-green-100 text-green-800'
  if (score >= 60) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-700'
}

function scoreBorder(score) {
  if (score == null) return 'border-zinc-200'
  if (score >= 80) return 'border-green-300'
  if (score >= 60) return 'border-yellow-300'
  return 'border-red-200'
}

function formatSalary(salary) {
  if (!salary) return null
  const fmt = (n) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`
  if (salary.min && salary.max) return `${fmt(salary.min)}–${fmt(salary.max)}`
  if (salary.min) return `${fmt(salary.min)}+`
  if (salary.max) return `up to ${fmt(salary.max)}`
  return null
}

function formatDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return null
  }
}

export default function JobCard({ job, onStatusChange, onAddSkill }) {
  const [expanded, setExpanded] = useState(false)
  const [addedSkills, setAddedSkills] = useState(new Set())

  async function handleAddSkill(skill) {
    setAddedSkills(prev => new Set(prev).add(skill))
    try {
      await onAddSkill(skill)
    } catch {
      setAddedSkills(prev => { const next = new Set(prev); next.delete(skill); return next })
    }
  }
  const salary = formatSalary(job.salary)
  const date = formatDate(job.postedAt)

  const statusColors = {
    new: 'bg-zinc-100 text-zinc-600',
    saved: 'bg-blue-100 text-blue-700',
    applied: 'bg-green-100 text-green-700',
    skipped: 'bg-zinc-100 text-zinc-400 line-through',
  }

  return (
    <div className={`border rounded-xl p-5 bg-white shadow-sm ${scoreBorder(job.score)} ${job.status === 'skipped' ? 'opacity-50' : ''}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${scoreColor(job.score)}`}>
              {job.score != null ? `${job.score}` : '—'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 capitalize">{job.source}</span>
            {date && <span className="text-xs text-zinc-400">{date}</span>}
            {salary && <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-600 border border-zinc-200">{salary}</span>}
          </div>
          <h2 className="font-semibold text-zinc-900 leading-snug">{job.title}</h2>
          <p className="text-sm text-zinc-500">{job.company}</p>
        </div>
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm font-medium px-4 py-2 rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
        >
          Apply
        </a>
      </div>

      {/* Skills */}
      {(job.matchingSkills?.length > 0 || job.missingSkills?.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.matchingSkills?.map(skill => (
            <span key={skill} className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">{skill}</span>
          ))}
          {job.missingSkills?.map(skill => (
            <span key={skill} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
              {skill}
              {onAddSkill && (
                addedSkills.has(skill)
                  ? <span className="text-green-600 font-bold leading-none">✓</span>
                  : <button
                      onClick={() => handleAddSkill(skill)}
                      className="leading-none font-bold hover:text-red-900 transition-colors"
                      title="Add to my skills"
                    >+</button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Reasoning toggle */}
      {job.reasoning && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            {expanded ? 'Hide reasoning ▲' : 'Show reasoning ▼'}
          </button>
          {expanded && (
            <p className="mt-1.5 text-sm text-zinc-600 leading-relaxed">{job.reasoning}</p>
          )}
        </div>
      )}

      {/* Status buttons */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-zinc-400">Mark as:</span>
        {STATUS_OPTIONS.filter(s => s !== 'new').map(status => (
          <button
            key={status}
            onClick={() => onStatusChange(job.id, job.status === status ? 'new' : status)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors capitalize
              ${job.status === status
                ? statusColors[status] + ' border-transparent font-semibold'
                : 'border-zinc-200 text-zinc-500 hover:border-zinc-400'}`}
          >
            {status}
          </button>
        ))}
      </div>
    </div>
  )
}
