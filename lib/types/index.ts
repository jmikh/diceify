/**
 * Shared type definitions for the app. Dice types are defined once in `core/dice` and re-exported here so
 * existing `@/lib/types` importers keep working.
 */

export type { ColorMode, DiceParams, DiceStats, DiceGrid, AspectRatio } from '@/core/dice'

// Workflow types
export type WorkflowStep = 'upload' | 'crop' | 'tune' | 'build'
