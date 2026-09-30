import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = path.resolve(fileURLToPath(new URL('.', import.meta.url)))

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'core/**/*.test.ts',
      'lib/**/*.test.ts',
      'features/**/*.test.ts',
      'supabase/functions/_shared/**/*.test.ts',
      'scripts/**/*.test.ts',
    ],
  },
  resolve: {
    alias: { '@': root },
  },
})
