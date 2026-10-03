import { describe, expect, it } from 'vitest'
import { ACCEPT_ATTRIBUTE, DROPZONE_ACCEPT, isAcceptedImage } from './accept'

describe('isAcceptedImage', () => {
  it('accepts PNG, JPEG and WEBP by MIME type', () => {
    expect(isAcceptedImage({ type: 'image/png', name: 'a.png' })).toBe(true)
    expect(isAcceptedImage({ type: 'image/jpeg', name: 'photo' })).toBe(true)
    expect(isAcceptedImage({ type: 'image/webp', name: 'a.webp' })).toBe(true)
    expect(isAcceptedImage({ type: 'IMAGE/JPEG', name: 'a.JPG' })).toBe(true)
  })

  it('rejects other types, even with a matching extension', () => {
    expect(isAcceptedImage({ type: 'image/gif', name: 'a.gif' })).toBe(false)
    expect(isAcceptedImage({ type: 'image/heic', name: 'a.heic' })).toBe(false)
    expect(isAcceptedImage({ type: 'application/pdf', name: 'a.png' })).toBe(false)
  })

  it('falls back to the extension when the type is missing', () => {
    expect(isAcceptedImage({ type: '', name: 'a.JPEG' })).toBe(true)
    expect(isAcceptedImage({ type: '', name: 'a.heic' })).toBe(false)
  })
})

describe('accept descriptors', () => {
  it('derive from the same lists', () => {
    expect(ACCEPT_ATTRIBUTE).toBe('image/png,image/jpeg,image/webp')
    expect(DROPZONE_ACCEPT).toEqual({ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] })
  })
})
