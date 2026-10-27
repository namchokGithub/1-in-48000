import { createStore } from 'zustand/vanilla'

export const PLAYER_THEME_KEY = '1-in-48000:player-theme'
export type PlayerTheme = 'light' | 'dark'

type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>

export function readPlayerTheme(raw: string | null): PlayerTheme {
  return raw === 'dark' ? 'dark' : 'light'
}

export function createPlayerThemeStore(
  storage: SettingsStorage = window.localStorage,
) {
  let initial: PlayerTheme
  try {
    initial = readPlayerTheme(storage.getItem(PLAYER_THEME_KEY))
  } catch {
    initial = 'light'
  }

  return createStore<{
    theme: PlayerTheme
    setTheme: (theme: PlayerTheme) => void
  }>((set) => ({
    theme: initial,
    setTheme: (theme) => {
      set({ theme })
      try {
        storage.setItem(PLAYER_THEME_KEY, theme)
      } catch {
        // The selected theme still works for this session.
      }
    },
  }))
}
