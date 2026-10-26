import { describe, expect, it } from 'vitest'
import { playerSaveSchema } from '../save/schema'
import { matchesAllConditions } from './conditions'

const save = playerSaveSchema.parse({
  saveVersion: 1,
  contentVersion: '0.1.0',
  playerName: 'ฟ้า',
  currentTime: { year: 2, period: 'term1' },
  currentEventId: 'exam',
  endingId: null,
  stats: { study: 60, money: 900, health: 75, stress: 30, relationships: 55 },
  flags: { joined_club: true },
  history: [{ eventId: 'orientation', choiceId: 'join_group' }],
  pendingEffects: [],
  rngSeed: 7,
  rngState: 7,
})

describe('conditions', () => {
  it('requires every year and stat condition to hold', () => {
    expect(
      matchesAllConditions(
        [
          { type: 'year', operator: 'gte', value: 2 },
          { type: 'stat', stat: 'study', operator: 'gt', value: 59 },
          { type: 'stat', stat: 'money', operator: 'lte', value: 900 },
        ],
        save,
      ),
    ).toBe(true)
    expect(
      matchesAllConditions(
        [{ type: 'stat', stat: 'stress', operator: 'lt', value: 30 }],
        save,
      ),
    ).toBe(false)
  })

  it('treats an unset flag as false and reads visited events from history', () => {
    expect(
      matchesAllConditions(
        [
          { type: 'flag', flagId: 'helped_friend', value: false },
          { type: 'pastEvent', eventId: 'orientation', visited: true },
          { type: 'pastEvent', eventId: 'exam', visited: false },
        ],
        save,
      ),
    ).toBe(true)
    expect(
      matchesAllConditions(
        [{ type: 'flag', flagId: 'joined_club', value: false }],
        save,
      ),
    ).toBe(false)
  })
})
