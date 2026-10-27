import { describe, expect, it } from 'vitest'
import {
  createPlayerThemeStore,
  PLAYER_THEME_KEY,
  readPlayerTheme,
} from './themeSettings'

describe('Player theme setting', () => {
  it('uses light for absent or unknown values', () => {
    expect(readPlayerTheme(null)).toBe('light')
    expect(readPlayerTheme('sepia')).toBe('light')
  })

  it('loads and persists the selected theme', () => {
    const saved = new Map<string, string>([[PLAYER_THEME_KEY, 'dark']])
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value)
      },
    }
    const store = createPlayerThemeStore(storage)
    expect(store.getState().theme).toBe('dark')
    store.getState().setTheme('light')
    expect(saved.get(PLAYER_THEME_KEY)).toBe('light')
  })
})
