import { Howl } from 'howler'
import type { Asset, Event } from '../content/schema'
import type { AudioChannel, AudioVolumes } from '../save/audioSettings'

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
type TrackChannel = Extract<AudioChannel, 'bgm' | 'ambience'>

const FADE_MS = 350
const defaultVolumes: AudioVolumes = { bgm: 0.55, ambience: 0.5, sfx: 0.7 }

export function createAudioController(
  createSound: SoundFactory = (options) => new Howl(options),
) {
  let volumes = { ...defaultVolumes }
  const tracks: Partial<Record<TrackChannel, { id: string; sound: Sound }>> = {}

  function fadeOut(channel: TrackChannel) {
    const current = tracks[channel]
    if (!current) return
    delete tracks[channel]
    const { sound } = current
    sound.once('fade', () => {
      sound.stop()
      sound.unload()
    })
    sound.fade(sound.volume() as number, 0, FADE_MS)
  }

  function syncChannel(
    channel: TrackChannel,
    id: string | undefined,
    assets: Asset[],
  ) {
    const asset = assets.find(
      (entry) => entry.id === id && entry.kind === channel,
    )
    if (tracks[channel]?.id === asset?.id) return
    fadeOut(channel)
    if (!asset) return
    const sound = createSound({ src: [asset.path], loop: true, volume: 0 })
    tracks[channel] = { id: asset.id, sound }
    sound.play()
    sound.fade(0, volumes[channel], FADE_MS)
  }

  return {
    sync(
      event: Pick<Event, 'bgmAssetId' | 'ambienceAssetId'>,
      assets: Asset[],
    ) {
      syncChannel('bgm', event.bgmAssetId, assets)
      syncChannel('ambience', event.ambienceAssetId, assets)
    },
    setVolumes(next: AudioVolumes) {
      volumes = { ...next }
      for (const channel of ['bgm', 'ambience'] as const) {
        tracks[channel]?.sound.volume(volumes[channel])
      }
    },
    playSfx(id: string, assets: Asset[]) {
      const asset = assets.find(
        (entry) => entry.id === id && entry.kind === 'sfx',
      )
      if (!asset) return false
      const sound = createSound({
        src: [asset.path],
        loop: false,
        volume: volumes.sfx,
      })
      sound.once('end', () => sound.unload())
      sound.play()
      return true
    },
    stop() {
      fadeOut('bgm')
      fadeOut('ambience')
    },
  }
}
