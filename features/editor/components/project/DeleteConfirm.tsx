'use client'

import { useState } from 'react'

interface DeleteConfirmProps {
  name: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}

/** The second step of deleting a project: "Delete “name”?" with Delete / Cancel. */
export default function DeleteConfirm({ name, onConfirm, onCancel }: DeleteConfirmProps) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-sm text-white/80 truncate min-w-0">Delete “{name}”?</span>
      <button
        onClick={async () => {
          setBusy(true)
          await onConfirm()
          setBusy(false)
        }}
        disabled={busy}
        className="h-8 px-3 flex-shrink-0 rounded-full bg-red-500/15 border border-red-400/40 text-red-300 text-[13px] font-semibold hover:bg-red-500/25 disabled:opacity-50"
      >
        Delete
      </button>
      <button onClick={onCancel} className="h-8 px-2.5 flex-shrink-0 rounded-full text-[13px] text-white/70 hover:text-white">
        Cancel
      </button>
    </div>
  )
}
