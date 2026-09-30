import Link from 'next/link'
import { Metadata } from 'next'
import Logo from '@/components/Logo'
import BackgroundOrbs from '@/components/BackgroundOrbs'
import { Home, AlertTriangle, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: '404 - Page Not Found',
  description: 'The page you are looking for does not exist.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0a0014] text-white">
      <BackgroundOrbs />

      {/* Main Content */}
      <div className="relative z-10 p-4 w-full max-w-lg">
        <div className="glass p-8 md:p-12 text-center border border-white/10 shadow-2xl backdrop-blur-xl rounded-3xl">

          {/* Icon/Logo area */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/5 p-4 rounded-full border border-white/10 shadow-[0_0_30px_rgb(var(--pink-rgb)/0.2)]">
              <AlertTriangle className="w-12 h-12 text-[var(--pink)]" />
            </div>
          </div>

          {/* Typography */}
          <h1 className="text-7xl font-bold mb-2 font-syne bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            404
          </h1>
          <h2 className="text-2xl font-semibold mb-6 text-white/90">
            Page Not Found
          </h2>
          <p className="text-[var(--text-muted)] mb-10 text-lg leading-relaxed">
            Oops! It looks like this page has rolled off the table.
            The content you're looking for doesn't exist or has been moved.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="group flex items-center justify-center gap-2 bg-[var(--pink)] hover:bg-[var(--pink-light)] text-white font-semibold py-3.5 px-8 rounded-full transition-all shadow-[0_0_20px_rgb(var(--pink-rgb)/0.3)] hover:shadow-[0_0_30px_rgb(var(--pink-rgb)/0.5)] transform hover:-translate-y-1"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col gap-4 items-center">
            <div className="opacity-80 scale-90">
              <Logo />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}