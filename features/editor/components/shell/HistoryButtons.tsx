'use client'

import { Redo2, Undo2 } from 'lucide-react'
import { useUndoRedo } from '@/features/editor/hooks/useUndoRedo'

const buttonClass =
    'w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white/5'

/** Undo/redo icon buttons for the desktop editor header. */
export default function HistoryButtons() {
    const { canUndo, canRedo, undo, redo } = useUndoRedo()
    return (
        <div className="flex items-center gap-2">
            <button onClick={undo} disabled={!canUndo} className={buttonClass} title="Undo (⌘Z)" aria-label="Undo">
                <Undo2 size={18} />
            </button>
            <button onClick={redo} disabled={!canRedo} className={buttonClass} title="Redo (⇧⌘Z)" aria-label="Redo">
                <Redo2 size={18} />
            </button>
        </div>
    )
}
