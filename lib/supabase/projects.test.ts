import { describe, expect, it } from 'vitest'
import { createDefaultDocument } from '@/core/dice'
import { documentJson, toProjectError } from './projects'

describe('toProjectError', () => {
  it('turns a PostgREST error object into an Error that keeps its code', () => {
    const other = toProjectError({ code: 'P0001', message: 'IMAGE_PATH_IMMUTABLE', details: '' })
    expect(other).toBeInstanceOf(Error)
    expect(other.message).toBe('IMAGE_PATH_IMMUTABLE')
    const rls = toProjectError({ code: '42501', message: 'new row violates row-level security policy', details: '' })
    expect(rls).toBeInstanceOf(Error)
    expect(rls).toMatchObject({ code: '42501' })
  })
})

describe('documentJson', () => {
  it('drops undefined members and keeps the document intact', () => {
    const doc = createDefaultDocument()
    const json = documentJson({ ...doc, grid: undefined as unknown as null })
    expect(json).not.toHaveProperty('grid')
    expect(documentJson(doc)).toEqual(doc)
  })
})
