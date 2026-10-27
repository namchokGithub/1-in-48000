import { Howl } from 'howler'
import type { V2Content } from '../content/v2/schema'

type SoundOptions = { src: string[]; loop: boolean; volume: number }
type Sound = {
  play: () => unknown
  stop: () => unknown
  volume: (value?: number) => unknown
  fade: (from: number, to: number, duration: number) => unknown
  once: (event: 'fade' | 'end', handler: () => void) => unknown
  unload: () => unknown
}
type SoundFactory = (options: SoundOptions) => Sound
type Asset = V2Content['assets'][number]

const FADE_MS = 350

export function createAudioController(
  createSound: SoundFactory = (options) => new Howl(options),
) {
  let volume = 0.2
  let track: { id: string; sound: Sound } | null = null

  function fadeOut() {
    if (!track) return
    const { sound } = track
    track = null
    sound.once('fade', () => {
      sound.stop()
      sound.unload()
    })
    sound.fade(sound.volume() as number, 0, FADE_MS)
  }

  function sync(id: string | undefined, assets: Asset[]) {
    const asset = assets.find(
      (entry) => entry.id === id && entry.kind === 'bgm',
    )
    if (track?.id === asset?.id) return
    fadeOut()
    if (!asset) return
    const sound = createSound({ src: [asset.path], loop: true, volume: 0 })
    track = { id: asset.id, sound }
    sound.play()
    sound.fade(0, volume, FADE_MS)
  }

  return {
    sync,
    setVolume(next: number) {
      volume = Math.max(0, Math.min(1, next))
      track?.sound.volume(volume)
    },
    stop: fadeOut,
  }
}
