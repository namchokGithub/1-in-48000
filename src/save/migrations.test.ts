import { describe, expect, it } from 'vitest'
import { playerSaveSchema } from './schema'
import { loadStoredSave } from './migrations'

const save = playerSaveSchema.parse({
  saveVersion: 1,
  contentVersion: '0.1.0',
  playerName: 'ฟ้า',
  currentTime: { year: 1, period: 'term1' },
  currentEventId: 'orientation',
  endingId: null,
  stats: { study: 50, money: 1200, health: 80, stress: 20, relationships: 50 },
  flags: {},
  history: [],
  pendingEffects: [],
  rngSeed: 12345,
  rngState: 12345,
})

describe('save loading and migration boundary', () => {
  it('accepts a valid current save', () => {
    expect(loadStoredSave(JSON.stringify(save), '0.1.0')).toEqual(save)
  })

  it('rejects unsupported older saves rather than guessing their shape', () => {
    expect(() =>
      loadStoredSave(JSON.stringify({ ...save, saveVersion: 0 }), '0.1.0'),
    ).toThrow('Unsupported save version: 0')
  })

  it('rejects malformed JSON and missing RNG state', () => {
    expect(() => loadStoredSave('{', '0.1.0')).toThrow()
    expect(() =>
      loadStoredSave(JSON.stringify({ ...save, rngState: undefined }), '0.1.0'),
    ).toThrow()
  })

  it('rejects content version mismatch without changing the stored save', () => {
    expect(() => loadStoredSave(JSON.stringify(save), '0.2.0')).toThrow(
      'Content version mismatch',
    )
  })
})
