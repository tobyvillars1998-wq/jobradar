import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { getServiceClient } from '@/lib/supabase'

// NextAuth configuration object.
// 'providers' defines how users can log in — we're using Credentials (email + password).
// NextAuth also supports Google, GitHub etc. but we're keeping it simple here.
const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const supabase = getServiceClient()

        // Look up the user by email
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single()

        if (error || !user) return null

        // bcrypt.compare hashes the submitted password and checks it against
        // the stored hash — we never store or compare plain text passwords
        const passwordMatch = await bcrypt.compare(credentials.password, user.password)
        if (!passwordMatch) return null

        // Return the user object — NextAuth puts this into the session token
        return { id: user.id, name: user.name, email: user.email }
      },
    }),
  ],

  // Callbacks let us customize what gets stored in the session.
  // By default NextAuth doesn't include the user ID — we add it here
  // so we can scope database queries to the logged-in user.
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token) session.user.id = token.id
      return session
    },
  },

  // Custom pages — tells NextAuth to use our login page instead of its default one
  pages: {
    signIn: '/login',
  },

  // JWT strategy means the session is stored in a signed cookie on the browser,
  // not in a database — simpler and works well on Vercel serverless functions
  session: {
    strategy: 'jwt',
  },

  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

// Next.js App Router requires named exports for each HTTP method
export { handler as GET, handler as POST }
