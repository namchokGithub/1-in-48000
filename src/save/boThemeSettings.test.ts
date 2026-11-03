import { describe, expect, it } from 'vitest'
import {
  BO_THEME_KEY,
  createBoThemeStore,
  readBoTheme,
} from './boThemeSettings'

describe('BO theme setting', () => {
  it('defaults to Misty Mint for missing or invalid values', () => {
    expect(readBoTheme(null)).toBe('misty-mint')
    expect(readBoTheme('unknown')).toBe('misty-mint')
  })
  it('restores and persists each selected theme independently', () => {
    const saved = new Map<string, string>([[BO_THEME_KEY, 'cloud-blue']])
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value)
      },
    }
    const store = createBoThemeStore(storage)
    expect(store.getState().theme).toBe('cloud-blue')
    for (const theme of [
      'warm-ivory',
      'misty-mint',
      'cloud-blue',
      'charcoal-gold',
      'midnight-slate',
    ] as const) {
      store.getState().setTheme(theme)
      expect(saved.get(BO_THEME_KEY)).toBe(theme)
      expect(createBoThemeStore(storage).getState().theme).toBe(theme)
    }
  })
  it('keeps the selected theme when storage is unavailable', () => {
    const storage = {
      getItem: () => {
        throw new Error('unavailable')
      },
      setItem: () => {
        throw new Error('unavailable')
      },
    }
    const store = createBoThemeStore(storage)
    expect(store.getState().theme).toBe('misty-mint')
    store.getState().setTheme('midnight-slate')
    expect(store.getState().theme).toBe('midnight-slate')
  })
})
