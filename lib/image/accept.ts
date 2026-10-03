// Which photo files the editor takes. The one definition for every upload entry point (the editor's Start screen
// dropzone and the homepage hero), so they can never drift apart. Pure: no DOM.

/** MIME types a photo may have. */
export const ACCEPTED_IMAGE_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp']

/** File extensions matching `ACCEPTED_IMAGE_TYPES` (a file may carry an empty `type`; the extension then decides). */
export const ACCEPTED_IMAGE_EXTENSIONS: readonly string[] = ['.png', '.jpg', '.jpeg', '.webp']

/** Value for a plain `<input type="file" accept>`. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',')

/** react-dropzone's `accept` option (MIME → extensions). */
export const DROPZONE_ACCEPT: Record<string, string[]> = { 'image/*': [...ACCEPTED_IMAGE_EXTENSIONS] }

/** Human-readable list of the accepted formats ("PNG, JPG or WEBP"). */
export const ACCEPTED_FORMATS_LABEL = 'PNG, JPG or WEBP'

/** Whether `file` is a photo the editor can take: an accepted MIME type, or an accepted extension when the type is missing. */
export function isAcceptedImage(file: { type: string; name: string }): boolean {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())) return true
  const name = file.name.toLowerCase()
  return file.type === '' && ACCEPTED_IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext))
}
