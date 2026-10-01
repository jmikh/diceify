// The `project-images` bucket, RLS-scoped to the owner's folder. Per project: the immutable original at
// `{uid}/{projectId}/original.jpg` (downloaded as a Blob, rendered through an object URL) and a small `preview.jpg`
// thumbnail of the cropped photo next to it (overwritten whenever the crop changes, shown in lists through signed URLs).
//
// storage-api answers most failures with HTTP 400 and the real code in the body (`statusCode: '403' | '404' |
// '415'`, C1 finding); storage-js exposes that body code as `StorageApiError.statusCode`, so mapping keys on it and
// falls back to the HTTP status.

import { getSupabase } from './client'

export const PROJECT_IMAGES_BUCKET = 'project-images'

export function projectImagePath(userId: string, projectId: string): string {
  return `${userId}/${projectId}/original.jpg`
}

export function projectPreviewPath(userId: string, projectId: string): string {
  return `${userId}/${projectId}/preview.jpg`
}

/** The thumbnail lives next to the original: same folder, `preview.jpg`. */
export function previewPathFor(imagePath: string): string {
  return imagePath.replace(/[^/]*$/, 'preview.jpg')
}

export type ProjectStorageErrorCode = 'NOT_FOUND' | 'FORBIDDEN' | 'UNSUPPORTED_TYPE' | 'TOO_LARGE' | 'EXISTS' | 'UNKNOWN'

export class ProjectStorageError extends Error {
  constructor(
    readonly code: ProjectStorageErrorCode,
    message: string,
    readonly status: number | undefined,
  ) {
    super(message)
    this.name = 'ProjectStorageError'
  }
}

/** The fields of storage-js's `StorageError` this mapping reads (kept structural so the mapping is testable). */
export interface StorageErrorLike {
  message: string
  /** HTTP status of the response. */
  status?: number
  /** `statusCode` from the response body (the real code), or the HTTP status as a string. */
  statusCode?: string
  /** Service code such as `NoSuchKey`, `AccessDenied`, `ResourceAlreadyExists`. */
  code?: string
}

const CODE_BY_STATUS: Record<string, ProjectStorageErrorCode> = {
  '400': 'UNKNOWN',
  '403': 'FORBIDDEN',
  '404': 'NOT_FOUND',
  '409': 'EXISTS',
  '413': 'TOO_LARGE',
  '415': 'UNSUPPORTED_TYPE',
}

const CODE_BY_SERVICE_CODE: Record<string, ProjectStorageErrorCode> = {
  NoSuchKey: 'NOT_FOUND',
  NoSuchBucket: 'NOT_FOUND',
  AccessDenied: 'FORBIDDEN',
  Unauthorized: 'FORBIDDEN',
  ResourceAlreadyExists: 'EXISTS',
  KeyAlreadyExists: 'EXISTS',
  EntityTooLarge: 'TOO_LARGE',
  InvalidMimeType: 'UNSUPPORTED_TYPE',
  invalid_mime_type: 'UNSUPPORTED_TYPE',
}

export function mapStorageError(error: StorageErrorLike): ProjectStorageError {
  const status = Number.isFinite(error.status) ? error.status : undefined
  const code: ProjectStorageErrorCode =
    (error.code ? CODE_BY_SERVICE_CODE[error.code] : undefined) ??
    (error.statusCode ? CODE_BY_STATUS[error.statusCode] : undefined) ??
    (status !== undefined ? CODE_BY_STATUS[String(status)] : undefined) ??
    'UNKNOWN'
  // storage-api spells the RLS violation as "new row violates row-level security policy" (statusCode 403)
  const resolved = code === 'UNKNOWN' && /row-level security/i.test(error.message) ? 'FORBIDDEN' : code
  return new ProjectStorageError(resolved, error.message, status)
}

function bucket() {
  return getSupabase().storage.from(PROJECT_IMAGES_BUCKET)
}

/** Upload the project's original. Never overwrites: the path belongs to exactly one project. */
export async function uploadProjectImage(path: string, blob: Blob): Promise<void> {
  const { error } = await bucket().upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw mapStorageError(error)
}

export async function downloadProjectImage(path: string): Promise<Blob> {
  const { data, error } = await bucket().download(path)
  if (error) throw mapStorageError(error)
  return data
}

/** Write (or replace) the project's thumbnail. */
export async function uploadProjectPreview(path: string, blob: Blob): Promise<void> {
  const { error } = await bucket().upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (error) throw mapStorageError(error)
}

/** Signed URLs by path; paths without an object (or refused) are left out. */
export async function signedUrls(paths: string[], expiresInSeconds = 3600): Promise<Map<string, string>> {
  const urls = new Map<string, string>()
  if (paths.length === 0) return urls
  const { data, error } = await bucket().createSignedUrls(paths, expiresInSeconds)
  if (error) throw mapStorageError(error)
  for (const entry of data) {
    if (!entry.error && entry.path && entry.signedUrl) urls.set(entry.path, entry.signedUrl)
  }
  return urls
}

/** Remove the objects; missing ones are not an error (the row may have outlived them, or vice versa). */
export async function removeProjectObjects(paths: string[]): Promise<void> {
  const { error } = await bucket().remove(paths)
  if (!error) return
  const mapped = mapStorageError(error)
  if (mapped.code !== 'NOT_FOUND') throw mapped
}
