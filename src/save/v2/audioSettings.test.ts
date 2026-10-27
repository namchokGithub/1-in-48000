import { describe, expect, it } from 'vitest'
import { AUDIO_SETTINGS_KEY } from '../audioSettings'
import {
  createV2AudioSettingsStore,
  readV2AudioSettings,
} from './audioSettings'

describe('V2 audio setting migration', () => {
  it('drops ambience and effects while preserving the old music volume', () => {
    expect(
      readV2AudioSettings(
        JSON.stringify({ bgm: 0.55, ambience: 0.5, sfx: 0.7 }),
      ),
    ).toEqual({ musicEnabled: true, musicVolume: 0.55 })
  })

  it('defaults to music enabled at 20% when settings are absent or invalid', () => {
    expect(readV2AudioSettings(null)).toEqual({
      musicEnabled: true,
      musicVolume: 0.2,
    })
    expect(readV2AudioSettings('{bad')).toEqual({
      musicEnabled: true,
      musicVolume: 0.2,
    })
  })

  it('accepts already migrated settings and preserves a muted track', () => {
    expect(
      readV2AudioSettings(
        JSON.stringify({ musicEnabled: false, musicVolume: 0.2 }),
      ),
    ).toEqual({
      musicEnabled: false,
      musicVolume: 0.2,
    })
    expect(
      readV2AudioSettings(JSON.stringify({ bgm: 0, ambience: 0.5, sfx: 0.7 })),
    ).toEqual({
      musicEnabled: false,
      musicVolume: 0.2,
    })
  })

  it('persists the music switch using the V2 shape while keeping volume', () => {
    const saved = new Map<string, string>([
      [
        AUDIO_SETTINGS_KEY,
        JSON.stringify({ bgm: 0.55, ambience: 0.5, sfx: 0.7 }),
      ],
    ])
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value)
      },
    }
    const store = createV2AudioSettingsStore(storage)
    expect(store.getState().settings).toEqual({
      musicEnabled: true,
      musicVolume: 0.55,
    })
    store.getState().setMusicEnabled(false)
    expect(readV2AudioSettings(saved.get(AUDIO_SETTINGS_KEY)!)).toEqual({
      musicEnabled: false,
      musicVolume: 0.55,
    })
  })
})
