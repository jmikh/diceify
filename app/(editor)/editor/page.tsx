'use client'

import EditorScreen from '@/features/editor/components/shell/EditorScreen'

// The bootstrap reads window.location.search directly (no useSearchParams), so no Suspense boundary is needed.
export default function EditorPage() {
  return <EditorScreen />
}
