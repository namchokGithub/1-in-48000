import { describe, expect, it } from 'vitest'
import { createLocalStorageAdapter, SAVE_STORAGE_KEY } from './storage'

describe('localStorage adapter', () => {
  it('uses one dedicated key without changing other browser data', () => {
    const values = new Map<string, string>([['other', 'keep']])
    const storage = {
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
    }
    const adapter = createLocalStorageAdapter(storage)

    adapter.write('{"saveVersion":1}')
    expect(values.get(SAVE_STORAGE_KEY)).toBe('{"saveVersion":1}')
    expect(values.get('other')).toBe('keep')
  })
})
