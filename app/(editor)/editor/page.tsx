'use client'

import { Suspense } from 'react'
import { Dices } from 'lucide-react'
import EditorScreen from '@/features/editor/components/shell/EditorScreen'

// Suspense is required around useSearchParams (used by the editor bootstrap)
export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0014] to-black z-0" />
        <div className="relative z-10 flex flex-col items-center">
          <Dices className="w-12 h-12 text-accent-pink animate-spin mb-4" />
          <p className="text-white/60 font-medium">Loading editor...</p>
        </div>
      </div>
    }>
      <EditorScreen />
    </Suspense>
  )
}
