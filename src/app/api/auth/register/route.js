import bcrypt from 'bcryptjs'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req) {
  const { name, email, password } = await req.json()

  if (!name || !email || !password) {
    return Response.json({ error: 'All fields are required' }, { status: 400 })
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
  await supabase.from('profiles').insert({
    id: user.id,
    name: user.name,
    target_roles: [],
    skills: [],
    deal_breakers: [],
  })

  return Response.json({ ok: true })
}
