import { describe, expect, it } from 'vitest'
import {
  createLocalStorageAdapter,
  createSessionStorageAdapter,
  SAVE_SESSION_KEY,
  SAVE_STORAGE_KEY,
} from './storage'

describe('localStorage adapter', () => {
  it('uses one dedicated key without changing other browser data', () => {
    const values = new Map<string, string>([['other', 'keep']])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
    }
    const adapter = createLocalStorageAdapter(storage)

    adapter.write('{"saveVersion":1}')
    expect(values.get(SAVE_STORAGE_KEY)).toBe('{"saveVersion":1}')
    expect(adapter.read()).toBe('{"saveVersion":1}')
    expect(values.get('other')).toBe('keep')
  })

  it('marks only the current tab as resumable', () => {
    const values = new Map<string, string>()
    const browserStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
    }
    const session = createSessionStorageAdapter(browserStorage)
    expect(session.read()).toBe(false)
    session.write(true)
    expect(values.get(SAVE_SESSION_KEY)).toBe('active')
    expect(session.read()).toBe(true)
    session.write(false)
    expect(session.read()).toBe(false)
  })
})
