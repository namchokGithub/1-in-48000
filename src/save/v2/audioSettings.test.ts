import { describe, expect, it } from 'vitest'
import { readV2AudioSettings } from './audioSettings'

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
})
