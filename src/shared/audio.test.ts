import { describe, expect, it } from 'vitest'
import { createAudioController } from './audio'
import type { Asset } from '../content/schema'

const assets: Asset[] = [
  { id: 'campus_music', kind: 'bgm', path: '/assets/sound/music.mp3' },
  { id: 'rain', kind: 'ambience', path: '/assets/sound/rain.mp3' },
  { id: 'click', kind: 'sfx', path: '/assets/sound/click.mp3' },
]

describe('audio controller', () => {
  it('plays BGM by Asset ID and does not restart the same track', () => {
    const created: FakeSound[] = []
    const controller = createAudioController((options) => {
      const sound = new FakeSound(options)
      created.push(sound)
      return sound
    })
    controller.sync({ bgmAssetId: 'campus_music' }, assets)
    controller.sync({ bgmAssetId: 'campus_music' }, assets)

    expect(created).toHaveLength(1)
    expect(created[0].source).toBe('/assets/sound/music.mp3')
    expect(created[0].loop).toBe(true)
    expect(created[0].plays).toBe(1)
  })

  it('fades out missing tracks and applies changed volumes', () => {
    const created: FakeSound[] = []
    const controller = createAudioController((options) => {
      const sound = new FakeSound(options)
      created.push(sound)
      return sound
    })
    controller.sync(
      { bgmAssetId: 'campus_music', ambienceAssetId: 'rain' },
      assets,
    )
    controller.setVolumes({ bgm: 0.3, ambience: 0.2, sfx: 0.8 })
    expect(created.map((sound) => sound.level)).toEqual([0.3, 0.2])
    controller.sync({}, assets)
    expect(created.every((sound) => sound.stopped)).toBe(true)
    expect(
      created.every((sound) => sound.fades.some(([, to]) => to === 0)),
    ).toBe(true)
  })

  it('plays SFX only when an ID resolves to an SFX asset', () => {
    const created: FakeSound[] = []
    const controller = createAudioController((options) => {
      const sound = new FakeSound(options)
      created.push(sound)
      return sound
    })
    expect(controller.playSfx('campus_music', assets)).toBe(false)
    expect(controller.playSfx('click', assets)).toBe(true)
    expect(created[0].loop).toBe(false)
    expect(created[0].plays).toBe(1)
  })
})

type SoundOptions = { src: string[]; loop: boolean; volume: number }
class FakeSound {
  source: string
  loop: boolean
  level: number
  plays = 0
  stopped = false
  fades: [number, number][] = []
  constructor(options: SoundOptions) {
    this.source = options.src[0]
    this.loop = options.loop
    this.level = options.volume
  }
  play() {
    this.plays += 1
    return 1
  }
  stop() {
    this.stopped = true
    return this
  }
  volume(value?: number) {
    if (value === undefined) return this.level
    this.level = value
    return this
  }
  fade(from: number, to: number) {
    this.fades.push([from, to])
    this.level = to
    return this
  }
  once(_event: string, handler: () => void) {
    handler()
    return this
  }
  unload() {
    return this
  }
}
