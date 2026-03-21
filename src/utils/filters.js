// src/utils/filters.js
//
// Central place to manage what jobs we keep and what we reject.
// All job fetchers import from here — change it once, affects everything.

export const RELEVANT_TAGS = [
  'javascript', 'js', 'react', 'node', 'nodejs', 'frontend', 'front-end',
  'fullstack', 'full-stack', 'html', 'css', 'web', 'developer', 'engineer',
  'software', 'it support', 'help desk', 'helpdesk', 'technical support',
  'ai', 'vibe', 'junior',
]

export const DEAL_BREAKERS = [
  'senior', 'staff engineer', '10+ years', '8+ years',
  'security clearance', 'phd required', 'masters required',
]
