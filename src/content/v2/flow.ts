import { z } from 'zod'
import {
  v2ConditionSchema,
  v2IdSchema,
  v2StoryIdSchema,
  type V2Content,
} from './schema'

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
  content: Pick<V2Content, 'events' | 'endings'>,
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
