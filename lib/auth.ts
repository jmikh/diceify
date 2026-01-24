import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

// Helper function to fetch birthday from Google People API
async function fetchGoogleBirthday(accessToken: string): Promise<Date | null> {
  try {
    const response = await fetch(
      'https://people.googleapis.com/v1/people/me?personFields=birthdays',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch birthday from Google:', response.status)
      return null
    }

    const data = await response.json()
    const birthdays = data.birthdays

    if (!birthdays || birthdays.length === 0) {
      return null
    }

    // Find the birthday with a year (some Google accounts only have month/day)
    const birthdayWithYear = birthdays.find((b: any) => b.date?.year)
    const birthday = birthdayWithYear || birthdays[0]

    if (birthday?.date) {
      const { year, month, day } = birthday.date
      // If no year, we can't create a proper date - return null
      if (!year) return null
      // Google months are 1-indexed, JavaScript months are 0-indexed
      return new Date(year, month - 1, day)
    }

    return null
  } catch (error) {
    console.error('Error fetching Google birthday:', error)
    return null
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/user.birthday.read',
        },
      },
    }),
  ],
  callbacks: {
    session: async ({ session, token }) => {
      if (session?.user && token?.sub) {
        session.user.id = token.sub

        // Always fetch fresh Pro status from DB to ensure accuracy
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { isPro: true }
          })
          session.user.isPro = user?.isPro ?? false
        } catch (e) {
          console.error("Failed to fetch user pro status", e)
          // Fallback to token if DB fails
          session.user.isPro = token.isPro as boolean
        }

        // Pass through the image and name from the token
        if (token.picture) {
          session.user.image = token.picture as string
        }
        if (token.name) {
          session.user.name = token.name as string
        }
      }
      return session
    },
    jwt: async ({ user, token, account, profile, trigger }) => {
      if (user) {
        token.uid = user.id as string
        token.isPro = user.isPro
        token.picture = user.image
        token.name = user.name
      }

      // Update token if account/profile changes (like on sign in)
      if (account && profile) {
        token.picture = (profile as any).picture || (profile as any).image || user?.image
        token.name = (profile as any).name || user?.name

        // Fetch and store birthday from Google on sign in
        if (account.provider === 'google' && account.access_token && token.sub) {
          const birthday = await fetchGoogleBirthday(account.access_token)
          if (birthday) {
            try {
              await prisma.user.update({
                where: { id: token.sub },
                data: { birthday },
              })
            } catch (error) {
              console.error('Failed to save birthday:', error)
            }
          }
        }
      }

      // Re-fetch user data from database when session is updated (e.g. after Pro upgrade)
      if (trigger === "update" && token.sub) {
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: { isPro: true }
          })

          if (freshUser) {
            token.isPro = freshUser.isPro
          }
        } catch (error) {
          console.error("Failed to refresh user data in JWT callback:", error)
        }
      }

      return token
    },
  },
  session: {
    strategy: "jwt",
  },
})