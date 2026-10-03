// Responsive webp variants for public/images (see lib/image-variants.ts for the naming scheme and the manifest).
// Idempotent: a variant is re-encoded only when missing or older than its source; orphaned variants are removed.

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { type ImageManifest, type ImageSourceEntry, candidateWidths, isVariantFile, variantPath } from '../../lib/image-variants'

export const IMAGES_DIR = 'public/images'
export const MANIFEST_PATH = 'lib/image-variants.manifest.json'

/** webp quality / cpu effort for the variants (dice patterns are high-frequency detail; 75 keeps the pips crisp). */
const WEBP_OPTIONS = { quality: 75, effort: 5 } as const

/** Every .webp under public/images (any depth) as `/images/<path>` (posix), sorted. Variants are not sources. */
export function listSourceImages(root: string): string[] {
  const dir = path.join(root, IMAGES_DIR)
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.webp') && !isVariantFile(e.name))
    .map((e) => '/' + path.relative(path.join(root, 'public'), path.join(e.parentPath, e.name)).split(path.sep).join('/'))
    .sort()
}

/** The manifest file contents (stable key order, trailing newline). */
export function serializeManifest(manifest: ImageManifest): string {
  return JSON.stringify(manifest, null, 2) + '\n'
}

export function readManifest(root: string): ImageManifest {
  return JSON.parse(readFileSync(path.join(root, MANIFEST_PATH), 'utf8'))
}

export interface GenerateResult {
  written: number
  skipped: number
  removed: number
  manifestChanged: boolean
}

/**
 * Writes the variants + manifest under `root`. A variant that would not be smaller (in bytes) than its source is not
 * kept: the original serves that width instead. Returns what it did (for the log line).
 */
export async function generateImageVariants(root: string): Promise<GenerateResult> {
  const result: GenerateResult = { written: 0, skipped: 0, removed: 0, manifestChanged: false }
  const manifest: Record<string, ImageSourceEntry> = {}
  const expected = new Set<string>()

  for (const src of listSourceImages(root)) {
    const sourceFile = path.join(root, 'public', src)
    const source = statSync(sourceFile)
    const { width } = await sharp(sourceFile).metadata()
    if (!width) throw new Error(`Cannot read the width of ${src}`)
    const variants: number[] = []

    for (const variantWidth of candidateWidths(width)) {
      const file = path.join(root, 'public', variantPath(src, variantWidth))
      const existing = existsSync(file) ? statSync(file) : null
      if (existing && existing.mtimeMs >= source.mtimeMs && existing.size < source.size) {
        result.skipped++
      } else {
        const encoded = await sharp(sourceFile).resize({ width: variantWidth }).webp(WEBP_OPTIONS).toBuffer()
        if (encoded.length >= source.size) continue // bigger than the original: pointless (orphan cleanup removes a stale one)
        mkdirSync(path.dirname(file), { recursive: true })
        writeFileSync(file, encoded)
        result.written++
      }
      variants.push(variantWidth)
      expected.add(file)
    }
    manifest[src] = { width, variants }
  }

  // Variants whose source is gone, shrank or no longer wants them would ship as dead files otherwise.
  for (const e of readdirSync(path.join(root, IMAGES_DIR), { recursive: true, withFileTypes: true })) {
    const file = path.join(e.parentPath, e.name)
    if (e.isFile() && isVariantFile(e.name) && !expected.has(file)) {
      unlinkSync(file)
      result.removed++
    }
  }

  const manifestFile = path.join(root, MANIFEST_PATH)
  const serialized = serializeManifest(manifest)
  if (!existsSync(manifestFile) || readFileSync(manifestFile, 'utf8') !== serialized) {
    writeFileSync(manifestFile, serialized)
    result.manifestChanged = true
  }
  return result
}
