import { describe, expect, it } from 'vitest'
import { createAudioController } from './audio'
import type { V2Content } from '../content/v2/schema'

const assets: V2Content['assets'] = [
  { id: 'campus_music', kind: 'bgm', path: '/assets/sound/music.mp3' },
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
    controller.sync('campus_music', assets)
    controller.sync('campus_music', assets)

    expect(created).toHaveLength(1)
    expect(created[0].source).toBe('/assets/sound/music.mp3')
    expect(created[0].loop).toBe(true)
    expect(created[0].plays).toBe(1)
  })

  it('fades out the current track and applies a changed music volume', () => {
    const created: FakeSound[] = []
    const controller = createAudioController((options) => {
      const sound = new FakeSound(options)
      created.push(sound)
      return sound
    })
    controller.sync('campus_music', assets)
    controller.setVolume(0.3)
    expect(created[0].level).toBe(0.3)
    controller.sync(undefined, assets)
    expect(created.every((sound) => sound.stopped)).toBe(true)
    expect(
      created.every((sound) => sound.fades.some(([, to]) => to === 0)),
    ).toBe(true)
  })

  it('does not play a non-music asset', () => {
    const created: FakeSound[] = []
    const controller = createAudioController((options) => {
      const sound = new FakeSound(options)
      created.push(sound)
      return sound
    })
    controller.sync('click', assets)
    expect(created).toHaveLength(0)
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
