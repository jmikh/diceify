import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_DICE_PARAMS } from '@/core/dice'
import { documentHistoryBatcher } from './historyBatcher'
import { useDocumentStore } from './useDocumentStore'

const store = () => useDocumentStore.getState()
const history = () => useDocumentStore.temporal.getState()
const { startInteraction, endInteraction, batchAction, untracked } = documentHistoryBatcher

beforeEach(() => {
  useDocumentStore.setState({ crop: null, dice: DEFAULT_DICE_PARAMS, buildProgress: { x: 0, y: 0 }, buildBaseline: null })
  history().clear()
  history().resume()
})

describe('historyBatcher', () => {
  it('collapses a 20-update drag into one past state that undoes to the pre-drag value', () => {
    startInteraction()
    for (let i = 1; i <= 20; i++) batchAction(() => store().updateDice({ contrast: i }))
    endInteraction()

    expect(store().dice.contrast).toBe(20)
    expect(history().pastStates.length).toBe(1)
    expect(history().isTracking).toBe(true)
    history().undo()
    expect(store().dice.contrast).toBe(DEFAULT_DICE_PARAMS.contrast)
  })

  it('records nothing for an interaction whose updates change nothing', () => {
    startInteraction()
    batchAction(() => store().updateDice({ contrast: DEFAULT_DICE_PARAMS.contrast }))
    batchAction(() => store().updateDice({ contrast: DEFAULT_DICE_PARAMS.contrast }))
    endInteraction()
    expect(history().pastStates.length).toBe(0)
    expect(history().isTracking).toBe(true)
  })

  it('latches on the first update that actually records history', () => {
    startInteraction()
    batchAction(() => store().updateDice({ contrast: DEFAULT_DICE_PARAMS.contrast })) // no-op click on the thumb
    batchAction(() => store().updateDice({ contrast: 5 }))
    batchAction(() => store().updateDice({ contrast: 6 }))
    endInteraction()
    expect(history().pastStates.length).toBe(1)
  })

  it('nested interactions share one entry and resume tracking only when the outermost ends', () => {
    startInteraction()
    batchAction(() => store().updateDice({ contrast: 1 }))
    startInteraction()
    batchAction(() => store().updateDice({ gamma: 1.2 }))
    endInteraction()
    expect(history().isTracking).toBe(false)
    batchAction(() => store().updateDice({ contrast: 2 }))
    endInteraction()
    expect(history().isTracking).toBe(true)
    expect(history().pastStates.length).toBe(1)
  })

  it('batchAction outside an interaction is a plain tracked update', () => {
    batchAction(() => store().updateDice({ contrast: 1 }))
    batchAction(() => store().updateDice({ contrast: 2 }))
    expect(history().pastStates.length).toBe(2)
  })

  it('untracked records nothing and keeps the redo stack', () => {
    store().updateDice({ contrast: 10 })
    history().undo()
    expect(history().futureStates.length).toBe(1)

    untracked(() => store().updateDice({ gamma: 1.3 }))
    expect(history().pastStates.length).toBe(0)
    expect(history().futureStates.length).toBe(1)
    expect(history().isTracking).toBe(true)
  })

  it('untracked inside a latched interaction leaves it paused', () => {
    startInteraction()
    batchAction(() => store().updateDice({ contrast: 1 }))
    untracked(() => store().updateDice({ gamma: 1.3 }))
    expect(history().isTracking).toBe(false)
    endInteraction()
    expect(history().isTracking).toBe(true)
  })
})
