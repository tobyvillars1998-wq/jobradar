'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const EyeOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
    <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
  </svg>
)

const EyeClosed = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
    <path d="m10.748 13.93 2.523 2.523a10.006 10.006 0 0 1-7.48-2.928l1.073-1.073a8.479 8.479 0 0 0 2.016 1.077 2.5 2.5 0 0 1-1.63-2.346.75.75 0 0 1 1.5 0 1 1 0 0 0 1.998.076Z" />
  </svg>
)

function PasswordInput({ value, onChange, showPassword, onToggle }) {
  return (
    <div className="relative">
      <input
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 pr-10 outline-none focus:border-zinc-400"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
        tabIndex={-1}
      >
        {showPassword ? <EyeOpen /> : <EyeClosed />}
      </button>
    </div>
  )
}

function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters and include a letter and a number'
  if (!/[a-zA-Z]/.test(password)) return 'Password must be at least 8 characters and include a letter and a number'
  if (!/[0-9]/.test(password)) return 'Password must be at least 8 characters and include a letter and a number'
  return null
}

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState('login') // 'login' | 'register' | 'forgot'

  // Login / register shared fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Forgot password flow
  const [forgotStep, setForgotStep] = useState(1) // 1 = enter email, 2 = enter code + new password
  const [forgotEmail, setForgotEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  function switchTab(t) {
    setTab(t)
    setError(null)
    setForgotStep(1)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', { email, password, redirect: false })

    if (result.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const pwError = validatePassword(password)
    if (pwError) {
      setError(pwError)
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    const result = await signIn('credentials', { email, password, redirect: false })

    if (result.error) {
      setError('Account created but sign in failed — please log in manually')
      switchTab('login')
    } else {
      router.push('/')
    }

    setLoading(false)
  }

  async function handleForgotStep1(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail }),
    })

    // Always advance — don't reveal if the email exists
    setResetCode('')
    setNewPassword('')
    setConfirmNewPassword('')
    setForgotStep(2)
    setLoading(false)
  }

  async function handleForgotStep2(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const pwError = validatePassword(newPassword)
    if (pwError) {
      setError(pwError)
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: forgotEmail, code: resetCode, newPassword }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setLoading(false)
      return
    }

    // Success — go back to login
    setResetCode('')
    setNewPassword('')
    setConfirmNewPassword('')
    switchTab('login')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">JobRadar</h1>
          <p className="text-sm text-zinc-400 mt-1">AI-powered job search</p>
        </div>

        <div className="bg-white border border-zinc-200 rounded-2xl p-6">

          {/* Tab switcher — hidden during forgot password flow */}
          {tab !== 'forgot' && (
            <div className="flex rounded-lg bg-zinc-100 p-1 mb-6">
              <button
                onClick={() => switchTab('login')}
                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
                  tab === 'login' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Log in
              </button>
              <button
                onClick={() => switchTab('register')}
                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
                  tab === 'register' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* Login form */}
          {tab === 'login' && (
            <form onSubmit={handleLogin} noValidate className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">Password</label>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  showPassword={showPassword}
                  onToggle={() => setShowPassword(v => !v)}
                />
                <button
                  type="button"
                  onClick={() => { setForgotEmail(email); switchTab('forgot') }}
                  className="text-xs text-zinc-400 hover:text-zinc-600 mt-1.5 block"
                >
                  Forgot password?
                </button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>
          )}

          {/* Register form */}
          {tab === 'register' && (
            <form onSubmit={handleRegister} noValidate className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">Password</label>
                <PasswordInput
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  showPassword={showPassword}
                  onToggle={() => setShowPassword(v => !v)}
                />
                <p className="text-xs text-zinc-400 mt-1">At least 8 characters with a letter and a number</p>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600 block mb-1">Confirm password</label>
                <PasswordInput
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  showPassword={showPassword}
                  onToggle={() => setShowPassword(v => !v)}
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>
          )}

          {/* Forgot password flow */}
          {tab === 'forgot' && (
            <div className="flex flex-col gap-4">
              <div>
                <button
                  type="button"
                  onClick={() => switchTab('login')}
                  className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 mb-4"
                >
                  ← Back to login
                </button>
                <h2 className="text-sm font-semibold text-zinc-900">
                  {forgotStep === 1 ? 'Reset your password' : 'Enter your reset code'}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  {forgotStep === 1
                    ? "We'll send a 6-digit code to your email."
                    : `We sent a code to ${forgotEmail}. It expires in 15 minutes.`}
                </p>
              </div>

              {/* Step 1 — enter email */}
              {forgotStep === 1 && (
                <form onSubmit={handleForgotStep1} noValidate className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-600 block mb-1">Email</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400"
                    />
                  </div>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Sending...' : 'Send code'}
                  </button>
                </form>
              )}

              {/* Step 2 — enter code + new password */}
              {forgotStep === 2 && (
                <form onSubmit={handleForgotStep2} noValidate className="flex flex-col gap-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-600 block mb-1">6-digit code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={resetCode}
                      onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400 tracking-widest text-center font-mono"
                      placeholder="000000"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-600 block mb-1">New password</label>
                    <PasswordInput
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      showPassword={showNewPassword}
                      onToggle={() => setShowNewPassword(v => !v)}
                    />
                    <p className="text-xs text-zinc-400 mt-1">At least 8 characters with a letter and a number</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-600 block mb-1">Confirm new password</label>
                    <PasswordInput
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      showPassword={showNewPassword}
                      onToggle={() => setShowNewPassword(v => !v)}
                    />
                  </div>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 rounded-lg bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Resetting...' : 'Reset password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setForgotStep(1); setError(null) }}
                    className="text-xs text-zinc-400 hover:text-zinc-600 text-center"
                  >
                    Didn't get the code? Send again
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
