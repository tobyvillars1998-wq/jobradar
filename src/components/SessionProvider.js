'use client'

// NextAuth's SessionProvider uses React context to make the session
// available anywhere in the app via the useSession() hook.
// It must be a client component, which is why it's separate from layout.js.
import { SessionProvider } from 'next-auth/react'

export default function AuthSessionProvider({ children }) {
  return <SessionProvider>{children}</SessionProvider>
}
