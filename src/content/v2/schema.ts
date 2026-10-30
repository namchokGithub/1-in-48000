import { z } from 'zod'
import { validateV2Flow } from './flowValidator.ts'

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
  loan: z.strictObject({
    annualRatePercent: z.number().min(0).max(100),
    periodDays: z.strictObject({
      term1: z.int().min(0),
      break: z.int().min(0),
      term2: z.int().min(0),
      summer: z.int().min(0),
    }),
  }),
})

export const v2OutfitSchema = z.enum(['casual', 'student'])
export const V2_DEFAULT_OUTFIT = 'student'

export const v2EventSchema = z
  .strictObject({
    id: storyIdSchema,
    active: z.boolean().optional(),
    kind: z.enum(['main', 'conditional', 'holiday', 'random']),
    time: v2TimeSchema,
    pool: storyIdSchema.optional(),
    title: textSchema,
    selection: z
      .discriminatedUnion('type', [
        z.object({ type: z.literal('program') }),
        z.object({ type: z.literal('elective') }),
        z.object({
          type: z.literal('multiple'),
          min: z.int().min(1),
          max: z.int().min(1),
        }),
      ])
      .optional(),
    sceneAssetId: idSchema.optional(),
    bgmAssetId: idSchema.optional(),
    outfit: v2OutfitSchema.optional(),
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
          showWhenLocked: z.boolean().optional(),
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
  })

export const v2NamesSchema = z
  .array(
    z.strictObject({
      id: idSchema,
      name: textSchema,
      portraits: z
        .strictObject({
          casual: idSchema.optional(),
          student: idSchema.optional(),
        })
        .optional(),
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

const positionSchema = z.strictObject({ x: z.number(), y: z.number() })

const nodeBase = { id: v2IdSchema, position: positionSchema }

export const v2FlowNodeSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...nodeBase, type: z.literal('start') }),
  z.strictObject({
    ...nodeBase,
    type: z.literal('event'),
    eventId: v2StoryIdSchema,
  }),
  z.strictObject({
    ...nodeBase,
    type: z.literal('condition'),
    join: z.enum(['and', 'or']),
    conditions: z.array(v2ConditionSchema).min(1),
  }),
  z.strictObject({
    ...nodeBase,
    type: z.literal('random'),
    poolId: v2StoryIdSchema,
  }),
  z.strictObject({ ...nodeBase, type: z.literal('nextPeriod') }),
  z.strictObject({
    ...nodeBase,
    type: z.literal('ending'),
    endingId: v2IdSchema,
  }),
])

export const v2FlowEdgeSchema = z.strictObject({
  id: v2IdSchema,
  from: v2IdSchema,
  port: z.string().min(1),
  to: v2IdSchema,
  condition: v2ConditionSchema.optional(),
})

type FlowNode = z.infer<typeof v2FlowNodeSchema>

const fixedPorts: Record<Exclude<FlowNode['type'], 'event'>, string[]> = {
  start: ['next'],
  condition: ['pass', 'fail'],
  random: ['after', 'fallback'],
  nextPeriod: ['next', 'graduate', 'extend'],
  ending: [],
}

export const v2FlowSchema = z
  .strictObject({
    nodes: z.array(v2FlowNodeSchema),
    edges: z.array(v2FlowEdgeSchema),
  })
  .superRefine((flow, context) => {
    const report = (path: (string | number)[], message: string) =>
      context.addIssue({ code: 'custom', path, message })
    const nodes = new Map<string, FlowNode>()
    flow.nodes.forEach((node, index) => {
      if (nodes.has(node.id))
        report(['nodes', index, 'id'], `Duplicate ID: ${node.id}`)
      nodes.set(node.id, node)
    })
    const startCount = flow.nodes.filter((node) => node.type === 'start').length
    if (startCount !== 1)
      report(['nodes'], 'Flow must have exactly one Start node')

    const edgeIds = new Set<string>()
    flow.edges.forEach((edge, index) => {
      const base = ['edges', index]
      if (edgeIds.has(edge.id))
        report([...base, 'id'], `Duplicate ID: ${edge.id}`)
      edgeIds.add(edge.id)
      const source = nodes.get(edge.from)
      if (!source) report([...base, 'from'], `Unknown node: ${edge.from}`)
      else if (
        source.type !== 'event' &&
        !fixedPorts[source.type].includes(edge.port)
      ) {
        report([...base, 'port'], `Invalid ${source.type} port: ${edge.port}`)
      }
      const target = nodes.get(edge.to)
      if (!target) report([...base, 'to'], `Unknown node: ${edge.to}`)
      else if (target.type === 'start')
        report([...base, 'to'], 'Edges cannot enter the Start node')
    })
  })

export type V2Flow = z.infer<typeof v2FlowSchema>
export type V2FlowNode = FlowNode
export type V2FlowEdge = z.infer<typeof v2FlowEdgeSchema>

export type V2FlowIssue = { path: (string | number)[]; message: string }

export function checkV2FlowReferences(
  flow: V2Flow,
  content: { events: V2Event[]; endings: { id: string }[] },
): V2FlowIssue[] {
  const issues: V2FlowIssue[] = []
  const report = (path: (string | number)[], message: string) =>
    issues.push({ path, message })
  const events = new Map(content.events.map((event) => [event.id, event]))
  const endingIds = new Set(content.endings.map((ending) => ending.id))
  const pools = new Set(
    content.events.flatMap((event) =>
      event.pool && event.active !== false ? [event.pool] : [],
    ),
  )
  const placed = new Set<string>()
  const nodes = new Map(flow.nodes.map((node) => [node.id, node]))

  flow.nodes.forEach((node, index) => {
    const base = ['nodes', index]
    if (node.type === 'event') {
      const event = events.get(node.eventId)
      if (!event) report([...base, 'eventId'], `Unknown event: ${node.eventId}`)
      else if (event.active === false)
        report([...base, 'eventId'], `Inactive event: ${node.eventId}`)
      else if (event.pool)
        report(
          [...base, 'eventId'],
          `Pool event cannot be placed on the board: ${node.eventId}`,
        )
      if (placed.has(node.eventId))
        report([...base, 'eventId'], `Event placed twice: ${node.eventId}`)
      placed.add(node.eventId)
    } else if (node.type === 'ending' && !endingIds.has(node.endingId)) {
      report([...base, 'endingId'], `Unknown ending: ${node.endingId}`)
    } else if (node.type === 'random' && !pools.has(node.poolId)) {
      report([...base, 'poolId'], `Unknown pool: ${node.poolId}`)
    }
  })

  const startIds = new Set(
    flow.nodes.filter((node) => node.type === 'start').map((node) => node.id),
  )
  const startEdges = flow.edges.filter((edge) => startIds.has(edge.from))
  if (!startEdges.length) report(['edges'], 'Start node has no edge')
  startEdges.forEach((edge) => {
    const target = nodes.get(edge.to)
    const event =
      target?.type === 'event' ? events.get(target.eventId) : undefined
    if (event?.selection?.type !== 'program')
      report(
        ['edges', flow.edges.indexOf(edge), 'to'],
        'Start must lead to the faculty and major event',
      )
  })

  flow.edges.forEach((edge, index) => {
    const source = nodes.get(edge.from)
    if (source?.type !== 'event') return
    const event = events.get(source.eventId)
    if (!event) return
    const ports = event.selection
      ? ['next']
      : event.choices.map((choice) => choice.id)
    if (!ports.includes(edge.port))
      report(['edges', index, 'port'], `Invalid event port: ${edge.port}`)
  })

  return issues
}

export const v2ContentSchema = z
  .object({
    config: v2GameConfigSchema,
    events: z.array(v2EventSchema),
    characters: z.array(
      z.object({
        id: idSchema,
        name: textSchema,
        portraitAssetId: idSchema.optional(),
        isNarrator: z.boolean().optional(),
      }),
    ),
    assets: v2AssetListSchema,
    endings: z.array(
      z.object({
        id: idSchema,
        title: textSchema,
        summary: textSchema,
      }),
    ),
    names: v2NamesSchema,
    faculties: z.array(v2FacultySchema).min(1),
    majors: z.array(v2MajorSchema).min(1),
    electives: z.array(v2ElectiveSchema).min(1),
    flow: v2FlowSchema,
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

    const flowIssues = [
      ...checkV2FlowReferences(content.flow, content),
      ...validateV2Flow(content.flow, content.events).errors,
    ]
    flowIssues.forEach((issue) =>
      report(['flow', ...issue.path], issue.message),
    )
    content.flow.nodes.forEach((node, index) => {
      if (node.type === 'condition')
        checkConditions(node.conditions, ['flow', 'nodes', index, 'conditions'])
    })
    content.flow.edges.forEach((edge, index) => {
      if (edge.condition)
        checkConditions([edge.condition], ['flow', 'edges', index, 'condition'])
    })
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
      if (!name.portraits) return
      v2OutfitSchema.options.forEach((outfit) => {
        const path = ['names', index, 'portraits', outfit]
        const id = name.portraits?.[outfit]
        if (!id) report(path, `Missing ${outfit} portrait`)
        checkAsset(id, 'portrait', path)
      })
    })
    let narratorCount = 0
    content.characters.forEach((character, index) => {
      if (character.isNarrator && ++narratorCount > 1)
        report(
          ['characters', index, 'isNarrator'],
          'Only one character can be the narrator',
        )
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
          if (
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
  })

export type V2Content = z.infer<typeof v2ContentSchema>
export type V2Stats = z.infer<typeof v2StatsSchema>
export type V2Event = z.infer<typeof v2EventSchema>
export type V2Outfit = z.infer<typeof v2OutfitSchema>
