import { describe, expect, it } from 'vitest'
import configJson from '../../public/content/config.json'
import endingsJson from '../../public/content/endings.json'
import eventsJson from '../../public/content/events.json'
import {
  endingListSchema,
  eventListSchema,
  eventSchema,
  gameConfigSchema,
  type Event,
} from '../content/schema'
import type { GameContent } from '../engine/game'
import { playerSaveSchema } from './schema'
import { createGameStore } from './store'
import type { SaveStorage } from './storage'

const sampleContent: GameContent = {
  config: gameConfigSchema.parse(configJson),
  events: eventListSchema.parse(eventsJson),
  endings: endingListSchema.parse(endingsJson),
}

function memoryStorage(initial: string | null = null): SaveStorage & {
  writes: string[]
  value: string | null
} {
  return {
    value: initial,
    writes: [],
    read() {
      return this.value
    },
    write(value) {
      this.value = value
      this.writes.push(value)
    },
  }
}

function simpleEvent(
  id: string,
  period: 'term1' | 'break' | 'term2',
  kind: Event['kind'],
): Event {
  return eventSchema.parse({
    id,
    kind,
    time: { year: 1, period },
    title: id,
    conditions: [],
    lines: [{ text: id }],
    choices: [{ id: 'continue', text: 'ต่อไป', conditions: [], effects: [] }],
  })
}

describe('game save store', () => {
  it('persists only at start and after a resolved choice', () => {
    const storage = memoryStorage()
    const store = createGameStore(sampleContent, storage)

    const start = store.getState().startGame('ฟ้า', 12345)
    expect(storage.writes).toHaveLength(1)
    expect(playerSaveSchema.parse(JSON.parse(storage.writes[0]))).toEqual(start)
    store.getState().exportSave()
    expect(store.getState().save).toEqual(start)
    expect(storage.writes).toHaveLength(1)

    const afterChoice = store.getState().choose('join_group')
    expect(storage.writes).toHaveLength(2)
    expect(afterChoice.endingId).toBe('graduation')
    expect(playerSaveSchema.parse(JSON.parse(storage.writes[1]))).toEqual(
      afterChoice,
    )
  })

  it('continues from storage without rewriting it and exports a JSON backup', () => {
    const storage = memoryStorage()
    const first = createGameStore(sampleContent, storage)
    first.getState().startGame('ฟ้า', 12345)
    const resumed = createGameStore(sampleContent, storage)

    const loaded = resumed.getState().continueGame()
    expect(loaded).toEqual(first.getState().save)
    expect(storage.writes).toHaveLength(1)
    expect(JSON.parse(resumed.getState().exportSave() ?? '')).toEqual(loaded)
    expect(storage.writes).toHaveLength(1)
  })

  it('restarts by replacing the existing slot with a fresh game', () => {
    const storage = memoryStorage()
    const store = createGameStore(sampleContent, storage)
    store.getState().startGame('ฟ้า', 1)
    store.getState().choose('join_group')
    const restarted = store.getState().restartGame('ใหม่', 2)

    expect(restarted.playerName).toBe('ใหม่')
    expect(restarted.history).toEqual([])
    expect(restarted.rngSeed).toBe(2)
    expect(storage.writes).toHaveLength(3)
    expect(playerSaveSchema.parse(JSON.parse(storage.value ?? ''))).toEqual(
      restarted,
    )
  })

  it('keeps the stored slot when loading fails', () => {
    const storage = memoryStorage('{bad JSON')
    const store = createGameStore(sampleContent, storage)

    expect(() => store.getState().continueGame()).toThrow()
    expect(storage.value).toBe('{bad JSON')
    expect(store.getState().save).toBeNull()
    expect(store.getState().exportSave()).toBe('{bad JSON')
  })

  it('does not advance memory when checkpoint writing fails', () => {
    const storage = memoryStorage()
    const store = createGameStore(sampleContent, storage)
    const before = store.getState().startGame('ฟ้า', 12345)
    storage.write = () => {
      throw new Error('Storage is full')
    }

    expect(() => store.getState().choose('join_group')).toThrow(
      'Storage is full',
    )
    expect(store.getState().save).toEqual(before)
    expect(storage.value).toBe(JSON.stringify(before))
  })

  it('produces the same next random event after loading a checkpoint', () => {
    const config = gameConfigSchema.parse(configJson)
    const game: GameContent = {
      config: { ...config, startingEventId: 'start' },
      events: [
        simpleEvent('start', 'term1', 'main'),
        simpleEvent('random_a', 'break', 'random'),
        simpleEvent('random_b', 'break', 'random'),
        simpleEvent('random_c', 'term2', 'random'),
        simpleEvent('random_d', 'term2', 'random'),
      ],
      endings: endingListSchema.parse(endingsJson),
    }
    const storage = memoryStorage()
    const original = createGameStore(game, storage)
    original.getState().startGame('ฟ้า', 12345)
    const firstRandom = original.getState().choose('continue')
    expect(['random_a', 'random_b']).toContain(firstRandom.currentEventId)

    const resumed = createGameStore(game, memoryStorage(storage.value))
    expect(resumed.getState().continueGame()).toEqual(firstRandom)
    const originalNext = original.getState().choose('continue')
    const resumedNext = resumed.getState().choose('continue')
    expect(resumedNext.currentEventId).toBe(originalNext.currentEventId)
    expect(resumedNext.rngState).toBe(originalNext.rngState)
  })
})
