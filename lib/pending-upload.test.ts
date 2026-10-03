import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reportError } from '@/lib/report-error'

vi.mock('@/lib/report-error', () => ({ reportError: vi.fn() }))

// idb-keyval → an in-memory map per store (no IndexedDB in node). `createStore` must not be called at import time.
// `vi.mock` is hoisted above every import, so the state it closes over is hoisted with it.
const { idb, createStore, fail } = vi.hoisted(() => {
  const fail = { next: null as Error | null }
  return {
    idb: new Map<string, unknown>(),
    createStore: vi.fn((dbName: string, storeName: string) => `${dbName}/${storeName}`),
    fail,
  }
})
const maybeFail = () => {
  if (fail.next) {
    const error = fail.next
    fail.next = null
    throw error
  }
}
vi.mock('idb-keyval', () => ({
  createStore,
  get: vi.fn(async (key: string, store: string) => {
    maybeFail()
    return idb.get(`${store}:${key}`)
  }),
  set: vi.fn(async (key: string, value: unknown, store: string) => {
    maybeFail()
    idb.set(`${store}:${key}`, value)
  }),
  del: vi.fn(async (key: string, store: string) => {
    idb.delete(`${store}:${key}`)
  }),
}))

import {
  clearPendingUpload,
  isFreshUpload,
  isPendingUploadEntry,
  PENDING_UPLOAD_TTL_MS,
  stashPendingUpload,
  takePendingUpload,
} from './pending-upload'

const photo = () => new File(['jpeg bytes'], 'me.jpg', { type: 'image/jpeg' })

beforeEach(() => {
  idb.clear()
  fail.next = null
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('pending upload slot', () => {
  it('does not open IndexedDB at import time and uses its own database', async () => {
    expect(createStore).not.toHaveBeenCalled()
    await stashPendingUpload(photo())
    expect(createStore).toHaveBeenCalledTimes(1)
    expect(createStore).toHaveBeenCalledWith('diceify-pending-upload', 'pending')
    await takePendingUpload()
    expect(createStore).toHaveBeenCalledTimes(1)
  })

  it('round-trips the file and consumes it exactly once', async () => {
    const now = 1_000_000
    expect(await stashPendingUpload(photo(), now)).toBe(true)
    const taken = await takePendingUpload(now + 1000)
    expect(taken).toBeInstanceOf(File)
    expect(taken!.name).toBe('me.jpg')
    expect(taken!.type).toBe('image/jpeg')
    expect(await taken!.text()).toBe('jpeg bytes')
    expect(await takePendingUpload(now + 2000)).toBeNull()
  })

  it('drops an expired photo (and clears the slot)', async () => {
    const now = 1_000_000
    await stashPendingUpload(photo(), now)
    expect(await takePendingUpload(now + PENDING_UPLOAD_TTL_MS + 1)).toBeNull()
    expect(idb.size).toBe(0)
  })

  it('drops an entry it does not recognise', async () => {
    idb.set('diceify-pending-upload/pending:photo', { nope: true })
    expect(await takePendingUpload()).toBeNull()
    expect(idb.size).toBe(0)
  })

  it('returns null when there is nothing pending', async () => {
    expect(await takePendingUpload()).toBeNull()
  })

  it('clears on demand', async () => {
    await stashPendingUpload(photo())
    await clearPendingUpload()
    expect(await takePendingUpload()).toBeNull()
  })

  it('degrades to "nothing pending" when storage fails, and reports it', async () => {
    fail.next = new Error('quota')
    expect(await stashPendingUpload(photo())).toBe(false)
    expect(reportError).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ where: 'pending-upload' }))

    await stashPendingUpload(photo())
    fail.next = new Error('blocked')
    expect(await takePendingUpload()).toBeNull()
  })
})

describe('isFreshUpload', () => {
  it('accepts ages within the TTL and rejects older or future stamps', () => {
    expect(isFreshUpload({ savedAt: 100 }, 100)).toBe(true)
    expect(isFreshUpload({ savedAt: 100 }, 100 + PENDING_UPLOAD_TTL_MS)).toBe(true)
    expect(isFreshUpload({ savedAt: 100 }, 101 + PENDING_UPLOAD_TTL_MS)).toBe(false)
    expect(isFreshUpload({ savedAt: 200 }, 100)).toBe(false)
  })
})

describe('isPendingUploadEntry', () => {
  it('requires a Blob and the file metadata', () => {
    expect(isPendingUploadEntry({ blob: new Blob(['x']), name: 'a', type: 'image/png', savedAt: 1 })).toBe(true)
    expect(isPendingUploadEntry({ blob: 'x', name: 'a', type: 'image/png', savedAt: 1 })).toBe(false)
    expect(isPendingUploadEntry(null)).toBe(false)
    expect(isPendingUploadEntry('photo')).toBe(false)
  })
})
