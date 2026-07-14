// Human-readable autosave status, shared by the desktop project selector
// tooltip and the mobile menu

function formatSaveTime(date: Date): string {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 15) return 'Just now'
    if (seconds < 60) return `${seconds} seconds ago`
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
}

export function formatSaveStatus(isSaving: boolean, lastSaved: Date | null | undefined): string {
    if (isSaving) return 'Saving...'
    if (!lastSaved) return 'Not saved'
    return `Saved ${formatSaveTime(lastSaved)}`
}
