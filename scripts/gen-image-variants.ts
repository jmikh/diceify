// Writes the responsive variants of public/images/**/*.webp + lib/image-variants.manifest.json.
// Run: npm run images:variants (also runs as `prebuild`/`predev`). Idempotent; variants are gitignored, the manifest is committed.

import path from 'node:path'
import { generateImageVariants } from './image-variants/generate'

const ROOT = path.resolve(__dirname, '..')

generateImageVariants(ROOT)
  .then(({ written, skipped, removed, manifestChanged }) => {
    if (written || removed || manifestChanged) {
      console.log(
        `image variants: ${written} written, ${skipped} up to date, ${removed} removed` +
          (manifestChanged ? ', manifest updated' : ''),
      )
    }
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
