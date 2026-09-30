import { describe, expect, it } from 'vitest'
import { createDefaultDocument } from '@/core/dice'
import { ProjectLimitError, documentJson, parseProjectLimit, toProjectError } from './projects'

describe('parseProjectLimit', () => {
  it('parses the JSON string PostgREST forwards from the trigger detail', () => {
    expect(parseProjectLimit('{"current":1,"limit":1}')).toEqual({ current: 1, limit: 1 })
  })

  it('accepts an already-parsed object', () => {
    expect(parseProjectLimit({ current: 4, limit: 5 })).toEqual({ current: 4, limit: 5 })
  })

  it.each([
    ['garbage', 'not json'],
    ['null', null],
    ['undefined', undefined],
    ['missing fields', '{"current":1}'],
    ['wrong types', '{"current":"1","limit":"1"}'],
    ['array', '[1,1]'],
  ])('returns null for %s', (_label, input) => {
    expect(parseProjectLimit(input)).toBeNull()
  })
})

describe('toProjectError', () => {
  it('maps the limit trigger to ProjectLimitError with the counts', () => {
    const error = toProjectError({ code: 'P0001', message: 'PROJECT_LIMIT', details: '{"current":1,"limit":1}' })
    expect(error).toBeInstanceOf(ProjectLimitError)
    expect(error).toMatchObject({ current: 1, limit: 1 })
  })

  it('still yields a ProjectLimitError when the detail is unparsable', () => {
    const error = toProjectError({ code: 'P0001', message: 'PROJECT_LIMIT', details: 'oops' })
    expect(error).toBeInstanceOf(ProjectLimitError)
    expect(error).toMatchObject({ current: null, limit: null })
  })

  it('passes other P0001 errors and other codes through as plain errors', () => {
    const other = toProjectError({ code: 'P0001', message: 'IMAGE_PATH_IMMUTABLE', details: '' })
    expect(other).not.toBeInstanceOf(ProjectLimitError)
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
