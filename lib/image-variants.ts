// Responsive variants of the static images under public/images (pure logic; no fs, no React).
//
// `scripts/gen-image-variants.ts` (npm run images:variants, also `prebuild`/`predev`) writes `name.w<width>.webp` next
// to every .webp under public/images for each VARIANT_WIDTHS entry smaller than the source (never upscaled; the original
// serves the widths at and above its own) and keeps only variants that are smaller in bytes than their source (dice
// textures re-encode badly: a downscaled copy can be bigger than the original). lib/image-variants.manifest.json records
// each source's width and the variants that exist. The variants are gitignored build artifacts; the manifest is committed
// so the loader (lib/image-loader.ts) and the raw <img> srcSets resolve without running the generator first.

/** Candidate variant widths, ascending. Mirrors `images.deviceSizes` in next.config.js. */
export const VARIANT_WIDTHS = [320, 480, 640, 960, 1240] as const

export interface ImageSourceEntry {
  /** Intrinsic width of the original in px. */
  width: number
  /** Widths of the variants that were generated, ascending (a subset of VARIANT_WIDTHS below `width`). */
  variants: number[]
}

/** `/images/<path>.webp` → its entry. The shape of lib/image-variants.manifest.json. */
export type ImageManifest = Readonly<Record<string, ImageSourceEntry>>

const SOURCE_PATTERN = /^\/images\/.+\.webp$/
const VARIANT_PATTERN = /\.w\d+\.webp$/

/** True for `/images/<path>.webp` that is a source, not an already generated variant. */
export function isVariantSource(src: string): boolean {
  return SOURCE_PATTERN.test(src) && !VARIANT_PATTERN.test(src)
}

/** True for a generated variant file name (`name.w320.webp`). */
export function isVariantFile(name: string): boolean {
  return VARIANT_PATTERN.test(name)
}

/** `/images/a/b.webp` + 320 → `/images/a/b.w320.webp`. Works on file paths too (only the extension matters). */
export function variantPath(src: string, width: number): string {
  return src.replace(/\.webp$/, `.w${width}.webp`)
}

/** The candidate variant widths for a source of this width: every candidate strictly smaller than it. */
export function candidateWidths(sourceWidth: number): number[] {
  return VARIANT_WIDTHS.filter((w) => w < sourceWidth)
}

/**
 * The smallest existing variant at or above `requested`, or null when the request is served best by the original
 * (no variant is wide enough).
 */
export function pickVariantWidth(entry: ImageSourceEntry, requested: number): number | null {
  return entry.variants.find((w) => w >= requested) ?? null
}

/**
 * URL for `src` at `requested` CSS px. Variants exist only for sources in the manifest; anything else (external,
 * data:, /favicon.svg, Supabase URLs, unknown /images files) is returned unchanged.
 */
export function resolveImageSrc(src: string, requested: number, manifest: ImageManifest): string {
  const entry = manifest[src]
  if (entry === undefined || !isVariantSource(src)) return src
  const width = pickVariantWidth(entry, requested)
  return width === null ? src : variantPath(src, width)
}

/**
 * `srcSet` for a raw <img>: every variant plus the original at its own width, ascending.
 * Undefined for sources that are not in the manifest, so the attribute can be omitted.
 */
export function imageSrcSet(src: string, manifest: ImageManifest): string | undefined {
  const entry = manifest[src]
  if (entry === undefined || !isVariantSource(src)) return undefined
  const entries = entry.variants.map((w) => `${variantPath(src, w)} ${w}w`)
  entries.push(`${src} ${entry.width}w`)
  return entries.join(', ')
}
