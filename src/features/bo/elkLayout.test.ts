import { describe, expect, it } from 'vitest'
import { names, sample } from '../../content/v2/testSample'
import sampleFlow from '../../content/v2/sample-flow.json'
import {
  v2ContentSchema,
  v2FlowEdgeSchema,
  type V2Flow,
} from '../../content/v2/schema'
import { applyElkLayout, elkGraph, elkLayoutFlow, FLOW_GRID } from './elkLayout'
import { addFlowNode, flowPorts, reparentFlowNode } from './flowEditing'

const content = v2ContentSchema.parse({ ...sample, names, flow: sampleFlow })
const flow = content.flow

/** Sample flow with two cards inside a Sub Flow and one empty Sub Flow. */
function withGroups(): V2Flow {
  let next = addFlowNode(flow, content, 'group', { x: 3000, y: 3000 })
  next = reparentFlowNode(next, 'n_student_loan', 'group')
  next = reparentFlowNode(next, 'has_money', 'group')
  return addFlowNode(next, content, 'group', { x: 0, y: 0 })
}

type Box = { x: number; y: number; width: number; height: number }

function boxes(laid: V2Flow, sizes: Record<string, Box> = {}) {
  const result = new Map<string, Box>()
  for (const node of laid.nodes) {
    const parent = laid.nodes.find((item) => item.id === node.parentId)
    const offset = parent?.type === 'group' ? parent.position : { x: 0, y: 0 }
    const size =
      node.type === 'group'
        ? { width: node.width, height: node.height }
        : (sizes[node.id] ?? { width: 240, height: 120 })
    result.set(node.id, {
      x: node.position.x + offset.x,
      y: node.position.y + offset.y,
      ...size,
    })
  }
  return result
}

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height

describe('BO flow board ELK layout', () => {
  it('builds ports in choice order, in-ports, and Sub Flows as compound nodes', () => {
    const grouped = withGroups()
    const graph = elkGraph(grouped, content.events, {
      sizes: {
        n_student_loan: {
          width: 300,
          height: 200,
          handles: { in: { x: -4, y: 90 }, apply_kyos: { x: 308, y: 120 } },
        },
      },
    })
    const top = graph.children!.map((node) => node.id)
    expect(top).not.toContain('n_student_loan')
    expect(top).toContain('group_2')

    const group = graph.children!.find((node) => node.id === 'group')!
    expect(group.children!.map((node) => node.id)).toEqual([
      'n_student_loan',
      'has_money',
    ])
    const card = group.children![0]
    expect(card).toMatchObject({ width: 300, height: 200 })
    const choices = flowPorts(
      grouped.nodes.find((node) => node.id === 'n_student_loan')!,
      content.events,
    )
    expect(card.ports!.map((port) => port.id)).toEqual([
      'n_student_loan::#in',
      ...choices.map((port) => `n_student_loan::${port.id}`),
    ])
    expect(card.ports![0]).toMatchObject({ x: -4, y: 90 })
    expect(card.ports![1]).toMatchObject({ x: 308, y: 120 })

    const empty = graph.children!.find((node) => node.id === 'group_2')!
    expect(empty).toMatchObject({ width: 560, height: 420 })
    expect(empty.children).toBeUndefined()

    const start = graph.children!.find((node) => node.id === 'start')!
    expect(start.ports!.map((port) => port.id)).toEqual(['start::next'])

    const vertical = elkGraph(grouped, content.events, {
      direction: 'vertical',
    })
    const loan = vertical
      .children!.find((node) => node.id === 'group')!
      .children!.find((node) => node.id === 'n_student_loan')!
    expect(loan.ports![0]).toMatchObject({ x: 120, y: 0 })
    expect(loan.ports![1].y).toBe(120)
  })

  it('leaves out edges from a missing port', () => {
    const broken = {
      ...flow,
      edges: [
        ...flow.edges,
        { id: 'e_gone', from: 'start', port: 'gone', to: 'review' },
      ],
    }
    const graph = elkGraph(broken, content.events)
    expect(graph.edges!.map((edge) => edge.id)).not.toContain('e_gone')
    expect(graph.edges).toHaveLength(flow.edges.length)
  })

  it.each(['horizontal', 'vertical'] as const)(
    'lays out %s without overlaps and routes every edge between its ports',
    async (direction) => {
      const grouped = withGroups()
      const laid = await elkLayoutFlow(grouped, content.events, { direction })
      const placed = boxes(laid)

      const topLevel = laid.nodes.filter((node) => !node.parentId)
      for (const [index, a] of topLevel.entries())
        for (const b of topLevel.slice(index + 1))
          expect(
            overlaps(placed.get(a.id)!, placed.get(b.id)!),
            `${a.id} overlaps ${b.id}`,
          ).toBe(false)

      for (const node of laid.nodes) {
        expect(node.position.x % FLOW_GRID, node.id).toBe(0)
        expect(node.position.y % FLOW_GRID, node.id).toBe(0)
        // An empty Sub Flow keeps the size the author gave it.
        if (node.type === 'group' && node.id !== 'group_2') {
          expect(node.width % FLOW_GRID, node.id).toBe(0)
          expect(node.height % FLOW_GRID, node.id).toBe(0)
        }
      }

      const group = laid.nodes.find((node) => node.id === 'group')!
      expect(group.type === 'group' && group.width).toBeGreaterThan(240)
      for (const child of laid.nodes.filter((node) => node.parentId)) {
        const box = placed.get(child.id)!
        const frame = placed.get('group')!
        expect(box.x).toBeGreaterThanOrEqual(frame.x)
        expect(box.y).toBeGreaterThanOrEqual(frame.y)
        expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width)
        expect(box.y + box.height).toBeLessThanOrEqual(frame.y + frame.height)
      }

      for (const edge of laid.edges) {
        const route = edge.route!
        expect(route.length, edge.id).toBeGreaterThanOrEqual(2)
        const target = placed.get(edge.to)!
        const end = route.at(-1)!
        expect(end).toEqual(
          direction === 'vertical'
            ? { x: target.x + target.width / 2, y: target.y }
            : { x: target.x, y: target.y + target.height / 2 },
        )
        const source = placed.get(edge.from)!
        expect(route[0][direction === 'vertical' ? 'y' : 'x']).toBe(
          direction === 'vertical'
            ? source.y + source.height
            : source.x + source.width,
        )
        route.slice(1).forEach((point, index) => {
          const previous = route[index]
          expect(
            point.x === previous.x || point.y === previous.y,
            `${edge.id} bends at an angle`,
          ).toBe(true)
        })
      }

      expect(
        await elkLayoutFlow(grouped, content.events, { direction }),
      ).toEqual(laid)
    },
  )

  it('moves route ends with their snapped cards and keeps every segment straight', () => {
    const two = {
      nodes: [
        { id: 'start', type: 'start' as const, position: { x: 0, y: 0 } },
        { id: 'next', type: 'nextPeriod' as const, position: { x: 0, y: 0 } },
      ],
      edges: [{ id: 'e', from: 'start', port: 'next', to: 'next' }],
    }
    const laidOut = (
      bendPoints: { x: number; y: number }[],
      endY: number,
      nextY = endY - 60,
      nextHeight = 120,
    ) =>
      applyElkLayout(two, {
        id: '#root',
        children: [
          { id: 'start', x: 10, y: 5, width: 240, height: 120 },
          { id: 'next', x: 340, y: nextY, width: 240, height: nextHeight },
        ],
        edges: [
          {
            id: 'e',
            sources: ['start::next'],
            targets: ['next::#in'],
            sections: [
              {
                id: 's',
                startPoint: { x: 250, y: 65 },
                endPoint: { x: 340, y: endY },
                bendPoints,
              },
            ],
          },
        ],
      })

    const straight = laidOut([], 65)
    expect(straight.nodes.map((node) => node.position)).toEqual([
      { x: 0, y: 0 },
      { x: 336, y: 0 },
    ])
    expect(straight.edges[0].route).toEqual([
      { x: 240, y: 60 },
      { x: 336, y: 60 },
    ])

    const stepped = laidOut([], 65, 15, 100)
    expect(stepped.nodes[1].position).toEqual({ x: 336, y: 24 })
    expect(stepped.edges[0].route).toEqual([
      { x: 240, y: 60 },
      { x: 288, y: 60 },
      { x: 288, y: 74 },
      { x: 336, y: 74 },
    ])

    const bent = laidOut(
      [
        { x: 300, y: 65 },
        { x: 300, y: 200 },
      ],
      200,
    )
    expect(bent.nodes[1].position).toEqual({ x: 336, y: 144 })
    expect(bent.edges[0].route).toEqual([
      { x: 240, y: 60 },
      { x: 300, y: 60 },
      { x: 300, y: 204 },
      { x: 336, y: 204 },
    ])
  })

  it('drops old routes of edges the layout did not route', () => {
    const routed = {
      ...flow,
      edges: flow.edges.map((edge) => ({
        ...edge,
        route: [
          { x: 0, y: 0 },
          { x: 5, y: 0 },
        ],
      })),
    }
    const laid = applyElkLayout(routed, { id: '#root', children: [] })
    expect(laid.edges.every((edge) => !('route' in edge))).toBe(true)
    expect(laid.nodes).toEqual(flow.nodes)
  })

  it('accepts an edge route of two or more points only', () => {
    const edge = { id: 'e', from: 'a', port: 'next', to: 'b' }
    const point = { x: 1, y: 2 }
    expect(v2FlowEdgeSchema.safeParse(edge).success).toBe(true)
    expect(
      v2FlowEdgeSchema.safeParse({ ...edge, route: [point, point] }).success,
    ).toBe(true)
    expect(
      v2FlowEdgeSchema.safeParse({ ...edge, route: [point] }).success,
    ).toBe(false)
  })
})
