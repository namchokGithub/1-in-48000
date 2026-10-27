import { z } from 'zod'
import { createStore } from 'zustand/vanilla'

export const AUDIO_SETTINGS_KEY = '1-in-48000:audio-settings'

const musicSchema = z.object({
  musicEnabled: z.boolean(),
  musicVolume: z.number().min(0).max(1),
})

export type V2AudioSettings = z.infer<typeof musicSchema>

export function readV2AudioSettings(raw: string | null): V2AudioSettings {
  const defaults = { musicEnabled: true, musicVolume: 0.2 }
  if (raw === null) return defaults
  try {
    const value: unknown = JSON.parse(raw)
    const current = musicSchema.safeParse(value)
    if (current.success) return current.data
  } catch {
    return defaults
  }
  return defaults
}

type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>

export function createV2AudioSettingsStore(
  storage: SettingsStorage = window.localStorage,
) {
  let initial: V2AudioSettings
  try {
    initial = readV2AudioSettings(storage.getItem(AUDIO_SETTINGS_KEY))
  } catch {
    initial = readV2AudioSettings(null)
  }

  return createStore<{
    settings: V2AudioSettings
    setMusicEnabled: (enabled: boolean) => void
  }>((set, get) => ({
    settings: initial,
    setMusicEnabled: (enabled) => {
      const settings = { ...get().settings, musicEnabled: enabled }
      set({ settings })
      try {
        storage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settings))
      } catch {
        // Keep the control responsive when browser storage is unavailable.
      }
    },
  }))
}
