import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { countCompleted } from './build'
import {
  placedDiceCount,
  rasterSize,
  renderDefs,
  renderDieSymbolBody,
  renderGridSvg,
  renderProgressSvg,
  renderWindowSvg,
} from './svg'
import type { DiceGrid } from './types'

// 3×2 grid covering every face, one rotated die per color. rows[0] is the bottom row.
const grid: DiceGrid = {
  width: 3,
  height: 2,
  rows: [
    [{ face: 1, color: 'black' }, { face: 2, color: 'white', rotate90: true }, { face: 3, color: 'black' }],
    [{ face: 4, color: 'white' }, { face: 5, color: 'black', rotate90: true }, { face: 6, color: 'white' }],
  ],
}

describe('renderGridSvg', () => {
  // Frozen in A3/B1 while the legacy `DiceSVGRenderer.render` still existed: the two matched after whitespace
  // normalisation, so this snapshot carries that guarantee forward. Regenerate only when changing the markup on purpose.
  it('matches the frozen 3x2 snapshot (equal to the legacy renderer output)', () => {
    const expected = readFileSync(path.join(__dirname, '__fixtures__', 'svg-3x2.svg'), 'utf8')
    expect(renderGridSvg(grid)).toBe(expected)
  })

  it('emits a sized header instead of the fill-the-box style when width/height are given', () => {
    const svg = renderGridSvg(grid, { width: 300, height: 200 })
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" preserveAspectRatio="xMidYMid meet" width="300" height="200">')).toBe(true)
    expect(svg).not.toContain('style=')
    expect(svg).toContain('<rect width="3" height="2" fill="#000000" />')
  })

  it('honours a custom background', () => {
    expect(renderGridSvg(grid, { background: '#ffffff' })).toContain('fill="#ffffff"')
  })
})

describe('renderDieSymbolBody', () => {
  it('draws the dot count of the face and rotates around the die center', () => {
    for (let face = 1; face <= 6; face++) {
      const body = renderDieSymbolBody(face as 1 | 2 | 3 | 4 | 5 | 6, 'white')
      expect(body.match(/<circle /g)?.length ?? 0).toBe(face)
    }
    expect(renderDieSymbolBody(6, 'black', true).startsWith("<g transform='rotate(90 50 50)'>")).toBe(true)
    expect(renderDieSymbolBody(6, 'black').startsWith('<g>')).toBe(true)
  })
})

describe('renderDefs', () => {
  it('defines the 12 symbols with the ids the viewer references', () => {
    const defs = renderDefs()
    const ids = [...defs.matchAll(/<symbol id='([^']+)' viewBox='0 0 100 100'>/g)].map((m) => m[1])
    expect(ids).toEqual([
      ...[1, 2, 3, 4, 5, 6].map((f) => `dice-black-${f}`),
      ...[1, 2, 3, 4, 5, 6].map((f) => `dice-white-${f}`),
    ])
    expect(defs.startsWith('<defs>')).toBe(true)
    expect(defs.endsWith('</defs>')).toBe(true)
  })
})

describe('renderWindowSvg', () => {
  it('references symbols for the window (SVG rows), clamped to the grid', () => {
    const svg = renderWindowSvg(grid, { x0: -5, x1: 0, y0: 0, y1: 99 })
    expect(svg.startsWith('<defs>')).toBe(true)
    const uses = [...svg.matchAll(/<use [^>]*\/>/g)].map((m) => m[0])
    expect(uses).toEqual([
      "<use href='#dice-white-4' x='0' y='0' width='1' height='1'/>", // top row = grid y 1
      "<use href='#dice-black-1' x='0' y='1' width='1' height='1'/>",
    ])
  })

  it('rotates a rotate90 die around its own cell center', () => {
    const svg = renderWindowSvg(grid, { x0: 1, x1: 1, y0: 0, y1: 1 })
    expect(svg).toContain("<use href='#dice-black-5' x='1' y='0' width='1' height='1' transform='rotate(90 1.5 0.5)'/>")
    expect(svg).toContain("<use href='#dice-white-2' x='1' y='1' width='1' height='1' transform='rotate(90 1.5 1.5)'/>")
  })
})

describe('renderProgressSvg', () => {
  const dieCount = (svg: string) => (svg.match(/<svg x='/g) ?? []).length
  const placeholderCount = (svg: string) => (svg.match(/<rect x='/g) ?? []).length

  it('draws exactly countCompleted dice and placeholders for the rest', () => {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const progress = { x, y }
        const svg = renderProgressSvg(grid, progress)
        expect(dieCount(svg)).toBe(countCompleted(progress, grid.width))
        expect(placeholderCount(svg)).toBe(6 - countCompleted(progress, grid.width))
        expect(placedDiceCount(grid, progress)).toBe(countCompleted(progress, grid.width))
      }
    }
  })

  it('draws every die with showAll and uses the placeholder fill as background', () => {
    const svg = renderProgressSvg(grid, { x: 0, y: 0 }, { showAll: true })
    expect(dieCount(svg)).toBe(6)
    expect(placeholderCount(svg)).toBe(0)
    expect(svg).toContain('<rect width="3" height="2" fill="#eae3d2" />')
  })

  it('places the bottom-left die first (SVG row height-1)', () => {
    const svg = renderProgressSvg(grid, { x: 1, y: 0 }, { placeholderFill: '#fff', placeholderStroke: '#000' })
    expect(svg).toContain("<svg x='0' y='1' width='1' height='1'")
    expect(svg).toContain("<rect x='1' y='1' width='1' height='1' fill='#fff' stroke='#000' stroke-width='0.02' />")
  })

  it('caps placedDiceCount at the grid size', () => {
    expect(placedDiceCount(grid, { x: 0, y: 2 })).toBe(6)
  })
})

describe('rasterSize', () => {
  it('puts longSide on the longer axis and rounds the other', () => {
    expect(rasterSize(40, 30, 1080)).toEqual({ width: 1080, height: 810 })
    expect(rasterSize(30, 40, 1080)).toEqual({ width: 810, height: 1080 })
    expect(rasterSize(30, 30, 1080)).toEqual({ width: 1080, height: 1080 })
    expect(rasterSize(41, 30, 1080)).toEqual({ width: 1080, height: 790 })
  })
})
