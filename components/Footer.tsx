'use client'

import Link from 'next/link'
import { FaTiktok, FaInstagram } from 'react-icons/fa'

export default function Footer() {
  return (
    <footer id="about" className="relative z-10 py-10 px-6 md:px-24 border-t border-[var(--border-glass)]">
      <div className="flex flex-col md:flex-row justify-between gap-10">
        {/* Brand + Socials */}
        <div className="flex flex-col gap-3">
          <p className="text-[var(--text-primary)] text-sm font-semibold">Diceify</p>
          <p className="text-[var(--text-dim)] text-sm max-w-[260px]">Turn any photo into buildable dice art.</p>
          <div className="flex gap-4 mt-1">
            <a
              href="https://www.tiktok.com/@diceify.art"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-dim)] text-lg no-underline hover:text-[var(--pink)] transition-colors"
            >
              <FaTiktok />
            </a>
            <a
              href="https://www.instagram.com/diceify.art/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-dim)] text-lg no-underline hover:text-[var(--pink)] transition-colors"
            >
              <FaInstagram />
            </a>
          </div>
        </div>

        {/* Link Columns */}
        <div className="flex gap-16 flex-wrap">
          {/* Product */}
          <div className="flex flex-col gap-2">
            <p className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-1">Product</p>
            <Link href="/editor" className="text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors">
              Editor
            </Link>
            <Link href="/gallery" className="text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors">
              Gallery
            </Link>
          </div>

          {/* Learn */}
          <div className="flex flex-col gap-2">
            <p className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-1">Learn</p>
            <Link href="/dice-art" className="text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors">
              Dice Art Guide
            </Link>
            <Link href="/blog" className="text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors">
              Blog
            </Link>
          </div>

          {/* Legal */}
          <div className="flex flex-col gap-2">
            <p className="text-[var(--text-muted)] text-xs font-semibold uppercase tracking-wider mb-1">Legal</p>
            <Link href="/privacy" className="text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors">
              Terms
            </Link>
            <a href="mailto:support@diceify.art" className="text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-[var(--border-glass)]">
        <p className="text-[var(--text-dim)] text-xs text-center">&copy; 2025 Diceify. Made for makers.</p>
      </div>
    </footer>
  )
}