import { getServerSession } from 'next-auth'
import { getServiceClient } from '@/lib/supabase'

// POST /api/profile/skills — append a single skill to the user's profile
export async function POST(req) {
  const session = await getServerSession()
  if (!session?.user?.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { skill } = await req.json()
  if (!skill?.trim()) {
    return Response.json({ error: 'Skill is required' }, { status: 400 })
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

  // Fetch current skills so we can append without duplicating
  const { data: profiles } = await supabase
    .from('profiles')
    .select('skills')
    .eq('id', user.id)
    .limit(1)

  const current = profiles?.[0]?.skills || []
  const trimmed = skill.trim()

  if (current.includes(trimmed)) {
    return Response.json({ ok: true, alreadyExists: true })
  }

  const { error } = await supabase
    .from('profiles')
    .update({ skills: [...current, trimmed] })
    .eq('id', user.id)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ ok: true })
}
