import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Editor',
  description: 'Turn any picture into dice art. Free online generator with step-by-step build instructions for stunning dice portraits.',
  openGraph: {
    title: 'Diceify | Editor',
    description: 'Turn any picture into dice art. Free online generator with step-by-step build instructions for stunning dice portraits.',
    url: 'https://diceify.art/editor',
  },
  twitter: {
    title: 'Diceify | Editor',
    description: 'Turn any picture into dice art. Free online generator with step-by-step build instructions for stunning dice portraits.',
  },
}

import { auth } from '@/lib/auth'
import { SessionProvider } from 'next-auth/react'
import { AnalyticsTracker } from '@/components/Analytics/AnalyticsTracker'

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <SessionProvider session={session}>
      {children}
      <AnalyticsTracker user={session?.user} />
    </SessionProvider>
  )
}