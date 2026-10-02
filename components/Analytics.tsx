'use client'

import { useEffect } from 'react'
import { GoogleAnalytics } from '@next/third-parties/google'
import { GA_MEASUREMENT_ID, initAnalytics } from '@/lib/analytics'

/** Site-wide analytics, mounted once in the root layout: GA4's tag, and PostHog started on every page. */
export default function Analytics() {
  useEffect(() => initAnalytics(), [])
  return <GoogleAnalytics gaId={GA_MEASUREMENT_ID} />
}
