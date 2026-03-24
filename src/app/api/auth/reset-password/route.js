import bcrypt from 'bcryptjs'
import { getServiceClient } from '@/lib/supabase'
import { rateLimit, clearRateLimit } from '@/lib/rateLimit'

export async function POST(req) {
  const { email, code, newPassword } = await req.json()

  if (!email || !code || !newPassword) {
    return Response.json({ error: 'All fields are required' }, { status: 400 })
  }

  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
    return Response.json({ error: 'Invalid code format' }, { status: 400 })
  }

  if (
    typeof newPassword !== 'string' ||
    newPassword.length < 8 ||
    !/[a-zA-Z]/.test(newPassword) ||
    !/[0-9]/.test(newPassword)
  ) {
    return Response.json(
      { error: 'Password must be at least 8 characters with a letter and a number' },
      { status: 400 }
    )
  }

  // 5 wrong guesses per email and the token is burned — must request a new code
  const { limited } = rateLimit(`reset:${email.toLowerCase()}`, 5, 15 * 60 * 1000)
  if (limited) {
    const supabase = getServiceClient()
    await supabase.from('password_resets').delete().eq('email', email)
    return Response.json({ error: 'Too many attempts. Request a new code.' }, { status: 429 })
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

  // Delete the used token and clear the attempt counter
  await supabase.from('password_resets').delete().eq('email', email)
  clearRateLimit(`reset:${email.toLowerCase()}`)

  return Response.json({ ok: true })
}
