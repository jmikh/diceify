// next/image loader for the static export (next.config.js `images.loaderFile`). Next calls it once per candidate width
// (`images.deviceSizes` + `imageSizes`) and builds the srcset from the results, so with a `sizes` prop the browser picks
// the smallest pre-generated variant that fills the slot. Anything without variants (external, data:, /favicon.svg,
// Supabase URLs) comes back unchanged, so every `next/image` in the repo keeps working.

import type { ImageLoaderProps } from 'next/image'
import { type ImageManifest, resolveImageSrc } from './image-variants'
import manifest from './image-variants.manifest.json'

const images: ImageManifest = manifest

export default function imageLoader({ src, width }: ImageLoaderProps): string {
  return resolveImageSrc(src, width, images)
}
