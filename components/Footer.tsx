'use client'

import Link from 'next/link'
import { FaTiktok, FaInstagram } from 'react-icons/fa'

export default function Footer() {
  return (
    <footer id="about" className="relative z-10 py-6 px-6 md:px-24 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-[var(--border-glass)]">
      {/* Left side: Copyright + Socials */}
      <div className="flex flex-col items-center md:items-start gap-3">
        <p className="text-[var(--text-dim)] text-sm">&copy; 2025 Diceify. Made for makers.</p>
        <div className="flex gap-4">
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

      {/* Right side: Legal links */}
      <ul className="flex gap-4 list-none">
        <li>
          <Link
            href="/privacy"
            className="text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors"
          >
            Privacy
          </Link>
        </li>
        <li>
          <Link
            href="/terms"
            className="text-[var(--text-dim)] text-sm no-underline hover:text-[var(--pink)] transition-colors"
          >
            Terms
          </Link>
        </li>
      </ul>
    </footer>
  )
}