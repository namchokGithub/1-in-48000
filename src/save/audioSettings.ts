import { createStore } from 'zustand/vanilla'
import { z } from 'zod'

export const AUDIO_SETTINGS_KEY = '1-in-48000:audio-settings'

const volumesSchema = z.object({
  bgm: z.number().min(0).max(1),
  ambience: z.number().min(0).max(1),
  sfx: z.number().min(0).max(1),
})

export type AudioVolumes = z.infer<typeof volumesSchema>
export type AudioChannel = keyof AudioVolumes
type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>

const defaultVolumes: AudioVolumes = { bgm: 0.55, ambience: 0.5, sfx: 0.7 }

function readVolumes(storage: SettingsStorage): AudioVolumes {
  try {
    const raw = storage.getItem(AUDIO_SETTINGS_KEY)
    return raw ? volumesSchema.parse(JSON.parse(raw)) : defaultVolumes
  } catch {
    return defaultVolumes
  }
}

export function createAudioSettingsStore(
  storage: SettingsStorage = window.localStorage,
) {
  return createStore<{
    volumes: AudioVolumes
    setVolume: (channel: AudioChannel, value: number) => void
  }>((set, get) => ({
    volumes: readVolumes(storage),
    setVolume: (channel, value) => {
      const volumes = {
        ...get().volumes,
        [channel]: Math.max(0, Math.min(1, value)),
      }
      set({ volumes })
      try {
        storage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(volumes))
      } catch {
        // Audio still responds when browser storage is unavailable.
      }
    },
  }))
}
