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
      item.id === edgeId ? { ...item, from, port, to } : item,
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

export function moveFlowNodes(
  flow: V2Flow,
  positions: Record<string, Position>,
): V2Flow {
  return {
    ...flow,
    nodes: flow.nodes.map((node) =>
      positions[node.id]
        ? {
            ...node,
            position: {
              x: Math.round(positions[node.id].x),
              y: Math.round(positions[node.id].y),
            },
          }
        : node,
    ),
  }
}

export type LayoutDirection = 'horizontal' | 'vertical'
export type CardSize = { width: number; height: number }

/** Card size used when the board has not measured a card yet. */
export const LAYOUT_CARD: CardSize = { width: 240, height: 120 }
export const LAYOUT_GAP = 80
export const LAYOUT_COLUMN = LAYOUT_CARD.width + LAYOUT_GAP
export const LAYOUT_ROW = LAYOUT_CARD.height + LAYOUT_GAP

/**
 * Column of each card reachable from Start: the longest path from Start,
 * so every forward edge points right. Edges that loop back to a card on the
 * current DFS path are left out, so loops cannot stretch the board.
 */
function longestPathColumns(flow: V2Flow): Map<string, number> {
  const next = new Map<string, string[]>()
  for (const edge of flow.edges)
    next.set(edge.from, [...(next.get(edge.from) ?? []), edge.to])
  const depth = new Map<string, number>()
  const start = flow.nodes.find((node) => node.type === 'start')
  if (!start) return depth

  const known = new Set(flow.nodes.map((node) => node.id))
  const onPath = new Set<string>()
  const done = new Set<string>()
  const finished: string[] = []
  const forward: [string, string][] = []
  const visit = (id: string) => {
    onPath.add(id)
    for (const to of next.get(id) ?? []) {
      if (!known.has(to) || onPath.has(to)) continue
      forward.push([id, to])
      if (!done.has(to)) visit(to)
    }
    onPath.delete(id)
    done.add(id)
    finished.push(id)
  }
  visit(start.id)

  const incoming = new Map<string, string[]>()
  for (const [from, to] of forward)
    incoming.set(to, [...(incoming.get(to) ?? []), from])
  for (const id of finished.reverse())
    depth.set(
      id,
      Math.max(
        0,
        ...(incoming.get(id) ?? []).map((from) => depth.get(from)! + 1),
      ),
    )
  return depth
}

export function layoutFlow(
  flow: V2Flow,
  {
    direction = 'horizontal',
    sizes = {},
  }: { direction?: LayoutDirection; sizes?: Record<string, CardSize> } = {},
): V2Flow {
  const depth = longestPathColumns(flow)
  const unreachableColumn = Math.max(-1, ...depth.values()) + 1
  const columns: string[][] = []
  for (const node of flow.nodes) {
    if (node.type === 'group' || node.parentId) continue
    const column = depth.get(node.id) ?? unreachableColumn
    ;(columns[column] ??= []).push(node.id)
  }
  const ordered = orderColumns(
    Array.from(columns, (ids) => ids ?? []),
    flow.edges,
  )

  // Ranks run along the main axis; cards in one rank spread on the cross axis.
  const vertical = direction === 'vertical'
  const size = (id: string) => sizes[id] ?? LAYOUT_CARD
  const main = (id: string) => (vertical ? size(id).height : size(id).width)
  const cross = (id: string) => (vertical ? size(id).width : size(id).height)
  const spans = ordered.map(
    (ids) =>
      ids.reduce((sum, id) => sum + cross(id), 0) +
      LAYOUT_GAP * Math.max(0, ids.length - 1),
  )
  const widest = Math.max(0, ...spans)
  const positions: Record<string, Position> = {}
  let rankStart = 0
  ordered.forEach((ids, rank) => {
    let crossStart = (widest - spans[rank]) / 2
    for (const id of ids) {
      positions[id] = vertical
        ? { x: crossStart, y: rankStart }
        : { x: rankStart, y: crossStart }
      crossStart += cross(id) + LAYOUT_GAP
    }
    rankStart += Math.max(0, ...ids.map(main)) + LAYOUT_GAP
  })
  return moveFlowNodes(flow, positions)
}

const LAYOUT_SWEEPS = 4

/** Centered row of each card, so columns of different heights compare. */
function columnRows(columns: string[][]): Map<string, number> {
  const rows = new Map<string, number>()
  for (const ids of columns)
    ids.forEach((id, row) => rows.set(id, row - (ids.length - 1) / 2))
  return rows
}

/**
 * Counts crossings between edges that join the same pair of columns.
 * Edges inside one column are ignored.
 */
export function countFlowCrossings(
  columns: string[][],
  edges: Pick<V2Flow['edges'][number], 'from' | 'to'>[],
): number {
  const rows = columnRows(columns)
  const columnOf = new Map<string, number>()
  columns.forEach((ids, column) =>
    ids.forEach((id) => columnOf.set(id, column)),
  )
  const groups = new Map<string, [number, number][]>()
  for (const edge of edges) {
    const from = columnOf.get(edge.from)
    const to = columnOf.get(edge.to)
    if (from === undefined || to === undefined || from === to) continue
    const [left, right] =
      from < to ? [edge.from, edge.to] : [edge.to, edge.from]
    const key = `${Math.min(from, to)}:${Math.max(from, to)}`
    groups.set(key, [
      ...(groups.get(key) ?? []),
      [rows.get(left)!, rows.get(right)!],
    ])
  }
  let crossings = 0
  for (const lines of groups.values())
    for (let a = 0; a < lines.length; a++)
      for (let b = a + 1; b < lines.length; b++)
        if ((lines[a][0] - lines[b][0]) * (lines[a][1] - lines[b][1]) < 0)
          crossings++
  return crossings
}

/**
 * Barycenter ordering: sweeps left to right, then right to left, sorting each
 * column by the mean row of its neighbors on the side already placed, and
 * keeps the order with the fewest crossings. Ties keep the current order.
 */
function orderColumns(columns: string[][], edges: V2Flow['edges']): string[][] {
  const columnOf = new Map<string, number>()
  columns.forEach((ids, column) =>
    ids.forEach((id) => columnOf.set(id, column)),
  )
  const neighbors = new Map<string, string[]>()
  for (const edge of edges) {
    if (!columnOf.has(edge.from) || !columnOf.has(edge.to)) continue
    if (columnOf.get(edge.from) === columnOf.get(edge.to)) continue
    neighbors.set(edge.from, [...(neighbors.get(edge.from) ?? []), edge.to])
    neighbors.set(edge.to, [...(neighbors.get(edge.to) ?? []), edge.from])
  }

  let current = columns.map((ids) => [...ids])
  let best = current
  let bestCrossings = countFlowCrossings(best, edges)

  const sortColumn = (column: number, side: 'left' | 'right') => {
    const rows = columnRows(current)
    const score = (id: string) => {
      const placed = (neighbors.get(id) ?? []).filter((other) =>
        side === 'left'
          ? columnOf.get(other)! < column
          : columnOf.get(other)! > column,
      )
      if (!placed.length) return rows.get(id)!
      return (
        placed.reduce((sum, other) => sum + rows.get(other)!, 0) / placed.length
      )
    }
    const ids = current[column]
    const scored = ids.map((id, at) => ({ id, at, score: score(id) }))
    scored.sort((a, b) => a.score - b.score || a.at - b.at)
    current = current.map((other, at) =>
      at === column ? scored.map((item) => item.id) : other,
    )
  }

  for (let sweep = 0; sweep < LAYOUT_SWEEPS; sweep++) {
    for (let column = 1; column < current.length; column++)
      sortColumn(column, 'left')
    for (let column = current.length - 2; column >= 0; column--)
      sortColumn(column, 'right')
    const crossings = countFlowCrossings(current, edges)
    if (crossings < bestCrossings) {
      best = current
      bestCrossings = crossings
    }
  }
  return best
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
