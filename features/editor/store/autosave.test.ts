import { describe, expect, it } from 'vitest'
import { planSave, type SaveContext } from './autosave'

const ctx = (overrides: Partial<SaveContext>): SaveContext => ({
  boot: 'ready',
  projectId: null,
  hasImage: true,
  changed: true,
  ...overrides,
})

describe('planSave', () => {
  it.each<[string, Partial<SaveContext>, ReturnType<typeof planSave>]>([
    ['nothing while booting', { boot: 'booting', projectId: 'p' }, 'skip'],
    ['nothing when unchanged (project)', { projectId: 'p', changed: false }, 'skip'],
    ['nothing when unchanged (draft)', { changed: false }, 'skip'],
    ['the project row when a project is current', { projectId: 'p' }, 'cloud'],
    ['the project row even without an image in memory', { projectId: 'p', hasImage: false }, 'cloud'],
    ['the local draft when there is an image and no project', {}, 'draft'],
    ['nothing for an empty editor (never clobber a stored draft)', { hasImage: false }, 'skip'],
  ])('saves %s', (_label, overrides, expected) => {
    expect(planSave(ctx(overrides))).toBe(expected)
  })
})
