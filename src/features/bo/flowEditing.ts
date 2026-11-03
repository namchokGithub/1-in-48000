import type {
  V2Content,
  V2Event,
  V2Flow,
  V2FlowIssue,
  V2FlowNode,
} from '../../content/v2/schema'

type Position = V2FlowNode['position']
type AddableType = 'condition' | 'random' | 'nextPeriod' | 'ending' | 'group'

export type FlowPort = { id: string; label: string }

const fixedPorts: Record<Exclude<V2FlowNode['type'], 'event'>, FlowPort[]> = {
  start: [{ id: 'next', label: 'เริ่ม' }],
  condition: [
    { id: 'pass', label: 'ผ่าน' },
    { id: 'fail', label: 'ไม่ผ่าน' },
  ],
  random: [
    { id: 'after', label: 'หลังสุ่ม' },
    { id: 'fallback', label: 'ทางสำรอง' },
  ],
  nextPeriod: [
    { id: 'next', label: 'ช่วงถัดไป' },
    { id: 'graduate', label: 'จบการศึกษา' },
    { id: 'extend', label: 'เรียนต่อ' },
  ],
  ending: [],
  group: [],
}

export function flowPorts(
  node: V2FlowNode,
  events: Pick<V2Event, 'id' | 'selection' | 'choices'>[],
): FlowPort[] {
  if (node.type !== 'event') return fixedPorts[node.type]
  const event = events.find((item) => item.id === node.eventId)
  if (!event) return []
  if (event.selection) return [{ id: 'next', label: 'ต่อไป' }]
  return event.choices.map((choice) => ({ id: choice.id, label: choice.text }))
}

function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base
  let suffix = 2
  while (taken.has(`${base}_${suffix}`)) suffix += 1
  return `${base}_${suffix}`
}

export function placeEvent(
  flow: V2Flow,
  events: V2Event[],
  eventId: string,
  position: Position,
): V2Flow | string {
  const event = events.find((item) => item.id === eventId)
  if (!event) return `ไม่พบเหตุการณ์ ${eventId}`
  if (event.active === false) return 'เหตุการณ์ที่ปิดใช้งานวางบนกระดานไม่ได้'
  if (event.pool) return 'เหตุการณ์ใน Pool ใช้ผ่านการ์ดสุ่ม ไม่ต้องวางบนกระดาน'
  if (
    flow.nodes.some((node) => node.type === 'event' && node.eventId === eventId)
  )
    return 'เหตุการณ์นี้อยู่บนกระดานแล้ว'
  const id = uniqueId(
    `n_${eventId}`,
    new Set(flow.nodes.map((node) => node.id)),
  )
  return {
    ...flow,
    nodes: [...flow.nodes, { id, type: 'event', eventId, position }],
  }
}

export function addFlowNode(
  flow: V2Flow,
  content: Pick<V2Content, 'events' | 'endings'>,
  type: AddableType,
  position: Position,
): V2Flow {
  const id = uniqueId(type, new Set(flow.nodes.map((node) => node.id)))
  let node: V2FlowNode
  if (type === 'condition') {
    node = {
      id,
      type,
      join: 'and',
      conditions: [{ type: 'flag', flagId: 'new_flag', value: true }],
      position,
    }
  } else if (type === 'random') {
    const poolId =
      content.events.find((event) => event.pool && event.active !== false)
        ?.pool ?? 'new_pool'
    node = { id, type, poolId, position }
  } else if (type === 'ending') {
    node = {
      id,
      type,
      endingId: content.endings[0]?.id ?? 'new_ending',
      position,
    }
  } else if (type === 'group') {
    node = {
      id,
      type,
      title: 'กลุ่มย่อย',
      color: 'green',
      width: 560,
      height: 420,
      position,
    }
  } else {
    node = { id, type, position }
  }
  return { ...flow, nodes: [...flow.nodes, node] }
}

export function connectPorts(
  flow: V2Flow,
  from: string,
  port: string,
  to: string,
): V2Flow {
  const source = flow.nodes.find((node) => node.id === from)
  const target = flow.nodes.find((node) => node.id === to)
  if (
    !source ||
    !target ||
    source.type === 'ending' ||
    source.type === 'group' ||
    target.type === 'start' ||
    target.type === 'group'
  )
    return flow
  if (
    flow.edges.some(
      (edge) =>
        edge.from === from &&
        edge.port === port &&
        edge.to === to &&
        !edge.condition,
    )
  )
    return flow
  const id = uniqueId(
    `e_${from}_${port}`.toLowerCase().replace(/[^a-z0-9_-]/g, '_'),
    new Set(flow.edges.map((edge) => edge.id)),
  )
  return { ...flow, edges: [...flow.edges, { id, from, port, to }] }
}

export function reconnectEdge(
  flow: V2Flow,
  edgeId: string,
  from: string,
  port: string,
  to: string,
): V2Flow {
  const edge = flow.edges.find((item) => item.id === edgeId)
  const source = flow.nodes.find((node) => node.id === from)
  const target = flow.nodes.find((node) => node.id === to)
  if (
    !edge ||
    !source ||
    !target ||
    source.type === 'ending' ||
    source.type === 'group' ||
    target.type === 'start' ||
    target.type === 'group'
  )
    return flow
  if (edge.from === from && edge.port === port && edge.to === to) return flow
  if (
    !edge.condition &&
    flow.edges.some(
      (item) =>
        item.id !== edgeId &&
        item.from === from &&
        item.port === port &&
        item.to === to &&
        !item.condition,
    )
  )
    return flow
  return {
    ...flow,
    edges: flow.edges.map((item) =>
      item.id === edgeId ? { ...withoutRoute(item), from, port, to } : item,
    ),
  }
}

export function removeFlowNodes(flow: V2Flow, ids: string[]): V2Flow {
  const removed = new Set(
    flow.nodes
      .filter((node) => ids.includes(node.id) && node.type !== 'start')
      .map((node) => node.id),
  )
  return {
    nodes: flow.nodes
      .filter((node) => !removed.has(node.id))
      .map((node) => {
        if (!node.parentId || !removed.has(node.parentId)) return node
        const parent = flow.nodes.find((item) => item.id === node.parentId)
        const { parentId: _parentId, ...ungrouped } = node
        void _parentId
        return parent?.type === 'group'
          ? {
              ...ungrouped,
              position: {
                x: node.position.x + parent.position.x,
                y: node.position.y + parent.position.y,
              },
            }
          : ungrouped
      }),
    edges: flow.edges.filter(
      (edge) => !removed.has(edge.from) && !removed.has(edge.to),
    ),
  }
}

export function reparentFlowNode(
  flow: V2Flow,
  nodeId: string,
  parentId?: string,
): V2Flow {
  const node = flow.nodes.find((item) => item.id === nodeId)
  const parent = parentId
    ? flow.nodes.find((item) => item.id === parentId)
    : undefined
  if (
    !node ||
    node.type === 'start' ||
    node.type === 'group' ||
    (parentId && parent?.type !== 'group') ||
    node.parentId === parentId
  )
    return flow
  const oldParent = node.parentId
    ? flow.nodes.find((item) => item.id === node.parentId)
    : undefined
  const absolute = {
    x:
      node.position.x +
      (oldParent?.type === 'group' ? oldParent.position.x : 0),
    y:
      node.position.y +
      (oldParent?.type === 'group' ? oldParent.position.y : 0),
  }
  return {
    ...flow,
    nodes: flow.nodes.map((item) => {
      if (item.id !== nodeId) return item
      if (!parent) {
        const { parentId: _parentId, ...ungrouped } = item
        void _parentId
        return { ...ungrouped, position: absolute }
      }
      return {
        ...item,
        parentId,
        position: {
          x: absolute.x - parent.position.x,
          y: absolute.y - parent.position.y,
        },
      }
    }),
  }
}

export function removeFlowEdges(flow: V2Flow, ids: string[]): V2Flow {
  return { ...flow, edges: flow.edges.filter((edge) => !ids.includes(edge.id)) }
}

export function finishReconnectEdge(
  flow: V2Flow,
  edgeId: string,
  reconnected: boolean,
): V2Flow {
  if (reconnected || !flow.edges.some((edge) => edge.id === edgeId)) return flow
  return removeFlowEdges(flow, [edgeId])
}

function withoutRoute<T extends { route?: unknown }>(
  edge: T,
): Omit<T, 'route'> {
  const { route: _route, ...rest } = edge
  void _route
  return rest
}

/**
 * Moves cards. Auto-layout routes of edges that touch a moved card, or a card
 * inside a moved Sub Flow, no longer fit and are dropped.
 */
export function moveFlowNodes(
  flow: V2Flow,
  positions: Record<string, Position>,
): V2Flow {
  const moved = new Set<string>()
  const nodes = flow.nodes.map((node) => {
    const next = positions[node.id]
    if (!next) return node
    const position = { x: Math.round(next.x), y: Math.round(next.y) }
    if (position.x === node.position.x && position.y === node.position.y)
      return node
    moved.add(node.id)
    return { ...node, position }
  })
  if (!moved.size) return flow
  for (const node of flow.nodes)
    if (node.parentId && moved.has(node.parentId)) moved.add(node.id)
  return {
    nodes,
    edges: flow.edges.map((edge) =>
      edge.route && (moved.has(edge.from) || moved.has(edge.to))
        ? withoutRoute(edge)
        : edge,
    ),
  }
}

export type FlowNodeIssues = { errors: string[]; warnings: string[] }

export function issuesByNode(
  flow: V2Flow,
  errors: V2FlowIssue[],
  warnings: V2FlowIssue[],
): Map<string, FlowNodeIssues> {
  const result = new Map<string, FlowNodeIssues>()
  const add = (issue: V2FlowIssue, kind: keyof FlowNodeIssues) => {
    const [collection, index] = issue.path
    const id =
      collection === 'nodes' && typeof index === 'number'
        ? flow.nodes[index]?.id
        : collection === 'edges' && typeof index === 'number'
          ? flow.edges[index]?.from
          : undefined
    if (!id) return
    const entry = result.get(id) ?? { errors: [], warnings: [] }
    entry[kind].push(issue.message)
    result.set(id, entry)
  }
  errors.forEach((issue) => add(issue, 'errors'))
  warnings.forEach((issue) => add(issue, 'warnings'))
  return result
}

export type FlowFocus = { nodeIds: string[]; edgeIds: string[] }

export function focusedFlow(
  flow: V2Flow,
  selection: { kind: 'node' | 'edge'; id: string },
  depth: number,
): FlowFocus {
  const selectedEdge =
    selection.kind === 'edge'
      ? flow.edges.find((edge) => edge.id === selection.id)
      : undefined
  const nodeIds = new Set(
    selectedEdge ? [selectedEdge.from, selectedEdge.to] : [selection.id],
  )
  const edgeIds = new Set(selectedEdge ? [selectedEdge.id] : [])
  let frontier = [...nodeIds]
  for (let step = selectedEdge ? 1 : 0; step < depth; step++) {
    const reached: string[] = []
    for (const edge of flow.edges) {
      const near = frontier.includes(edge.from)
        ? edge.to
        : frontier.includes(edge.to)
          ? edge.from
          : undefined
      if (near === undefined) continue
      edgeIds.add(edge.id)
      if (!nodeIds.has(near)) {
        nodeIds.add(near)
        reached.push(near)
      }
    }
    frontier = reached
  }
  return { nodeIds: [...nodeIds], edgeIds: [...edgeIds] }
}

export type FlowEdgeStyle = 'normal' | 'fallback' | 'pass' | 'fail' | 'key'

export function edgeStyle(
  flow: V2Flow,
  edge: V2Flow['edges'][number],
): FlowEdgeStyle {
  const source = flow.nodes.find((node) => node.id === edge.from)
  const target = flow.nodes.find((node) => node.id === edge.to)
  if (source?.type === 'condition')
    return edge.port === 'pass' ? 'pass' : 'fail'
  if (
    source?.type === 'nextPeriod' &&
    (edge.port === 'graduate' || edge.port === 'extend')
  )
    return 'key'
  if (target?.type === 'ending') return 'key'
  if (source?.type === 'random' && edge.port === 'fallback') return 'fallback'
  if (edge.condition) return 'normal'
  const index = flow.edges.indexOf(edge)
  return flow.edges.some(
    (other, otherIndex) =>
      otherIndex < index &&
      other.from === edge.from &&
      other.port === edge.port &&
      other.condition,
  )
    ? 'fallback'
    : 'normal'
}

export function moveEdgeOrder(
  flow: V2Flow,
  id: string,
  direction: -1 | 1,
): V2Flow {
  const edge = flow.edges.find((item) => item.id === id)
  if (!edge) return flow
  const siblings = flow.edges
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.from === edge.from && item.port === edge.port)
  const position = siblings.findIndex(({ item }) => item.id === id)
  const target = siblings[position + direction]
  if (!target) return flow
  const edges = [...flow.edges]
  edges[siblings[position].index] = target.item
  edges[target.index] = edge
  return { ...flow, edges }
}

export function syncEventChange(
  flow: V2Flow,
  before: V2Event,
  after: V2Event,
): V2Flow {
  const nodeIds = new Set(
    flow.nodes
      .filter((node) => node.type === 'event' && node.eventId === before.id)
      .map((node) => node.id),
  )
  if (!nodeIds.size) return flow
  const renamedPorts = new Map<string, string>()
  if (!before.selection && !after.selection) {
    before.choices.forEach((choice, index) => {
      const next = after.choices[index]
      if (
        next &&
        next.id !== choice.id &&
        !before.choices.some((item) => item.id === next.id)
      )
        renamedPorts.set(choice.id, next.id)
    })
  }
  if (before.id === after.id && !renamedPorts.size) return flow
  return {
    nodes: flow.nodes.map((node) =>
      nodeIds.has(node.id) && node.type === 'event'
        ? { ...node, eventId: after.id }
        : node,
    ),
    edges: flow.edges.map((edge) =>
      nodeIds.has(edge.from) && renamedPorts.has(edge.port)
        ? { ...edge, port: renamedPorts.get(edge.port)! }
        : edge,
    ),
  }
}

export function removeEventFromFlow(flow: V2Flow, eventId: string): V2Flow {
  return removeFlowNodes(
    flow,
    flow.nodes
      .filter((node) => node.type === 'event' && node.eventId === eventId)
      .map((node) => node.id),
  )
}

export function filesToSave<T extends string>(
  file: T | 'flow',
  dirty: Partial<Record<T | 'flow' | 'events', boolean>>,
): (T | 'flow' | 'events')[] {
  if (file !== 'flow') return [file]
  return (['events', 'flow'] as const).filter((name) => dirty[name])
}
