import { describe, expect, it } from 'vitest'
import { createLocalStorageAdapter, SAVE_STORAGE_KEY } from './storage'

describe('localStorage adapter', () => {
  it('uses one dedicated key without changing other browser data', () => {
    const values = new Map<string, string>([['other', 'keep']])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
      removeItem: (key: string) => {
        values.delete(key)
      },
    }
    const adapter = createLocalStorageAdapter(storage)

    expect(adapter.read()).toBeNull()
    adapter.write('{"saveVersion":1}')
    expect(values.get(SAVE_STORAGE_KEY)).toBe('{"saveVersion":1}')
    expect(adapter.read()).toBe('{"saveVersion":1}')
    expect(values.get('other')).toBe('keep')
  })
})
