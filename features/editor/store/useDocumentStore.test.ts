import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_DICE_PARAMS, type CropParams, type ProjectDocument } from '@/core/dice'
import { resetEditor, uploadImage } from './editor'
import { useDerivedStore } from './useDerivedStore'
import { buildDocument, replaceDocument, useDocumentStore } from './useDocumentStore'
import { useEditorUiStore } from './useEditorUiStore'

const crop: CropParams = { x: 10, y: 20, width: 400, height: 300, rotation: 0, aspectRatio: '4:3' }

const doc = (): ProjectDocument => ({
  schemaVersion: 1,
  step: 'build',
  crop,
  dice: { ...DEFAULT_DICE_PARAMS, numRows: 40 },
  grid: { width: 53, height: 40 },
  buildProgress: { x: 7, y: 3 },
})

const store = () => useDocumentStore.getState()
const history = () => useDocumentStore.temporal.getState()

beforeEach(() => {
  useDocumentStore.setState({ crop: null, dice: DEFAULT_DICE_PARAMS, buildProgress: { x: 0, y: 0 }, buildBaseline: null, name: 'Untitled Project' })
  history().clear()
  useEditorUiStore.setState({ step: 'upload' })
  useDerivedStore.getState().reset(null)
})

describe('enterBuild', () => {
  it('resets progress when a dice param changed since the progress was made', () => {
    replaceDocument(doc(), 'p')
    store().updateDice({ contrast: 50 })
    store().enterBuild()
    expect(store().buildProgress).toEqual({ x: 0, y: 0 })
    expect(store().buildBaseline?.dice.contrast).toBe(50)
  })

  it('resets progress when the crop changed', () => {
    replaceDocument(doc(), 'p')
    store().updateCrop({ x: 11 })
    store().enterBuild()
    expect(store().buildProgress).toEqual({ x: 0, y: 0 })
  })

  it('keeps progress when nothing changed', () => {
    replaceDocument(doc(), 'p')
    store().enterBuild()
    expect(store().buildProgress).toEqual({ x: 7, y: 3 })
  })

  it('anchors the baseline so later progress applies', () => {
    store().setCrop(crop)
    store().enterBuild()
    store().setBuildProgress({ x: 4, y: 0 })
    store().enterBuild()
    expect(store().buildProgress).toEqual({ x: 4, y: 0 })
  })
})

describe('buildDocument', () => {
  it('composes the persisted document from all three stores', () => {
    replaceDocument(doc(), 'p')
    useEditorUiStore.setState({ step: 'build' })
    expect(buildDocument()).toEqual(doc())
  })

  it('zeroes progress that drifted from the baseline', () => {
    replaceDocument(doc(), 'p')
    store().updateDice({ gamma: 1.2 })
    expect(store().buildProgress).toEqual({ x: 7, y: 3 })
    expect(buildDocument().buildProgress).toEqual({ x: 0, y: 0 })
  })

  it('never persists the upload step', () => {
    useEditorUiStore.setState({ step: 'upload' })
    expect(buildDocument().step).toBe('crop')
  })
})

describe('history', () => {
  it('replaceDocument leaves no history and seeds the derived grid size', () => {
    store().updateDice({ contrast: 10 })
    expect(history().pastStates.length).toBe(1)
    replaceDocument(doc(), 'p')
    expect(history().pastStates.length).toBe(0)
    expect(useDerivedStore.getState().gridSize).toEqual({ width: 53, height: 40 })
    expect(useDerivedStore.getState().stats.totalCount).toBe(53 * 40)
    expect(store().name).toBe('p')
  })

  it('identical updates add no history entry', () => {
    store().updateDice({ contrast: DEFAULT_DICE_PARAMS.contrast })
    store().setCrop(null)
    expect(history().pastStates.length).toBe(0)
  })

  it('updateCrop without a crop is a no-op', () => {
    store().updateCrop({ aspectRatio: '16:9' })
    expect(store().crop).toBeNull()
    expect(history().pastStates.length).toBe(0)
  })

  it('progress and name are not tracked', () => {
    store().setBuildProgress({ x: 3, y: 1 })
    store().setBuildProgress((p) => ({ ...p, x: 4 }))
    store().setName('renamed')
    expect(history().pastStates.length).toBe(0)
  })

  it('undo restores dice and leaves progress and name alone', () => {
    replaceDocument(doc(), 'p')
    store().updateDice({ contrast: 30 })
    store().setBuildProgress({ x: 9, y: 9 })
    store().setName('after')
    history().undo()
    expect(store().dice.contrast).toBe(DEFAULT_DICE_PARAMS.contrast)
    expect(store().buildProgress).toEqual({ x: 9, y: 9 })
    expect(store().name).toBe('after')
    history().redo()
    expect(store().dice.contrast).toBe(30)
  })
})

describe('history is cleared by every document replacement', () => {
  it('uploadImage: a new image is not undoable back to the previous crop', () => {
    store().setCrop(crop)
    store().updateDice({ contrast: 10 })
    expect(history().pastStates.length).toBe(2)
    uploadImage('data:image/png;base64,new')
    expect(history().pastStates.length).toBe(0)
    expect(history().futureStates.length).toBe(0)
    expect(store().crop).toBeNull()
    expect(store().dice.contrast).toBe(10)
  })

  it('resetEditor clears past and future states', () => {
    store().updateDice({ contrast: 10 })
    history().undo()
    expect(history().futureStates.length).toBe(1)
    resetEditor()
    expect(history().pastStates.length).toBe(0)
    expect(history().futureStates.length).toBe(0)
  })
})
