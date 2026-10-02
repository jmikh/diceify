import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_DICE_PARAMS, type Die, type DiceGrid } from '@/core/dice'
import { track } from '@/lib/analytics'
import { trackStepChange } from './analytics'
import { moveTo } from './store/buildNavigation'
import { useDerivedStore } from './store/useDerivedStore'
import { useDocumentStore } from './store/useDocumentStore'

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }))

const die: Die = { color: 'black', face: 1 }
// 4 wide, 3 tall: 12 dice, so 25 % = build index 3
const grid: DiceGrid = { width: 4, height: 3, rows: Array.from({ length: 3 }, () => Array(4).fill(die)) }
const crop = { x: 0, y: 0, width: 100, height: 75, rotation: 0, aspectRatio: '4:3' as const }

const events = () => vi.mocked(track).mock.calls.map(([name]) => name)

beforeEach(() => {
  vi.mocked(track).mockClear()
  useDocumentStore.setState({ crop, dice: DEFAULT_DICE_PARAMS, buildProgress: { x: 0, y: 0 }, buildBaseline: null })
  useDerivedStore.getState().reset(null)
  useDerivedStore.getState().setGrid(grid, { blackCount: 12, whiteCount: 0, totalCount: 12 })
})

describe('trackStepChange', () => {
  it('crop → tune reports the crop only', () => {
    trackStepChange('crop', 'tune')
    expect(vi.mocked(track).mock.calls).toEqual([['crop_completed', { aspect_ratio: '4:3' }]])
  })

  it('tune → build reports the settings the user builds with', () => {
    trackStepChange('tune', 'build')
    expect(vi.mocked(track)).toHaveBeenCalledWith('tune_completed', expect.objectContaining({
      rows: DEFAULT_DICE_PARAMS.numRows,
      cols: 4,
      total_dice: 12,
      color_mode: DEFAULT_DICE_PARAMS.colorMode,
    }))
    expect(events()).toEqual(['tune_completed'])
  })

  it('crop → build (step tab) reports both; going back or staying reports nothing', () => {
    trackStepChange('crop', 'build')
    expect(events()).toEqual(['crop_completed', 'tune_completed'])
    vi.mocked(track).mockClear()
    trackStepChange('build', 'tune')
    trackStepChange('tune', 'crop')
    trackStepChange('tune', 'tune')
    expect(events()).toEqual([])
  })
})

describe('build moves', () => {
  const gate = { rowLimit: null, onBlocked: vi.fn() }

  it('the first forward move from the start is build_started; passing 25 % is a milestone', () => {
    moveTo({ x: 1, y: 0 }, gate)
    expect(vi.mocked(track).mock.calls).toEqual([['build_started', { total_dice: 12 }]])
    moveTo({ x: 3, y: 0 }, gate)
    expect(vi.mocked(track).mock.calls.at(-1)).toEqual(['build_progress', { percent: 25, total_dice: 12 }])
  })

  it('backward and blocked moves report nothing', () => {
    useDocumentStore.setState({ buildProgress: { x: 0, y: 2 } })
    moveTo({ x: 0, y: 0 }, gate)
    moveTo({ x: 0, y: 1 }, { rowLimit: 1, onBlocked: vi.fn() })
    expect(events()).toEqual([])
  })
})
