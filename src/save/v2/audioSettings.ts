import { z } from 'zod'

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
