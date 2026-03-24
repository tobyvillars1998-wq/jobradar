import { getServerSession } from 'next-auth'
import { getServiceClient } from '@/lib/supabase'

// GET /api/profile — return the logged-in user's account details and job search profile
export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('email', session.user.email)
    .single()

  if (userError || !user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('target_roles, skills, deal_breakers, min_salary, location')
    .eq('id', user.id)
    .limit(1)

  const profile = profiles?.[0] ?? null

  return Response.json({
    name: user.name,
    email: user.email,
    targetRoles: profile?.target_roles || [],
    skills: profile?.skills || [],
    dealBreakers: profile?.deal_breakers || [],
    minSalary: profile?.min_salary || '',
    location: profile?.location || [],
  })
}

// PATCH /api/profile — update account details and job search profile
export async function PATCH(req) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name, email, targetRoles, skills, dealBreakers, minSalary, location } = await req.json()

  if (!name?.trim() || !email?.trim()) {
    return Response.json({ error: 'Name and email are required' }, { status: 400 })
  }

  const supabase = getServiceClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email)
    .single()

  if (userError || !user) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  // If email is changing, make sure it isn't already taken
  if (email !== session.user.email) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()
    if (existing) {
      return Response.json({ error: 'Email already in use' }, { status: 409 })
    }
  }

  const [{ error: userUpdateError }, { error: profileUpdateError }] = await Promise.all([
    supabase
      .from('users')
      .update({ name: name.trim(), email: email.trim() })
      .eq('id', user.id),
    supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: name.trim(),
        target_roles: targetRoles || [],
        skills: skills || [],
        deal_breakers: dealBreakers || [],
        min_salary: minSalary || null,
        location: location || [],
      }),
  ])

  if (userUpdateError) {
    console.error('users update error:', userUpdateError)
    return Response.json({ error: userUpdateError.message }, { status: 500 })
  }
  if (profileUpdateError) {
    console.error('profiles update error:', profileUpdateError)
    return Response.json({ error: profileUpdateError.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
