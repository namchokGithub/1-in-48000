import { z } from 'zod'

export const v2IdSchema = z.string().regex(/^[a-z][a-z0-9_-]*$/)
export const v2StoryIdSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/)
const idSchema = v2IdSchema
const storyIdSchema = v2StoryIdSchema
const textSchema = z.string().trim().min(1)
const boundedStatSchema = z.int().max(100)

export const v2StatKeySchema = z.enum([
  'study',
  'money',
  'health',
  'stress',
  'relationships',
  'debt',
  'lucky',
])

export const v2StatsSchema = z.object({
  study: boundedStatSchema,
  money: z.int(),
  health: boundedStatSchema,
  stress: boundedStatSchema,
  relationships: boundedStatSchema,
  debt: z.int(),
  lucky: boundedStatSchema,
})

const statDeltasSchema = z.object({
  study: z.int(),
  money: z.int(),
  health: z.int(),
  stress: z.int(),
  relationships: z.int(),
  debt: z.int(),
  lucky: z.int(),
})

const periodSchema = z.enum(['term1', 'break', 'term2', 'summer'])

export const v2TimeSchema = z.object({
  year: z.int().min(1).max(8),
  period: periodSchema,
})

export const v2ConditionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('year'),
    operator: z.enum(['eq', 'gte', 'lte']),
    value: z.int().min(1).max(8),
  }),
  z.object({
    type: z.literal('stat'),
    stat: v2StatKeySchema,
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
    eventId: storyIdSchema,
    visited: z.boolean(),
  }),
  z.object({ type: z.literal('faculty'), facultyId: idSchema }),
  z.object({ type: z.literal('major'), majorId: idSchema }),
  z.object({ type: z.literal('elective'), electiveId: idSchema }),
])

const statDeltaSchema = z.object({
  type: z.literal('statDelta'),
  stat: v2StatKeySchema,
  amount: z.int(),
})

const setFlagSchema = z.object({
  type: z.literal('setFlag'),
  flagId: idSchema,
  value: z.boolean(),
})

export const v2StateEffectSchema = z.discriminatedUnion('type', [
  statDeltaSchema,
  setFlagSchema,
])

const chanceSchema = z.strictObject({
  type: z.literal('chance'),
  successPercent: z.number().min(0).max(100),
  displayMode: z.enum(['amounts', 'statsOnly']),
  successEffects: z.array(v2StateEffectSchema),
  failureEffects: z.array(v2StateEffectSchema),
})

export const v2DelayedTriggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('atPeriod'), time: v2TimeSchema }),
  z.object({ type: z.literal('afterEvent'), eventId: storyIdSchema }),
])

export const v2EffectSchema = z.union([
  statDeltaSchema,
  setFlagSchema,
  z.object({ type: z.literal('goToEvent'), eventId: storyIdSchema }),
  z.object({
    type: z.literal('schedule'),
    trigger: v2DelayedTriggerSchema,
    effect: v2StateEffectSchema,
  }),
  chanceSchema,
])

export const v2GameConfigSchema = z.object({
  contentVersion: textSchema,
  title: textSchema,
  startingTime: v2TimeSchema,
  startingEventId: storyIdSchema,
  initialStats: v2StatsSchema,
  backgrounds: z
    .array(
      z.object({
        id: idSchema,
        title: textSchema,
        family: textSchema,
        personality: textSchema,
        skill: textSchema,
        statDeltas: statDeltasSchema,
      }),
    )
    .min(1),
  timeModel: z.object({
    standardYears: z.literal(4),
    maximumYears: z.literal(8),
    reviewYears: z.tuple([z.literal(4), z.literal(6), z.literal(8)]),
    periods: z.tuple([
      z.literal('term1'),
      z.literal('break'),
      z.literal('term2'),
      z.literal('summer'),
    ]),
  }),
})

export const v2EventSchema = z
  .strictObject({
    id: storyIdSchema,
    active: z.boolean().optional(),
    kind: z.enum(['main', 'conditional', 'holiday', 'random']),
    time: v2TimeSchema,
    title: textSchema,
    selection: z
      .discriminatedUnion('type', [
        z.object({ type: z.literal('program') }),
        z.object({ type: z.literal('elective') }),
        z.object({
          type: z.literal('multiple'),
          min: z.int().min(1),
          max: z.int().min(1),
          goToEventId: storyIdSchema,
        }),
      ])
      .optional(),
    sceneAssetId: idSchema.optional(),
    bgmAssetId: idSchema.optional(),
    conditions: z.array(v2ConditionSchema),
    lines: z
      .array(
        z.object({
          speakerId: idSchema.optional(),
          text: textSchema,
          portraitAssetId: idSchema.optional(),
        }),
      )
      .min(1),
    choices: z
      .array(
        z.object({
          id: storyIdSchema,
          text: textSchema,
          conditions: z.array(v2ConditionSchema),
          effects: z.array(v2EffectSchema),
        }),
      )
      .min(1),
  })
  .superRefine((event, context) => {
    if (event.selection?.type !== 'multiple') return
    const { min, max } = event.selection
    if (min > max || max > event.choices.length) {
      context.addIssue({
        code: 'custom',
        path: ['selection'],
        message: 'Selection limits must fit the available choices',
      })
    }
    event.choices.forEach((choice, index) => {
      if (choice.effects.some((effect) => effect.type === 'goToEvent')) {
        context.addIssue({
          code: 'custom',
          path: ['choices', index, 'effects'],
          message: 'Multi-select choices cannot link to events',
        })
      }
    })
  })

export const v2NamesSchema = z
  .array(
    z.strictObject({
      id: idSchema,
      name: textSchema,
      portraitAssetId: idSchema.optional(),
    }),
  )
  .min(1)
  .refine(
    (names) => new Set(names.map((item) => item.id)).size === names.length,
    {
      message: 'Name IDs must be unique',
    },
  )
  .refine(
    (names) => new Set(names.map((item) => item.name)).size === names.length,
    {
      message: 'Names must be unique',
    },
  )

export const v2FacultySchema = z.strictObject({
  id: idSchema,
  name: textSchema,
  supportsSixYear: z.boolean(),
})

export const v2MajorSchema = z.strictObject({
  id: idSchema,
  facultyId: idSchema,
  name: textSchema,
  programYears: z.union([z.literal(4), z.literal(6)]),
})

export const v2ElectiveSchema = z.strictObject({
  id: idSchema,
  name: textSchema,
  effects: z.array(v2StateEffectSchema),
})

export const v2AssetListSchema = z.array(
  z.strictObject({
    id: idSchema,
    kind: z.enum(['scene', 'portrait', 'bgm', 'sfx']),
    path: z
      .string()
      .regex(
        /^\/assets\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.(?:webp|png|mp3|ogg|wav)$/i,
      ),
  }),
)

export const v2ContentSchema = z
  .object({
    config: v2GameConfigSchema,
    events: z.array(v2EventSchema),
    characters: z.array(
      z.object({
        id: idSchema,
        name: textSchema,
        portraitAssetId: idSchema.optional(),
      }),
    ),
    assets: v2AssetListSchema,
    endings: z.array(
      z.object({
        id: idSchema,
        title: textSchema,
        summary: textSchema,
        conditions: z.array(v2ConditionSchema),
      }),
    ),
    names: v2NamesSchema,
    faculties: z.array(v2FacultySchema).min(1),
    majors: z.array(v2MajorSchema).min(1),
    electives: z.array(v2ElectiveSchema).min(1),
  })
  .superRefine((content, context) => {
    const report = (path: (string | number)[], message: string) =>
      context.addIssue({ code: 'custom', path, message })
    const uniqueIds = (items: { id: string }[], path: (string | number)[]) => {
      const seen = new Set<string>()
      items.forEach((item, index) => {
        if (seen.has(item.id))
          report([...path, index, 'id'], `Duplicate ID: ${item.id}`)
        seen.add(item.id)
      })
    }

    uniqueIds(content.events, ['events'])
    uniqueIds(content.characters, ['characters'])
    uniqueIds(content.assets, ['assets'])
    uniqueIds(content.endings, ['endings'])
    uniqueIds(content.config.backgrounds, ['config', 'backgrounds'])
    uniqueIds(content.faculties, ['faculties'])
    uniqueIds(content.majors, ['majors'])
    uniqueIds(content.electives, ['electives'])

    const eventIds = new Set(content.events.map((event) => event.id))
    const inactiveEventIds = new Set(
      content.events
        .filter((event) => event.active === false)
        .map((event) => event.id),
    )
    const characterIds = new Set(content.characters.map((item) => item.id))
    const faculties = new Map(content.faculties.map((item) => [item.id, item]))
    const majorIds = new Set(content.majors.map((item) => item.id))
    const electiveIds = new Set(content.electives.map((item) => item.id))
    const assets = new Map(
      content.assets.map((asset) => [asset.id, asset.kind]),
    )
    const checkEvent = (id: string, path: (string | number)[]) => {
      if (!eventIds.has(id)) report(path, `Unknown event: ${id}`)
      else if (inactiveEventIds.has(id)) report(path, `Inactive event: ${id}`)
    }
    const checkAsset = (
      id: string | undefined,
      kind: 'scene' | 'portrait' | 'bgm',
      path: (string | number)[],
    ) => {
      if (id && assets.get(id) !== kind)
        report(path, `Unknown ${kind} asset: ${id}`)
    }
    const checkConditions = (
      conditions: z.infer<typeof v2ConditionSchema>[],
      path: (string | number)[],
    ) => {
      conditions.forEach((condition, index) => {
        if (condition.type === 'pastEvent') {
          checkEvent(condition.eventId, [...path, index, 'eventId'])
        } else if (
          condition.type === 'faculty' &&
          !faculties.has(condition.facultyId)
        ) {
          report(
            [...path, index, 'facultyId'],
            `Unknown faculty: ${condition.facultyId}`,
          )
        } else if (
          condition.type === 'major' &&
          !majorIds.has(condition.majorId)
        ) {
          report(
            [...path, index, 'majorId'],
            `Unknown major: ${condition.majorId}`,
          )
        } else if (
          condition.type === 'elective' &&
          !electiveIds.has(condition.electiveId)
        ) {
          report(
            [...path, index, 'electiveId'],
            `Unknown elective: ${condition.electiveId}`,
          )
        }
      })
    }

    checkEvent(content.config.startingEventId, ['config', 'startingEventId'])
    const startingEvent = content.events.find(
      (event) => event.id === content.config.startingEventId,
    )
    if (startingEvent?.selection?.type !== 'program') {
      report(
        ['config', 'startingEventId'],
        'Starting event must select a faculty and major',
      )
    }
    content.majors.forEach((major, index) => {
      const faculty = faculties.get(major.facultyId)
      if (!faculty)
        report(
          ['majors', index, 'facultyId'],
          `Unknown faculty: ${major.facultyId}`,
        )
      if (major.programYears === 6 && !faculty?.supportsSixYear) {
        report(
          ['majors', index, 'programYears'],
          'Six-year major requires a six-year faculty',
        )
      }
    })
    content.names.forEach((name, index) => {
      checkAsset(name.portraitAssetId, 'portrait', [
        'names',
        index,
        'portraitAssetId',
      ])
    })
    content.characters.forEach((character, index) => {
      checkAsset(character.portraitAssetId, 'portrait', [
        'characters',
        index,
        'portraitAssetId',
      ])
    })
    content.events.forEach((event, eventIndex) => {
      const base = ['events', eventIndex]
      checkAsset(event.sceneAssetId, 'scene', [...base, 'sceneAssetId'])
      checkAsset(event.bgmAssetId, 'bgm', [...base, 'bgmAssetId'])
      checkConditions(event.conditions, [...base, 'conditions'])
      if (event.selection?.type === 'elective' && event.time.year !== 3) {
        report([...base, 'time', 'year'], 'Electives are selected in Year 3')
      }
      if (event.selection?.type === 'multiple') {
        checkEvent(event.selection.goToEventId, [
          ...base,
          'selection',
          'goToEventId',
        ])
      }
      event.lines.forEach((line, lineIndex) => {
        if (line.speakerId && !characterIds.has(line.speakerId)) {
          report(
            [...base, 'lines', lineIndex, 'speakerId'],
            `Unknown character: ${line.speakerId}`,
          )
        }
        checkAsset(line.portraitAssetId, 'portrait', [
          ...base,
          'lines',
          lineIndex,
          'portraitAssetId',
        ])
      })
      uniqueIds(event.choices, [...base, 'choices'])
      event.choices.forEach((choice, choiceIndex) => {
        const choiceBase = [...base, 'choices', choiceIndex]
        checkConditions(choice.conditions, [...choiceBase, 'conditions'])
        choice.effects.forEach((effect, effectIndex) => {
          if (effect.type === 'goToEvent') {
            checkEvent(effect.eventId, [
              ...choiceBase,
              'effects',
              effectIndex,
              'eventId',
            ])
          } else if (
            effect.type === 'schedule' &&
            effect.trigger.type === 'afterEvent'
          ) {
            checkEvent(effect.trigger.eventId, [
              ...choiceBase,
              'effects',
              effectIndex,
              'trigger',
              'eventId',
            ])
          }
        })
      })
    })
    content.endings.forEach((ending, index) => {
      checkConditions(ending.conditions, ['endings', index, 'conditions'])
    })
  })

export type V2Content = z.infer<typeof v2ContentSchema>
export type V2Stats = z.infer<typeof v2StatsSchema>
export type V2Event = z.infer<typeof v2EventSchema>
