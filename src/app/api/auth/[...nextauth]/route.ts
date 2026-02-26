import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { verifyUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.toString() ?? ''
        const password = credentials?.password?.toString() ?? ''

        if (!email || !password) {
          return null
        }

        const normalizedEmail = email.toLowerCase().trim()
        const clientIp = extractClientIp(req)
        const limitResult = rateLimit(`auth:${clientIp}:${normalizedEmail}`, 10, 60 * 1000)
        if (!limitResult.success) {
          return null
        }

        return verifyUser(normalizedEmail, password)
      }
    })
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET
})

export { handler as GET, handler as POST }

function extractClientIp(req: { headers?: Headers | Record<string, string | string[] | undefined> } | undefined): string {
  const forwardedFor = getHeader(req?.headers, 'x-forwarded-for')
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) return firstIp
  }

  const realIp = getHeader(req?.headers, 'x-real-ip')?.trim()
  if (realIp) return realIp

  return 'unknown'
}

function getHeader(
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
  name: string
): string | undefined {
  if (!headers) return undefined
  if ('get' in headers && typeof headers.get === 'function') {
    return headers.get(name) ?? undefined
  }

  const value = headers[name] ?? headers[name.toLowerCase()]
  if (Array.isArray(value)) return value[0]
  return value
}
