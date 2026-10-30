import { z } from 'zod'
import {
  v2StateEffectSchema,
  v2StatsSchema,
  v2TimeSchema,
} from '../../content/v2/schema'

const idSchema = z.string().regex(/^[a-z][a-z0-9_-]*$/)
const uint32Schema = z.int().min(0).max(4_294_967_295)
const yearProgressSchema = z.object({
  year: z.int().min(1).max(8),
  startStats: v2StatsSchema,
  moneyIn: z.int().min(0),
  moneyOut: z.int().min(0),
})

const savedTriggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('atPeriod'), time: v2TimeSchema }),
  z.object({ type: z.literal('afterEvent'), eventId: idSchema }),
])

export const v2PlayerSaveSchema = z.object({
  saveVersion: z.literal(1),
  contentVersion: z.string().trim().min(1),
  nameId: idSchema,
  playerName: z.string().trim().min(1),
  backgroundId: idSchema.nullable(),
  facultyId: idSchema.nullable(),
  majorId: idSchema.nullable(),
  electiveId: idSchema.nullable(),
  currentTime: v2TimeSchema,
  currentNodeId: idSchema.nullable(),
  currentEventId: idSchema.nullable(),
  endingId: idSchema.nullable(),
  stats: v2StatsSchema,
  flags: z.record(idSchema, z.boolean()),
  history: z.array(
    z.object({
      eventId: idSchema,
      choiceIds: z.array(idSchema).min(1),
      facultyId: idSchema.optional(),
      majorId: idSchema.optional(),
      electiveId: idSchema.optional(),
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
  // The running year and the last finished one, for the Player's year summary.
  yearProgress: yearProgressSchema,
  finishedYear: yearProgressSchema
    .extend({ endStats: v2StatsSchema })
    .nullable(),
  rngSeed: uint32Schema,
  rngState: uint32Schema,
})

export type V2PlayerSave = z.infer<typeof v2PlayerSaveSchema>
