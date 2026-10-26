import { describe, expect, it } from 'vitest'
import { createAudioSettingsStore, AUDIO_SETTINGS_KEY } from './audioSettings'

describe('audio settings', () => {
  it('loads valid settings and persists volume changes under a separate key', () => {
    const values = new Map<string, string>([
      [
        AUDIO_SETTINGS_KEY,
        JSON.stringify({ bgm: 0.2, ambience: 0.4, sfx: 0.6 }),
      ],
      ['1-in-48000:save', 'keep'],
    ])
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value)
      },
    }
    const store = createAudioSettingsStore(storage)

    expect(store.getState().volumes).toEqual({
      bgm: 0.2,
      ambience: 0.4,
      sfx: 0.6,
    })
    store.getState().setVolume('bgm', 0.8)
    expect(JSON.parse(values.get(AUDIO_SETTINGS_KEY) ?? '')).toEqual({
      bgm: 0.8,
      ambience: 0.4,
      sfx: 0.6,
    })
    expect(values.get('1-in-48000:save')).toBe('keep')
  })

  it('falls back to defaults for damaged or out-of-range settings', () => {
    const storage = { getItem: () => '{bad', setItem: () => {} }
    expect(
      createAudioSettingsStore(storage).getState().volumes.bgm,
    ).toBeGreaterThan(0)
    const invalid = {
      getItem: () => JSON.stringify({ bgm: 2, ambience: 0.4, sfx: 0.6 }),
      setItem: () => {},
    }
    expect(
      createAudioSettingsStore(invalid).getState().volumes.bgm,
    ).toBeGreaterThan(0)
  })
})
