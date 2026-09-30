import { describe, expect, it } from 'vitest'
import { mapStorageError, projectImagePath } from './storage'

describe('projectImagePath', () => {
  it('is {uid}/{projectId}/original.jpg', () => {
    expect(projectImagePath('u1', 'p1')).toBe('u1/p1/original.jpg')
  })
})

describe('mapStorageError (storage-api puts the real code in the body, HTTP status is 400)', () => {
  it('keys on the body statusCode before the HTTP status', () => {
    expect(mapStorageError({ message: 'Object not found', status: 400, statusCode: '404' }).code).toBe('NOT_FOUND')
    expect(mapStorageError({ message: 'new row violates row-level security policy', status: 400, statusCode: '403' }).code).toBe(
      'FORBIDDEN',
    )
    expect(mapStorageError({ message: 'mime type not supported', status: 400, statusCode: '415' }).code).toBe('UNSUPPORTED_TYPE')
    expect(mapStorageError({ message: 'The resource already exists', status: 400, statusCode: '409' }).code).toBe('EXISTS')
    expect(mapStorageError({ message: 'too large', status: 400, statusCode: '413' }).code).toBe('TOO_LARGE')
  })

  it('prefers the service code when present', () => {
    expect(mapStorageError({ message: 'x', status: 400, statusCode: '400', code: 'NoSuchKey' }).code).toBe('NOT_FOUND')
    expect(mapStorageError({ message: 'x', status: 400, statusCode: '400', code: 'ResourceAlreadyExists' }).code).toBe('EXISTS')
  })

  it('falls back to the HTTP status, then to the RLS message, then UNKNOWN', () => {
    expect(mapStorageError({ message: 'x', status: 404 }).code).toBe('NOT_FOUND')
    expect(mapStorageError({ message: 'new row violates row-level security policy', status: 400, statusCode: '400' }).code).toBe(
      'FORBIDDEN',
    )
    const unknown = mapStorageError({ message: 'boom', status: 500, statusCode: '500' })
    expect(unknown.code).toBe('UNKNOWN')
    expect(unknown.status).toBe(500)
    expect(unknown.message).toBe('boom')
  })
})
