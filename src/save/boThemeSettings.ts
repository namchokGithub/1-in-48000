import { createStore } from 'zustand/vanilla'

export const BO_THEME_KEY = '1-in-48000:bo-theme'
export const BO_THEMES = [
  'warm-ivory',
  'misty-mint',
  'cloud-blue',
  'charcoal-gold',
  'midnight-slate',
] as const
export type BoTheme = (typeof BO_THEMES)[number]
type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>

export function readBoTheme(raw: string | null): BoTheme {
  return BO_THEMES.find((theme) => theme === raw) ?? 'misty-mint'
}

export function createBoThemeStore(
  storage: SettingsStorage = window.localStorage,
) {
  let initial: BoTheme
  try {
    initial = readBoTheme(storage.getItem(BO_THEME_KEY))
  } catch {
    initial = 'misty-mint'
  }
  return createStore<{ theme: BoTheme; setTheme: (theme: BoTheme) => void }>(
    (set) => ({
      theme: initial,
      setTheme: (theme) => {
        set({ theme })
        try {
          storage.setItem(BO_THEME_KEY, theme)
        } catch {
          /* Keep the theme for this session. */
        }
      },
    }),
  )
}
