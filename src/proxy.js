import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'

export async function proxy(req) {
  // getToken reads and verifies the session cookie using NEXTAUTH_SECRET.
  // Returns the token object if the user is logged in, null if not.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  const { pathname } = req.nextUrl

  // Allow the request through if the user is logged in
  if (token) return NextResponse.next()

  // Redirect unauthenticated users to /login
  const loginUrl = new URL('/login', req.url)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  // Protect everything except the login page, NextAuth API routes,
  // and Next.js internal static assets
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
}
