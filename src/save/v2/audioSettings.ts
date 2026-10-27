import { z } from 'zod'
import { createStore } from 'zustand/vanilla'
import { AUDIO_SETTINGS_KEY } from '../audioSettings'

const musicSchema = z.object({
  musicEnabled: z.boolean(),
  musicVolume: z.number().min(0).max(1),
})
const oldVolumesSchema = z.object({
  bgm: z.number().min(0).max(1),
  ambience: z.number().min(0).max(1),
  sfx: z.number().min(0).max(1),
})

export type V2AudioSettings = z.infer<typeof musicSchema>

export function readV2AudioSettings(raw: string | null): V2AudioSettings {
  const defaults = { musicEnabled: true, musicVolume: 0.2 }
  if (raw === null) return defaults
  try {
    const value: unknown = JSON.parse(raw)
    const current = musicSchema.safeParse(value)
    if (current.success) return current.data
    const old = oldVolumesSchema.safeParse(value)
    if (old.success) {
      return {
        musicEnabled: old.data.bgm > 0,
        musicVolume: old.data.bgm || 0.2,
      }
    }
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
