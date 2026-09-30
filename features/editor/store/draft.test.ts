import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultDocument, DEFAULT_DICE_PARAMS } from '@/core/dice'

// idb-keyval → an in-memory map (no IndexedDB in node)
const idb = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => idb.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    idb.set(key, value)
  }),
  del: vi.fn(async (key: string) => {
    idb.delete(key)
  }),
}))

// localStorage → an in-memory map
const store = new Map<string, string>()
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, String(value))
  },
  removeItem: (key: string) => {
    store.delete(key)
  },
}

import { clearDraft, DRAFT_IMAGE_KEY, DRAFT_KEY, readDraft, readDraftImage, writeDraft, writeDraftImage } from './draft'

const PIXEL_GIF = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

beforeEach(() => {
  store.clear()
  idb.clear()
  vi.stubGlobal('localStorage', localStorageMock)
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('draft round trip', () => {
  it('writes and reads the document + name under the new key', () => {
    const doc = { ...createDefaultDocument(), step: 'tune' as const }
    writeDraft(doc, 'My dice')
    const draft = readDraft()
    expect(draft).toMatchObject({ doc, name: 'My dice' })
    expect(typeof draft!.savedAt).toBe('string')
    expect(store.has(DRAFT_KEY)).toBe(true)
  })

  it('stores the image blob in IndexedDB and clears both', async () => {
    const blob = new Blob(['jpeg'], { type: 'image/jpeg' })
    await writeDraftImage(blob)
    expect(await readDraftImage()).toBe(blob)
    writeDraft(createDefaultDocument(), 'x')
    await clearDraft()
    expect(readDraft()).toBeNull()
    expect(await readDraftImage()).toBeNull()
    expect(idb.has(DRAFT_IMAGE_KEY)).toBe(false)
  })

  it('returns null when nothing is stored', () => {
    expect(readDraft()).toBeNull()
  })
})

describe('legacy migration', () => {
  it('migrates a B3 `{ doc, name }` editorState into the new key and removes the legacy keys', () => {
    const doc = { ...createDefaultDocument(), step: 'build' as const, grid: { width: 10, height: 10 }, buildProgress: { x: 2, y: 1 } }
    store.set('editorState', JSON.stringify({ doc, name: 'Old' }))
    store.set('editorBuildProgress', JSON.stringify({ x: 9, y: 9 }))
    const draft = readDraft()
    expect(draft).toMatchObject({ doc, name: 'Old' })
    expect(store.has('editorState')).toBe(false)
    expect(store.has('editorBuildProgress')).toBe(false)
    expect(JSON.parse(store.get(DRAFT_KEY)!)).toMatchObject({ doc, name: 'Old' })
  })

  it('migrates the oldest flat snapshot, merging the separate progress key', () => {
    store.set(
      'editorState',
      JSON.stringify({
        step: 'build',
        cropParams: { x: 0, y: 0, width: 400, height: 300, rotation: 0 },
        diceParams: { ...DEFAULT_DICE_PARAMS, numRows: 30 },
        gridWidth: 40,
        gridHeight: 30,
        projectName: 'Snapshot',
      }),
    )
    store.set('editorBuildProgress', JSON.stringify({ x: 3, y: 2 }))
    const draft = readDraft()
    expect(draft!.name).toBe('Snapshot')
    expect(draft!.doc.step).toBe('build')
    expect(draft!.doc.dice.numRows).toBe(30)
    expect(draft!.doc.crop).toMatchObject({ width: 400, height: 300, aspectRatio: '4:3' })
    expect(draft!.doc.buildProgress).toEqual({ x: 3, y: 2 })
    expect(store.has('editorState')).toBe(false)
    expect(store.has('editorBuildProgress')).toBe(false)
  })

  it('prefers the new key when both exist', () => {
    writeDraft({ ...createDefaultDocument(), step: 'tune' }, 'New')
    store.set('editorState', JSON.stringify({ doc: createDefaultDocument(), name: 'Old' }))
    expect(readDraft()!.name).toBe('New')
  })

  it('converts a legacy data-URL image into a Blob in IndexedDB and drops the key', async () => {
    store.set('editorImage', PIXEL_GIF)
    const blob = await readDraftImage()
    expect(blob).toBeInstanceOf(Blob)
    expect(blob!.type).toBe('image/gif')
    expect(blob!.size).toBeGreaterThan(0)
    expect(store.has('editorImage')).toBe(false)
    expect(idb.get(DRAFT_IMAGE_KEY)).toBe(blob)
    // second read comes from IndexedDB
    expect(await readDraftImage()).toBe(blob)
  })
})

describe('corrupt data', () => {
  it('ignores corrupt JSON with a warning and removes it', () => {
    store.set(DRAFT_KEY, '{not json')
    expect(readDraft()).toBeNull()
    expect(console.warn).toHaveBeenCalled()
    expect(store.has(DRAFT_KEY)).toBe(false)
  })

  it('ignores a document that fails validation', () => {
    store.set(DRAFT_KEY, JSON.stringify({ doc: { schemaVersion: 99 }, name: 'x' }))
    expect(readDraft()).toBeNull()
    expect(console.warn).toHaveBeenCalled()
  })

  it('survives an unavailable localStorage', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {
        throw new Error('SecurityError')
      },
    })
    expect(readDraft()).toBeNull()
    expect(() => writeDraft(createDefaultDocument(), 'x')).not.toThrow()
  })
})
