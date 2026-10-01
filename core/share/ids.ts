// Share ids: short, URL-safe, unguessable slugs (`/s/<id>`). 32 symbols without the look-alikes l/o/0/1, so each
// random byte maps to one symbol without bias (`byte & 31`); 10 symbols = 50 bits.

export const SHARE_ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
export const SHARE_ID_LENGTH = 10

const SHARE_ID_PATTERN = new RegExp(`^[${SHARE_ID_ALPHABET}]{${SHARE_ID_LENGTH}}$`)

/** A share id from `SHARE_ID_LENGTH` random bytes (the caller supplies them: core has no `crypto`). */
export function shareIdFromBytes(bytes: Uint8Array): string {
  if (bytes.length < SHARE_ID_LENGTH) throw new Error(`shareIdFromBytes needs ${SHARE_ID_LENGTH} bytes`)
  let id = ''
  for (let i = 0; i < SHARE_ID_LENGTH; i++) id += SHARE_ID_ALPHABET[bytes[i] & 31]
  return id
}

export function isShareId(value: string): boolean {
  return SHARE_ID_PATTERN.test(value)
}
