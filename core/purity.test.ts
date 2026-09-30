// Every module under core/ must load in plain Node (no DOM, no React, no app code).
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(full)
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.d.ts') ? [full] : []
  })
}

describe('core purity', () => {
  it('runs without a DOM', () => {
    expect('document' in globalThis).toBe(false)
    expect('ImageData' in globalThis).toBe(false)
  })

  const files = sourceFiles(__dirname)
  it('finds the core modules', () => {
    expect(files.length).toBeGreaterThanOrEqual(8)
    expect(files.some((f) => f.endsWith('dice/generate.ts'))).toBe(true)
  })

  for (const file of files) {
    it(`imports ${path.relative(__dirname, file)}`, async () => {
      const mod = await import(file)
      expect(typeof mod).toBe('object')
    })
  }
})
