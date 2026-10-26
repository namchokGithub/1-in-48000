import { z } from 'zod'

export const idSchema = z.string().regex(/^[a-z][a-z0-9_-]*$/)
const nonEmptyTextSchema = z.string().trim().min(1)
const boundedStatSchema = z.int().min(0).max(100)

export const statKeySchema = z.enum([
  'study',
  'money',
  'health',
  'stress',
  'relationships',
])

export const statsSchema = z.object({
  study: boundedStatSchema,
  money: z.int().min(0),
  health: boundedStatSchema,
  stress: boundedStatSchema,
  relationships: boundedStatSchema,
})

export const periodSchema = z.enum(['term1', 'break', 'term2', 'summer'])

export const timeSchema = z.object({
  year: z.int().min(1).max(4),
  period: periodSchema,
})

const statDeltasSchema = z.object({
  study: z.int(),
  money: z.int(),
  health: z.int(),
  stress: z.int(),
  relationships: z.int(),
})

export const backgroundSchema = z.object({
  id: idSchema,
  title: nonEmptyTextSchema,
  family: nonEmptyTextSchema,
  personality: nonEmptyTextSchema,
  skill: nonEmptyTextSchema,
  statDeltas: statDeltasSchema,
})

export const conditionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('year'),
    operator: z.enum(['eq', 'gte', 'lte']),
    value: z.int().min(1).max(4),
  }),
  z.object({
    type: z.literal('stat'),
    stat: statKeySchema,
    operator: z.enum(['eq', 'gt', 'gte', 'lt', 'lte']),
    value: z.int(),
  }),
  z.object({
    type: z.literal('flag'),
    flagId: idSchema,
    value: z.boolean(),
  }),
  z.object({
    type: z.literal('pastEvent'),
    eventId: idSchema,
    visited: z.boolean(),
  }),
])

const statDeltaSchema = z.object({
  type: z.literal('statDelta'),
  stat: statKeySchema,
  amount: z.int(),
})

const setFlagSchema = z.object({
  type: z.literal('setFlag'),
  flagId: idSchema,
  value: z.boolean(),
})

export const stateEffectSchema = z.discriminatedUnion('type', [
  statDeltaSchema,
  setFlagSchema,
])

export const immediateEffectSchema = z.discriminatedUnion('type', [
  statDeltaSchema,
  setFlagSchema,
  z.object({
    type: z.literal('goToEvent'),
    eventId: idSchema,
  }),
])

export const delayedTriggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('atPeriod'), time: timeSchema }),
  z.object({ type: z.literal('afterEvent'), eventId: idSchema }),
])

export const scheduledEffectSchema = z.object({
  trigger: delayedTriggerSchema,
  effect: stateEffectSchema,
})

export const effectSchema = z.union([
  immediateEffectSchema,
  scheduledEffectSchema.extend({ type: z.literal('schedule') }),
])

export const gameConfigSchema = z.object({
  contentVersion: nonEmptyTextSchema,
  title: nonEmptyTextSchema,
  startingTime: timeSchema,
  startingEventId: idSchema,
  initialStats: statsSchema,
  backgrounds: z.array(backgroundSchema).min(1),
  timeModel: z.object({
    years: z.literal(4),
    periods: z.tuple([
      z.literal('term1'),
      z.literal('break'),
      z.literal('term2'),
      z.literal('summer'),
    ]),
  }),
})

export const eventSchema = z.object({
  id: idSchema,
  kind: z.enum(['main', 'conditional', 'holiday', 'random']),
  time: timeSchema,
  title: nonEmptyTextSchema,
  sceneAssetId: idSchema.optional(),
  bgmAssetId: idSchema.optional(),
  ambienceAssetId: idSchema.optional(),
  conditions: z.array(conditionSchema),
  lines: z
    .array(
      z.object({
        speakerId: idSchema.optional(),
        text: nonEmptyTextSchema,
        portraitAssetId: idSchema.optional(),
      }),
    )
    .min(1),
  choices: z
    .array(
      z.object({
        id: idSchema,
        text: nonEmptyTextSchema,
        conditions: z.array(conditionSchema),
        effects: z.array(effectSchema),
      }),
    )
    .min(1),
})

export const eventListSchema = z.array(eventSchema)

export const characterListSchema = z.array(
  z.object({
    id: idSchema,
    name: nonEmptyTextSchema,
    portraitAssetId: idSchema.optional(),
  }),
)

export const assetListSchema = z.array(
  z.object({
    id: idSchema,
    kind: z.enum(['scene', 'portrait', 'bgm', 'ambience', 'sfx']),
    path: z
      .string()
      .regex(
        /^\/assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:webp|png|mp3|ogg|wav)$/i,
      ),
  }),
)

export const endingListSchema = z.array(
  z.object({
    id: idSchema,
    title: nonEmptyTextSchema,
    summary: nonEmptyTextSchema,
    conditions: z.array(conditionSchema),
  }),
)

export type Stats = z.infer<typeof statsSchema>
export type GameTime = z.infer<typeof timeSchema>
export type Condition = z.infer<typeof conditionSchema>
export type Effect = z.infer<typeof effectSchema>
export type Event = z.infer<typeof eventSchema>
export type GameConfig = z.infer<typeof gameConfigSchema>
export type Ending = z.infer<(typeof endingListSchema)['element']>
export type StateEffect = z.infer<typeof stateEffectSchema>
export type Background = z.infer<typeof backgroundSchema>
export type Character = z.infer<typeof characterListSchema>[number]
export type Asset = z.infer<typeof assetListSchema>[number]
