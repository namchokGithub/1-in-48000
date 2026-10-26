import { z } from 'zod'
import {
  delayedTriggerSchema,
  idSchema,
  stateEffectSchema,
  statsSchema,
  timeSchema,
} from '../content/schema'

const uint32Schema = z.int().min(0).max(4_294_967_295)

export const playerSaveSchema = z.object({
  saveVersion: z.literal(1),
  contentVersion: z.string().trim().min(1),
  playerName: z.string().trim().min(1),
  currentTime: timeSchema,
  currentEventId: idSchema.nullable(),
  endingId: idSchema.nullable(),
  stats: statsSchema,
  flags: z.record(idSchema, z.boolean()),
  history: z.array(
    z.object({
      eventId: idSchema,
      choiceId: idSchema,
    }),
  ),
  pendingEffects: z.array(
    z.object({
      sourceEventId: idSchema,
      trigger: delayedTriggerSchema,
      effect: stateEffectSchema,
    }),
  ),
  rngSeed: uint32Schema,
  rngState: uint32Schema,
})

export type PlayerSave = z.infer<typeof playerSaveSchema>
