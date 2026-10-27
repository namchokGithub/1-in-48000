import { describe, expect, it } from 'vitest'
import sample from '../../content/v2/sample-content.json'
import { v2ContentSchema } from '../../content/v2/schema'
import names from '../../../public/content/random-names.json'
import { createV2GameStore } from './store'

const content = v2ContentSchema.parse({ ...sample, names })

describe('V2 save checkpoints', () => {
  it('writes on start and choice, then reloads the same RNG and decision history', () => {
    let raw: string | null = null
    const storage = {
      read: () => raw,
      write: (value: string) => {
        raw = value
      },
    }
    const first = createV2GameStore(content, storage)
    const started = first.getState().startGame('ฟ้า', 2049)
    expect(JSON.parse(raw ?? '').history).toEqual([])
    const chosen = first.getState().choose('apply_kyos')
    expect(chosen.stats.debt).toBe(3000)
    expect(chosen.history[0].time).toEqual({ year: 1, period: 'term1' })
    expect(JSON.parse(raw ?? '').history).toHaveLength(1)
    const resumed = createV2GameStore(content, storage)
      .getState()
      .continueGame()
    expect(resumed).toEqual(chosen)
    expect(started.rngState).toBe(2049)
  })

  it('keeps a failed load untouched for backup recovery', () => {
    const raw = '{broken'
    let writes = 0
    const storage = {
      read: () => raw,
      write: () => {
        writes += 1
      },
    }
    const store = createV2GameStore(content, storage)
    expect(() => store.getState().continueGame()).toThrow()
    expect(store.getState().exportSave()).toBe(raw)
    expect(writes).toBe(0)
  })

  it('resumes a compatible v2 save through the V2 store', () => {
    let raw: string | null = null
    const storage = {
      read: () => raw,
      write: (value: string) => {
        raw = value
      },
    }
    const started = createV2GameStore(content, storage)
      .getState()
      .startGame('ฟ้า', 77)
    raw = JSON.stringify({
      ...started,
      saveVersion: 2,
      contentVersion: '0.4.0',
      stats: {
        study: started.stats.study,
        money: started.stats.money,
        health: started.stats.health,
        stress: started.stats.stress,
        relationships: started.stats.relationships,
      },
    })
    const store = createV2GameStore(content, storage)
    const resumed = store.getState().continueGame()
    expect(resumed?.saveVersion).toBe(3)
    expect(resumed?.stats.debt).toBe(0)
    const chosen = store.getState().choose('apply_kro')
    expect(chosen.stats.debt).toBe(2500)
    expect(JSON.parse(raw ?? '').saveVersion).toBe(3)
  })
})
