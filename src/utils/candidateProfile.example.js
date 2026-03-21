// src/utils/candidateProfile.example.js
//
// Copy this file to candidateProfile.js and fill in your details.
// candidateProfile.js is gitignored — your personal info stays local.

const candidateProfile = {
  name: 'Your Name',

  // ── Target roles ────────────────────────────────────────────────────────────
  // Jobs matching these titles will score higher.
  targetRoles: [
    'junior web developer',
    'junior developer',
    'frontend developer',
    'full stack developer',
  ],

  // ── Skills ──────────────────────────────────────────────────────────────────
  // Add or remove skills here — the AI uses this list when scoring jobs.
  skills: [
    // Languages & fundamentals
    'JavaScript',
    'HTML',
    'CSS',

    // Frameworks & runtimes
    'React',
    'Node.js',

    // Tooling & platforms
    'Git',
    'GitHub',
    'REST APIs',
  ],

  // ── Salary ──────────────────────────────────────────────────────────────────
  salary: {
    min: 0,
    currency: 'USD',
  },

  // ── Location ────────────────────────────────────────────────────────────────
  location: {
    preferred: 'remote',
    acceptable: ['Your City ST'],
  },

  // ── Deal-breakers ───────────────────────────────────────────────────────────
  // Jobs matching any of these are automatically scored 0 and skipped.
  dealBreakers: [
    'senior',
    'staff engineer',
    '10+ years',
    'security clearance',
  ],
}

export default candidateProfile
