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

const GROUP_PADDING = '[top=64,left=32,bottom=32,right=32]'

const rootOptions = (direction: LayoutDirection): LayoutOptions => ({
  'elk.algorithm': 'layered',
  'elk.direction': direction === 'vertical' ? 'DOWN' : 'RIGHT',
  'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.spacing.nodeNode': '60',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.edgeEdge': '16',
  'elk.spacing.edgeNode': '24',
  'elk.layered.spacing.edgeNodeBetweenLayers': '24',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '16',
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

/**
 * Copies an ELK result back: card and Sub Flow positions, the size of each
 * Sub Flow that holds cards, and a route for each laid-out edge. Edges ELK
 * did not route lose any old route.
 */
export function applyElkLayout(flow: V2Flow, laid: ElkNode): V2Flow {
  const shapes = new Map<string, ElkNode>()
  const visit = (node: ElkNode) => {
    for (const child of node.children ?? []) {
      shapes.set(child.id, child)
      visit(child)
    }
  }
  visit(laid)
  const routes = new Map<string, Point[]>()
  for (const edge of laid.edges ?? []) {
    const section = edge.sections?.[0]
    if (section)
      routes.set(
        edge.id,
        [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]
          .map(round)
          .filter(
            (point, index, all) =>
              index === 0 ||
              point.x !== all[index - 1].x ||
              point.y !== all[index - 1].y,
          ),
      )
  }
  return {
    nodes: flow.nodes.map((node) => {
      const shape = shapes.get(node.id)
      if (!shape) return node
      const position = round({ x: shape.x ?? 0, y: shape.y ?? 0 })
      if (node.type === 'group' && shape.children?.length)
        return {
          ...node,
          position,
          width: Math.round(shape.width ?? node.width),
          height: Math.round(shape.height ?? node.height),
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
