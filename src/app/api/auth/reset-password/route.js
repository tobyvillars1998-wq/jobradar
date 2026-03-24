import bcrypt from 'bcryptjs'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req) {
  const { email, code, newPassword } = await req.json()

  if (!email || !code || !newPassword) {
    return Response.json({ error: 'All fields are required' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // Look up the reset token
  const { data: reset } = await supabase
    .from('password_resets')
    .select('token, expires_at')
    .eq('email', email)
    .single()

  if (!reset || reset.token !== code) {
    return Response.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  if (new Date(reset.expires_at) < new Date()) {
    return Response.json({ error: 'Invalid or expired code' }, { status: 400 })
  }

  // Hash the new password and update the user
  const hashedPassword = await bcrypt.hash(newPassword, 10)

  const { error: updateError } = await supabase
    .from('users')
    .update({ password: hashedPassword })
    .eq('email', email)

  if (updateError) {
    return Response.json({ error: 'Failed to update password' }, { status: 500 })
  }

  // Delete the used token
  await supabase.from('password_resets').delete().eq('email', email)

  return Response.json({ ok: true })
}
