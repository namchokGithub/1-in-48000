import { describe, expect, it } from 'vitest'
import sample from '../../content/v2/sample-content.json'
import { v2ContentSchema } from '../../content/v2/schema'
import names from '../../../public/content-v2/names.json'
import { createV2GameStore } from './store'

const content = v2ContentSchema.parse({ ...sample, names })

describe('V2 save checkpoints', () => {
  it('writes on start and choice without loading storage on a new session', () => {
    let raw: string | null = null
    let reads = 0
    const storage = {
      get read() {
        reads += 1
        throw new Error('Stored saves must not be read')
      },
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
    const fresh = createV2GameStore(content, storage)
    expect(fresh.getState().save).toBeNull()
    expect(fresh.getState().exportSave()).toBeNull()
    expect(reads).toBe(0)
    expect(started.rngState).toBe(2049)
  })

  it('exports only the current session and replaces the checkpoint on restart', () => {
    let raw: string | null = null
    const storage = {
      write: (value: string) => {
        raw = value
      },
    }
    const store = createV2GameStore(content, storage)
    expect(store.getState().exportSave()).toBeNull()
    store.getState().startGame('ฟ้า', 77)
    const first = raw
    expect(JSON.parse(store.getState().exportSave() ?? '').playerName).toBe(
      'ฟ้า',
    )
    store.getState().restartGame('มายด์', 99)
    expect(raw).not.toBe(first)
    expect(JSON.parse(raw ?? '').playerName).toBe('มายด์')
  })
})
