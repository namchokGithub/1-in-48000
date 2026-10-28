import { z } from 'zod'
import {
  v2StateEffectSchema,
  v2StatsSchema,
  v2TimeSchema,
} from '../../content/v2/schema'

const idSchema = z.string().regex(/^[a-z][a-z0-9_-]*$/)
const uint32Schema = z.int().min(0).max(4_294_967_295)
const savedTriggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('atPeriod'), time: v2TimeSchema }),
  z.object({ type: z.literal('afterEvent'), eventId: idSchema }),
])

export const v2PlayerSaveSchema = z.object({
  saveVersion: z.literal(1),
  contentVersion: z.string().trim().min(1),
  playerName: z.string().trim().min(1),
  backgroundId: idSchema.nullable(),
  currentTime: v2TimeSchema,
  currentEventId: idSchema.nullable(),
  endingId: idSchema.nullable(),
  stats: v2StatsSchema,
  flags: z.record(idSchema, z.boolean()),
  history: z.array(
    z.object({
      eventId: idSchema,
      choiceId: idSchema,
      time: v2TimeSchema.nullable(),
      chanceOutcomes: z.array(
        z.object({
          effectIndex: z.int().min(0),
          succeeded: z.boolean(),
          effectivePercent: z.number().min(0).max(100),
        }),
      ),
    }),
  ),
  pendingEffects: z.array(
    z.object({
      sourceEventId: idSchema,
      trigger: savedTriggerSchema,
      effect: v2StateEffectSchema,
    }),
  ),
  rngSeed: uint32Schema,
  rngState: uint32Schema,
})

export type V2PlayerSave = z.infer<typeof v2PlayerSaveSchema>
