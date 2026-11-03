import type {
  ElkExtendedEdge,
  ElkNode,
  ElkPort,
  LayoutOptions,
} from 'elkjs/lib/elk-api'
import type { V2Event, V2Flow, V2FlowNode } from '../../content/v2/schema'
import { flowPorts } from './flowEditing'
import { bottomHandleId } from './flowEdgeGeometry'

export type LayoutDirection = 'horizontal' | 'vertical'
type Point = { x: number; y: number }

/**
 * Measured card size, plus handle centers relative to the card's top-left
 * corner, keyed by React Flow handle ID.
 */
export type CardMeasure = {
  width: number
  height: number
  handles?: Record<string, Point>
}

/** Card size used when the board has not measured a card yet. */
export const LAYOUT_CARD = { width: 240, height: 120 }

/** Board grid: card drag snap, background dots, and auto layout. */
export const FLOW_GRID = 24

const GROUP_PADDING = '[top=72,left=48,bottom=48,right=48]'

const rootOptions = (direction: LayoutDirection): LayoutOptions => ({
  'elk.algorithm': 'layered',
  'elk.direction': direction === 'vertical' ? 'DOWN' : 'RIGHT',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.spacing.nodeNode': '48',
  'elk.layered.spacing.nodeNodeBetweenLayers': '96',
  'elk.spacing.edgeEdge': '12',
  'elk.spacing.edgeNode': '24',
  'elk.layered.spacing.edgeNodeBetweenLayers': '24',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '12',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  // Edge routes come back in board coordinates; card positions stay
  // relative to their Sub Flow, the same as in flow.json.
  'elk.json.edgeCoords': 'ROOT',
})

const portId = (nodeId: string, port: string) => `${nodeId}::${port}`
const inPortId = (nodeId: string) => `${nodeId}::#in`

/**
 * Builds the ELK graph: one node per card with a fixed port at each of its
 * React Flow handles, and Sub Flows as compound nodes around their cards.
 * Edges to a missing card or port are left out.
 */
export function elkGraph(
  flow: V2Flow,
  events: Pick<V2Event, 'id' | 'selection' | 'choices'>[],
  {
    direction = 'horizontal',
    sizes = {},
  }: { direction?: LayoutDirection; sizes?: Record<string, CardMeasure> } = {},
): ElkNode {
  const vertical = direction === 'vertical'
  const groups = new Map(
    flow.nodes.flatMap((node) =>
      node.type === 'group' ? [[node.id, node] as const] : [],
    ),
  )
  const parentOf = (node: V2FlowNode) =>
    node.parentId && groups.has(node.parentId) ? node.parentId : undefined
  const ports = new Set<string>()

  const card = (node: V2FlowNode): ElkNode => {
    const measured = sizes[node.id]
    const width = measured?.width ?? LAYOUT_CARD.width
    const height = measured?.height ?? LAYOUT_CARD.height
    const handle = (id: string, fallback: Point) =>
      measured?.handles?.[id] ?? fallback
    const elkPorts: ElkPort[] = []
    if (node.type !== 'start') {
      const at = vertical
        ? handle('in-top', { x: width / 2, y: 0 })
        : handle('in', { x: 0, y: height / 2 })
      elkPorts.push({
        id: inPortId(node.id),
        x: at.x,
        y: at.y,
        width: 0,
        height: 0,
        layoutOptions: { 'elk.port.side': vertical ? 'NORTH' : 'WEST' },
      })
    }
    const outputs = flowPorts(node, events)
    outputs.forEach((port, index) => {
      const share = (index + 1) / (outputs.length + 1)
      const at = vertical
        ? handle(bottomHandleId(port.id), { x: width * share, y: height })
        : handle(port.id, { x: width, y: height * share })
      const id = portId(node.id, port.id)
      ports.add(id)
      elkPorts.push({
        id,
        x: at.x,
        y: at.y,
        width: 0,
        height: 0,
        layoutOptions: { 'elk.port.side': vertical ? 'SOUTH' : 'EAST' },
      })
    })
    return {
      id: node.id,
      width,
      height,
      ports: elkPorts,
      layoutOptions: {
        'elk.portConstraints': 'FIXED_POS',
        ...(node.type === 'start'
          ? { 'elk.layered.layering.layerConstraint': 'FIRST' }
          : {}),
      },
    }
  }

  const children = flow.nodes.flatMap((node): ElkNode[] => {
    if (parentOf(node)) return []
    if (node.type !== 'group') return [card(node)]
    const inside = flow.nodes.filter((item) => parentOf(item) === node.id)
    if (!inside.length)
      return [{ id: node.id, width: node.width, height: node.height }]
    return [
      {
        id: node.id,
        layoutOptions: { 'elk.padding': GROUP_PADDING },
        children: inside.map(card),
      },
    ]
  })

  const cards = new Set(
    flow.nodes.filter((node) => node.type !== 'group').map((node) => node.id),
  )
  const edges: ElkExtendedEdge[] = flow.edges.flatMap((edge) => {
    const source = portId(edge.from, edge.port)
    if (!ports.has(source) || !cards.has(edge.to)) return []
    const target = flow.nodes.find((node) => node.id === edge.to)
    if (target?.type === 'start') return []
    return [{ id: edge.id, sources: [source], targets: [inPortId(edge.to)] }]
  })

  return {
    id: '#root',
    layoutOptions: rootOptions(direction),
    children,
    edges,
  }
}

const round = (point: Point): Point => ({
  x: Math.round(point.x),
  y: Math.round(point.y),
})
const snap = (value: number, grid: number) => Math.round(value / grid) * grid
const snapPoint = (point: Point, grid: number): Point => ({
  x: snap(point.x, grid),
  y: snap(point.y, grid),
})
const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

/**
 * Moves a route's ends with their cards. Each end drags the points after it
 * while the line keeps the same direction, so every segment stays straight.
 * A straight route whose ends moved apart gets a step in the middle.
 */
function shiftRoute(points: Point[], from: Point, to: Point): Point[] {
  const last = points.length - 1
  const flat = (index: number) => points[index].y === points[index + 1].y
  const out = points.map((point) => ({ ...point }))
  out[0] = { x: out[0].x + from.x, y: out[0].y + from.y }
  out[last] = { x: out[last].x + to.x, y: out[last].y + to.y }
  const straight = points.every((_, index) =>
    index === last ? true : flat(index) === flat(0),
  )
  if (straight) {
    const key = flat(0) ? 'y' : 'x'
    if (out[0][key] === out[last][key]) return [out[0], out[last]]
    const other = key === 'y' ? 'x' : 'y'
    const middle = (out[0][other] + out[last][other]) / 2
    const step = (at: number) =>
      key === 'y' ? { x: middle, y: at } : { x: at, y: middle }
    return [out[0], step(out[0][key]), step(out[last][key]), out[last]]
  }
  for (let index = 1; index < last; index++) {
    const key = flat(index - 1) ? 'y' : 'x'
    out[index][key] = out[index - 1][key]
    if (flat(index) !== flat(index - 1)) break
  }
  for (let index = last - 1; index > 0; index--) {
    const key = flat(index) ? 'y' : 'x'
    out[index][key] = out[index + 1][key]
    if (flat(index - 1) !== flat(index)) break
  }
  return out
}

/**
 * Copies an ELK result back: card and Sub Flow positions snapped to the
 * board grid, the size of each Sub Flow that holds cards rounded up to the
 * grid, and a route for each laid-out edge, moved with its snapped cards.
 * Edges ELK did not route lose any old route.
 */
export function applyElkLayout(
  flow: V2Flow,
  laid: ElkNode,
  grid = FLOW_GRID,
): V2Flow {
  const placed = new Map<
    string,
    { shape: ElkNode; position: Point; shift: Point }
  >()
  const visit = (node: ElkNode, raw: Point, snapped: Point) => {
    for (const child of node.children ?? []) {
      const local = round({ x: child.x ?? 0, y: child.y ?? 0 })
      const position = snapPoint(local, grid)
      const rawAbsolute = { x: raw.x + local.x, y: raw.y + local.y }
      const absolute = { x: snapped.x + position.x, y: snapped.y + position.y }
      placed.set(child.id, {
        shape: child,
        position,
        shift: {
          x: absolute.x - rawAbsolute.x,
          y: absolute.y - rawAbsolute.y,
        },
      })
      visit(child, rawAbsolute, absolute)
    }
  }
  visit(laid, { x: 0, y: 0 }, { x: 0, y: 0 })

  const routes = new Map<string, Point[]>()
  const still = { x: 0, y: 0 }
  for (const edge of laid.edges ?? []) {
    const section = edge.sections?.[0]
    if (!section) continue
    const points = [
      section.startPoint,
      ...(section.bendPoints ?? []),
      section.endPoint,
    ]
      .map(round)
      .filter(
        (point, index, all) => !index || !samePoint(point, all[index - 1]),
      )
    if (points.length < 2) continue
    const [from] = edge.sources
    const [to] = edge.targets
    const card = (port: string) => placed.get(port.split('::')[0])?.shift
    routes.set(
      edge.id,
      shiftRoute(points, card(from) ?? still, card(to) ?? still)
        .map(round)
        .filter(
          (point, index, all) => !index || !samePoint(point, all[index - 1]),
        ),
    )
  }

  // Cards may move up to half a cell when snapped; the extra half cell keeps
  // them inside their Sub Flow.
  const fit = (size: number) => Math.ceil((size + grid / 2) / grid) * grid
  return {
    nodes: flow.nodes.map((node) => {
      const place = placed.get(node.id)
      if (!place) return node
      const { shape, position } = place
      if (node.type === 'group' && shape.children?.length)
        return {
          ...node,
          position,
          width: fit(shape.width ?? node.width),
          height: fit(shape.height ?? node.height),
        }
      return { ...node, position }
    }),
    edges: flow.edges.map((edge) => {
      const route = routes.get(edge.id)
      if (route && route.length >= 2) return { ...edge, route }
      const { route: _route, ...rest } = edge
      void _route
      return rest
    }),
  }
}

/** Lays out the board with ELK. ELK loads only when the author asks. */
export async function elkLayoutFlow(
  flow: V2Flow,
  events: Pick<V2Event, 'id' | 'selection' | 'choices'>[],
  options: {
    direction?: LayoutDirection
    sizes?: Record<string, CardMeasure>
  } = {},
): Promise<V2Flow> {
  const { default: ELK } = await import('elkjs/lib/elk.bundled.js')
  const laid = await new ELK().layout(elkGraph(flow, events, options))
  return applyElkLayout(flow, laid)
}
