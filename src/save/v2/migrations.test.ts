import { describe, expect, it } from 'vitest'
import { loadV2Save } from './migrations'
import { v2PlayerSaveSchema } from './schema'

const oldSave = {
  saveVersion: 2,
  contentVersion: '0.4.0',
  playerName: 'ฟ้า',
  backgroundId: 'balanced',
  currentTime: { year: 2, period: 'term1' },
  currentEventId: 'course_choice',
  endingId: null,
  stats: {
    study: 45,
    money: 400,
    health: 70,
    stress: 25,
    relationships: 60,
  },
  flags: { joined_club: true },
  history: [{ eventId: 'orientation', choiceId: 'say_hello' }],
  pendingEffects: [
    {
      sourceEventId: 'orientation',
      trigger: { type: 'atPeriod', time: { year: 2, period: 'term2' } },
      effect: { type: 'statDelta', stat: 'study', amount: 5 },
    },
  ],
  rngSeed: 12345,
  rngState: 987654321,
}

describe('V2 save v3 migration', () => {
  it('adds debt, lucky, and timeline fields without changing old progress', () => {
    const migrated = loadV2Save(JSON.stringify(oldSave), 'v2-example')
    expect(migrated).toMatchObject({
      saveVersion: 3,
      contentVersion: 'v2-example',
      currentTime: oldSave.currentTime,
      stats: { ...oldSave.stats, debt: 0, lucky: 0 },
      flags: oldSave.flags,
      history: [
        {
          eventId: 'orientation',
          choiceId: 'say_hello',
          time: null,
          chanceOutcomes: [],
        },
      ],
      pendingEffects: oldSave.pendingEffects,
      rngSeed: 12345,
      rngState: 987654321,
    })
    expect(v2PlayerSaveSchema.safeParse(migrated).success).toBe(true)
  })

  it('accepts a current v3 save including negative stats and year 8', () => {
    const current = {
      ...loadV2Save(JSON.stringify(oldSave), 'v2-example'),
      currentTime: { year: 8, period: 'summer' },
      stats: { ...oldSave.stats, money: -100, debt: -20, lucky: -5 },
    }
    expect(loadV2Save(JSON.stringify(current), 'v2-example')).toEqual(current)
  })

  it('preserves a legacy scheduled link whose ID predates snake_case rules', () => {
    const legacy = {
      ...oldSave,
      pendingEffects: [
        {
          sourceEventId: 'club-fair',
          trigger: { type: 'afterEvent', eventId: 'later-event' },
          effect: { type: 'setFlag', flagId: 'help-returned', value: true },
        },
      ],
    }
    const migrated = loadV2Save(JSON.stringify(legacy), 'v2-example')
    expect(migrated.pendingEffects).toEqual(legacy.pendingEffects)
  })

  it.each(['0.2.0', '0.3.0'])(
    'upgrades an earlier v2 content %s save through the existing migration',
    (contentVersion) => {
      const migrated = loadV2Save(
        JSON.stringify({ ...oldSave, contentVersion }),
        'v2-example',
      )
      expect(migrated.saveVersion).toBe(3)
      expect(migrated.contentVersion).toBe('v2-example')
      expect(migrated.rngState).toBe(987654321)
    },
  )

  it('rejects incompatible or malformed saves', () => {
    expect(() => loadV2Save('{', 'v2-example')).toThrow()
    expect(() =>
      loadV2Save(
        JSON.stringify({ ...oldSave, rngState: undefined }),
        'v2-example',
      ),
    ).toThrow()
    expect(() =>
      loadV2Save(
        JSON.stringify({ ...oldSave, contentVersion: '0.9.0' }),
        'v2-example',
      ),
    ).toThrow('Content version mismatch')
    expect(() =>
      loadV2Save(JSON.stringify({ ...oldSave, saveVersion: 1 }), 'v2-example'),
    ).toThrow('Unsupported save version')
  })
})
