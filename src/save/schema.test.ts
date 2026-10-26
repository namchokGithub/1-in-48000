import { describe, expect, it } from 'vitest'
import { playerSaveSchema } from './schema'

const validSave = {
  saveVersion: 1,
  contentVersion: '0.1.0',
  playerName: 'ฟ้า',
  currentTime: { year: 1, period: 'term1' },
  currentEventId: 'orientation',
  endingId: null,
  stats: { study: 50, money: 1200, health: 80, stress: 20, relationships: 50 },
  flags: { helped_friend: true },
  history: [{ eventId: 'orientation', choiceId: 'join_group' }],
  pendingEffects: [
    {
      sourceEventId: 'orientation',
      trigger: { type: 'atPeriod', time: { year: 1, period: 'term2' } },
      effect: { type: 'statDelta', stat: 'relationships', amount: 5 },
    },
  ],
  rngSeed: 12345,
  rngState: 12345,
}

describe('player save schema', () => {
  it('accepts a checkpoint with a pending effect and RNG state', () => {
    expect(playerSaveSchema.safeParse(validSave).success).toBe(true)
  })

  it('rejects an unsupported save version and missing content version', () => {
    expect(
      playerSaveSchema.safeParse({ ...validSave, saveVersion: 0 }).success,
    ).toBe(false)
    expect(
      playerSaveSchema.safeParse({ ...validSave, contentVersion: undefined })
        .success,
    ).toBe(false)
  })

  it('rejects a negative money balance and RNG values outside uint32', () => {
    expect(
      playerSaveSchema.safeParse({
        ...validSave,
        stats: { ...validSave.stats, money: -1 },
      }).success,
    ).toBe(false)
    expect(
      playerSaveSchema.safeParse({ ...validSave, rngState: 4_294_967_296 })
        .success,
    ).toBe(false)
  })
})
