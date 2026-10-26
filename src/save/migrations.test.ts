import { describe, expect, it } from 'vitest'
import { playerSaveSchema } from './schema'
import { loadStoredSave } from './migrations'

const save = playerSaveSchema.parse({
  saveVersion: 2,
  contentVersion: '0.3.0',
  backgroundId: 'balanced',
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
    expect(loadStoredSave(JSON.stringify(save), '0.3.0')).toEqual(save)
  })

  it('migrates a v1 save without changing stats, pending effects, or RNG state', () => {
    const oldSave = {
      ...save,
      saveVersion: 1,
      contentVersion: '0.1.0',
      pendingEffects: [
        {
          sourceEventId: 'orientation',
          trigger: { type: 'atPeriod', time: { year: 1, period: 'term2' } },
          effect: { type: 'statDelta', stat: 'study', amount: 5 },
        },
      ],
      rngState: 987654321,
    }
    const oldRaw = JSON.stringify(oldSave, (key, value) =>
      key === 'backgroundId' ? undefined : value,
    )
    const migrated = loadStoredSave(oldRaw, '0.3.0')

    expect(migrated.saveVersion).toBe(2)
    expect(migrated.contentVersion).toBe('0.3.0')
    expect(migrated.backgroundId).toBeNull()
    expect(migrated.stats).toEqual(oldSave.stats)
    expect(migrated.pendingEffects).toEqual(oldSave.pendingEffects)
    expect(migrated.rngState).toBe(987654321)
  })

  it('migrates a v2 save from the earlier sample content without changing progress', () => {
    const earlier = { ...save, contentVersion: '0.2.0' }
    const migrated = loadStoredSave(JSON.stringify(earlier), '0.3.0')
    expect(migrated).toEqual({ ...earlier, contentVersion: '0.3.0' })
  })

  it('rejects unsupported save versions rather than guessing their shape', () => {
    expect(() =>
      loadStoredSave(JSON.stringify({ ...save, saveVersion: 0 }), '0.3.0'),
    ).toThrow('Unsupported save version: 0')
  })

  it('rejects malformed JSON and missing RNG state', () => {
    expect(() => loadStoredSave('{', '0.3.0')).toThrow()
    expect(() =>
      loadStoredSave(JSON.stringify({ ...save, rngState: undefined }), '0.3.0'),
    ).toThrow()
  })

  it('rejects content version mismatch without changing the stored save', () => {
    expect(() => loadStoredSave(JSON.stringify(save), '0.4.0')).toThrow(
      'Content version mismatch',
    )
  })
})
