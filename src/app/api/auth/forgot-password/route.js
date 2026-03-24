import nodemailer from 'nodemailer'
import { getServiceClient } from '@/lib/supabase'

export async function POST(req) {
  const { email } = await req.json()

  if (!email) {
    return Response.json({ error: 'Email is required' }, { status: 400 })
  }

  const supabase = getServiceClient()

  // Check the user exists — but always return ok to avoid leaking which emails are registered
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  if (user) {
    // Generate a 6-digit numeric code
    const token = Math.floor(100000 + Math.random() * 900000).toString()
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes

    // Delete any existing reset tokens for this email, then insert new one
    await supabase.from('password_resets').delete().eq('email', email)
    const { error: insertError } = await supabase.from('password_resets').insert({ email, token, expires_at })
    if (insertError) {
      console.error('password_resets insert failed:', insertError)
      return Response.json({ error: 'Failed to generate reset code' }, { status: 500 })
    }

    // Send the email
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    await transporter.sendMail({
      from: `"JobRadar" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Your JobRadar password reset code',
      text: `Your password reset code is: ${token}\n\nThis code expires in 15 minutes. If you didn't request a reset, you can ignore this email.`,
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
          <h2 style="color: #18181b;">JobRadar password reset</h2>
          <p style="color: #52525b;">Enter this code to reset your password:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #18181b; padding: 16px 0;">${token}</div>
          <p style="color: #71717a; font-size: 14px;">This code expires in 15 minutes. If you didn't request a reset, you can ignore this email.</p>
        </div>
      `,
    })
  }

  // Always return ok — don't reveal whether the email exists
  return Response.json({ ok: true })
}
