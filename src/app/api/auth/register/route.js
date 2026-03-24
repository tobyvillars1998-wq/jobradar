import bcrypt from 'bcryptjs'
import { getServiceClient } from '@/lib/supabase'
import { rateLimit } from '@/lib/rateLimit'

export async function POST(req) {
  const { name, email, password } = await req.json()

  if (!name || !email || !password) {
    return Response.json({ error: 'All fields are required' }, { status: 400 })
  }

  if (typeof name !== 'string' || name.trim().length > 100) {
    return Response.json({ error: 'Invalid name' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (typeof email !== 'string' || !emailRegex.test(email.trim())) {
    return Response.json({ error: 'Invalid email address' }, { status: 400 })
  }

  if (
    typeof password !== 'string' ||
    password.length < 8 ||
    !/[a-zA-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return Response.json(
      { error: 'Password must be at least 8 characters with a letter and a number' },
      { status: 400 }
    )
  }

  // 5 registrations per IP per hour to limit account-creation spam
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'unknown'
  const { limited } = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)
  if (limited) {
    return Response.json({ error: 'Too many requests. Try again later.' }, { status: 429 })
  }

  const supabase = getServiceClient()

  // bcrypt.hash turns the plain text password into a one-way hash.
  // The '10' is the salt rounds — higher = more secure but slower.
  // 10 is the industry standard default.
  const hashedPassword = await bcrypt.hash(password, 10)

  // Insert the new user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({ name, email, password: hashedPassword })
    .select('id, name, email')
    .single()

  if (userError) {
    const message = userError.message.includes('unique')
      ? 'An account with that email already exists'
      : userError.message
    return Response.json({ error: message }, { status: 400 })
  }

  // Create a blank profile for the new user so it exists when they first log in
  const { error: profileError } = await supabase.from('profiles').insert({
    id: user.id,
    name: user.name,
    target_roles: [],
    skills: [],
    deal_breakers: [],
  })

  if (profileError) {
    // Roll back the user row so there's no orphaned account with no profile
    await supabase.from('users').delete().eq('id', user.id)
    return Response.json({ error: 'Failed to create account. Please try again.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
