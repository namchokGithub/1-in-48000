import { describe, expect, it } from 'vitest'
import { names, sample } from '../../content/v2/testSample'
import sampleFlow from '../../content/v2/sample-flow.json'
import { v2ContentSchema } from '../../content/v2/schema'
import {
  addFlowNode,
  connectPorts,
  edgeStyle,
  finishReconnectEdge,
  filesToSave,
  flowPorts,
  focusedFlow,
  issuesByNode,
  moveEdgeOrder,
  moveFlowNodes,
  placeEvent,
  reparentFlowNode,
  reconnectEdge,
  removeEventFromFlow,
  removeFlowEdges,
  removeFlowNodes,
  syncEventChange,
} from './flowEditing'

const content = v2ContentSchema.parse({ ...sample, names, flow: sampleFlow })
const flow = content.flow
const at = { x: 10, y: 20 }

describe('BO flow board editing', () => {
  it('lists choice ports for single-select events and fixed ports for other cards', () => {
    const node = (id: string) => flow.nodes.find((item) => item.id === id)!
    expect(flowPorts(node('n_student_loan'), content.events)).toEqual([
      { id: 'apply_kyos', label: 'สมัคร กยศ.' },
      { id: 'apply_kro', label: 'สมัคร กรอ.' },
    ])
    expect(
      flowPorts(node('n_borrow_from_friend'), content.events).map(
        (port) => port.id,
      ),
    ).toEqual(['next'])
    expect(
      flowPorts(node('review'), content.events).map((port) => port.id),
    ).toEqual(['next', 'graduate', 'extend'])
    expect(flowPorts(node('end_dismissal'), content.events)).toEqual([])
  })

  it('places a library event once and refuses pool, inactive, or unknown events', () => {
    const draft = structuredClone(content)
    draft.events.push({ ...draft.events[0], id: 'new_story' })
    const placed = placeEvent(flow, draft.events, 'new_story', at)
    expect(typeof placed).toBe('object')
    if (typeof placed === 'string') return
    expect(placed.nodes.at(-1)).toEqual({
      id: 'n_new_story',
      type: 'event',
      eventId: 'new_story',
      position: at,
    })
    expect(placeEvent(placed, draft.events, 'new_story', at)).toBe(
      'เหตุการณ์นี้อยู่บนกระดานแล้ว',
    )
    expect(typeof placeEvent(flow, draft.events, 'lottery_ticket', at)).toBe(
      'string',
    )
    draft.events[0].active = false
    expect(typeof placeEvent(flow, draft.events, draft.events[0].id, at)).toBe(
      'string',
    )
    expect(typeof placeEvent(flow, draft.events, 'missing', at)).toBe('string')
  })

  it('adds visual groups and keeps children when a group is deleted', () => {
    const grouped = addFlowNode(flow, content, 'group', { x: 100, y: 200 })
    const group = grouped.nodes.at(-1)!
    expect(group).toMatchObject({
      id: 'group',
      type: 'group',
      title: 'กลุ่มย่อย',
      color: 'green',
      width: 560,
      height: 420,
    })

    const childId = 'n_student_loan'
    const reparented = reparentFlowNode(grouped, childId, group.id)
    expect(reparented.nodes.find((node) => node.id === childId)).toMatchObject({
      parentId: group.id,
      position: { x: 380, y: -200 },
    })
    const ungrouped = reparentFlowNode(reparented, childId)
    expect(ungrouped.nodes.find((node) => node.id === childId)).toMatchObject({
      position: { x: 480, y: 0 },
    })
    expect(
      ungrouped.nodes.find((node) => node.id === childId),
    ).not.toHaveProperty('parentId')
    const removed = removeFlowNodes(reparented, [group.id])
    expect(removed.nodes.find((node) => node.id === childId)).toMatchObject({
      position: { x: 480, y: 0 },
    })
    expect(
      removed.nodes.find((node) => node.id === childId),
    ).not.toHaveProperty('parentId')
  })

  it('adds Condition, Random, Next Period, and Ending cards with unique IDs', () => {
    let next = addFlowNode(flow, content, 'condition', at)
    next = addFlowNode(next, content, 'condition', at)
    next = addFlowNode(next, content, 'random', at)
    next = addFlowNode(next, content, 'nextPeriod', at)
    next = addFlowNode(next, content, 'ending', at)
    expect(next.nodes.slice(-5)).toEqual([
      {
        id: 'condition',
        type: 'condition',
        join: 'and',
        conditions: [{ type: 'flag', flagId: 'new_flag', value: true }],
        position: at,
      },
      {
        id: 'condition_2',
        type: 'condition',
        join: 'and',
        conditions: [{ type: 'flag', flagId: 'new_flag', value: true }],
        position: at,
      },
      { id: 'random', type: 'random', poolId: 'y1_t1_life', position: at },
      { id: 'nextPeriod', type: 'nextPeriod', position: at },
      {
        id: 'ending',
        type: 'ending',
        endingId: 'study_complete',
        position: at,
      },
    ])
  })

  it('connects a port once and never into Start or out of an Ending', () => {
    const once = connectPorts(flow, 'n_student_loan', 'apply_kyos', 'review')
    expect(once.edges.at(-1)).toEqual({
      id: 'e_n_student_loan_apply_kyos',
      from: 'n_student_loan',
      port: 'apply_kyos',
      to: 'review',
    })
    expect(connectPorts(once, 'n_student_loan', 'apply_kyos', 'review')).toBe(
      once,
    )
    expect(connectPorts(flow, 'review', 'next', 'start')).toBe(flow)
    expect(connectPorts(flow, 'end_dismissal', 'next', 'review')).toBe(flow)
  })

  it('removes cards with their edges but keeps Start', () => {
    const next = removeFlowNodes(flow, ['has_money', 'start'])
    expect(next.nodes.some((node) => node.id === 'has_money')).toBe(false)
    expect(next.nodes.some((node) => node.id === 'start')).toBe(true)
    expect(
      next.edges.some(
        (edge) => edge.from === 'has_money' || edge.to === 'has_money',
      ),
    ).toBe(false)
    expect(removeFlowEdges(flow, ['e_kyos']).edges).toHaveLength(
      flow.edges.length - 1,
    )
  })

  it('removes an edge when reconnecting it ends on the pane', () => {
    const edgeId = flow.edges[0].id
    expect(finishReconnectEdge(flow, edgeId, false).edges).toHaveLength(
      flow.edges.length - 1,
    )
    expect(finishReconnectEdge(flow, edgeId, true)).toBe(flow)
  })

  it('moves cards to rounded positions and drops routes that no longer fit', () => {
    const moved = moveFlowNodes(flow, { review: { x: 10.6, y: -3.2 } })
    expect(moved.nodes.find((node) => node.id === 'review')?.position).toEqual({
      x: 11,
      y: -3,
    })

    const route = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ]
    const grouped = reparentFlowNode(
      addFlowNode(flow, content, 'group', { x: -500, y: -500 }),
      'n_student_loan',
      'group',
    )
    const routed = {
      ...grouped,
      edges: grouped.edges.map((edge) => ({ ...edge, route })),
    }
    const touches = (edge: (typeof flow.edges)[number], id: string) =>
      edge.from === id || edge.to === id
    const group = routed.nodes.find((node) => node.id === 'group')!
    expect(moveFlowNodes(routed, { group: group.position })).toBe(routed)

    const afterGroupMove = moveFlowNodes(routed, { group: { x: 0, y: 0 } })
    for (const edge of afterGroupMove.edges)
      expect(edge.route).toEqual(
        touches(edge, 'n_student_loan') ? undefined : route,
      )

    const reconnected = reconnectEdge(
      routed,
      routed.edges[0].id,
      routed.edges[0].from,
      routed.edges[0].port,
      'review',
    )
    expect(reconnected.edges[0]).not.toHaveProperty('route')
    expect(reconnected.edges[1].route).toEqual(route)
  })

  it('groups node and edge issues by card', () => {
    const grouped = issuesByNode(
      flow,
      [{ path: ['nodes', 2, 'eventId'], message: 'broken' }],
      [{ path: ['edges', 0, 'port'], message: 'check' }],
    )
    expect(grouped.get('n_student_loan')).toEqual({
      errors: ['broken'],
      warnings: [],
    })
    expect(grouped.get('start')).toEqual({ errors: [], warnings: ['check'] })
  })

  it('focuses a card on its incoming and outgoing paths up to the chosen depth', () => {
    const sorted = (focus: { nodeIds: string[]; edgeIds: string[] }) => ({
      nodeIds: [...focus.nodeIds].sort(),
      edgeIds: [...focus.edgeIds].sort(),
    })
    expect(
      sorted(focusedFlow(flow, { kind: 'node', id: 'has_money' }, 1)),
    ).toEqual({
      nodeIds: [
        'daily_life',
        'has_money',
        'n_borrow_from_friend',
        'n_student_loan',
      ],
      edgeIds: ['e_kro', 'e_kyos', 'e_money_fail', 'e_money_pass'],
    })
    expect(
      sorted(focusedFlow(flow, { kind: 'node', id: 'has_money' }, 2)),
    ).toEqual({
      nodeIds: [
        'daily_life',
        'has_money',
        'n_borrow_from_friend',
        'n_choose_program',
        'n_student_loan',
        'to_year_3',
      ],
      edgeIds: [
        'e_borrow',
        'e_daily_after',
        'e_daily_fallback',
        'e_kro',
        'e_kro_fallback',
        'e_kyos',
        'e_money_fail',
        'e_money_pass',
        'e_program',
      ],
    })
    expect(
      sorted(focusedFlow(flow, { kind: 'edge', id: 'e_borrow' }, 1)),
    ).toEqual({
      nodeIds: ['daily_life', 'n_borrow_from_friend'],
      edgeIds: ['e_borrow'],
    })
  })

  it('reconnects an edge in place and keeps its id, condition, and order', () => {
    const index = flow.edges.findIndex((edge) => edge.id === 'e_kro')
    const moved = reconnectEdge(
      flow,
      'e_kro',
      'n_student_loan',
      'apply_kro',
      'daily_life',
    )
    expect(moved.edges[index]).toEqual({
      ...flow.edges[index],
      to: 'daily_life',
    })
    expect(moved.edges).toHaveLength(flow.edges.length)
    expect(
      reconnectEdge(flow, 'e_kyos', 'has_money', 'fail', 'daily_life').edges[
        flow.edges.findIndex((edge) => edge.id === 'e_kyos')
      ],
    ).toMatchObject({ from: 'has_money', port: 'fail', to: 'daily_life' })
    expect(
      reconnectEdge(flow, 'e_kro', 'n_student_loan', 'apply_kro', 'start'),
    ).toBe(flow)
    expect(
      reconnectEdge(flow, 'e_kro', 'end_dismissal', 'next', 'review'),
    ).toBe(flow)
    expect(
      reconnectEdge(
        flow,
        'e_kro_fallback',
        'n_student_loan',
        'apply_kyos',
        'has_money',
      ),
    ).toBe(flow)
  })

  it('groups edges by meaning for board styling', () => {
    const style = (id: string) =>
      edgeStyle(
        flow,
        flow.edges.find((edge) => edge.id === id)!,
      )
    expect(style('e_kyos')).toBe('normal')
    expect(style('e_kro')).toBe('normal')
    expect(style('e_kro_fallback')).toBe('fallback')
    expect(style('e_daily_fallback')).toBe('fallback')
    expect(style('e_daily_after')).toBe('normal')
    expect(style('e_money_pass')).toBe('pass')
    expect(style('e_money_fail')).toBe('fail')
    expect(style('e_review_next')).toBe('normal')
    expect(style('e_graduate')).toBe('key')
    expect(style('e_extend')).toBe('key')
  })

  it('reorders edges only among edges of the same port', () => {
    const ids = (next: typeof flow) =>
      next.edges
        .filter((edge) => edge.from === 'n_student_loan')
        .map((edge) => edge.id)
    expect(ids(flow)).toEqual(['e_kyos', 'e_kro', 'e_kro_fallback'])
    const swapped = moveEdgeOrder(flow, 'e_kro_fallback', -1)
    expect(ids(swapped)).toEqual(['e_kyos', 'e_kro_fallback', 'e_kro'])
    expect(moveEdgeOrder(flow, 'e_kro', -1)).toBe(flow)
    expect(moveEdgeOrder(flow, 'e_kyos', 1)).toBe(flow)
  })

  it('keeps the board in step with renamed events and choices', () => {
    const before = content.events.find((event) => event.id === 'student_loan')!
    const after = {
      ...before,
      id: 'loan_choice',
      choices: [
        { ...before.choices[0], id: 'apply_student_loan' },
        before.choices[1],
      ],
    }
    const next = syncEventChange(flow, before, after)
    expect(
      next.nodes.find((node) => node.id === 'n_student_loan'),
    ).toMatchObject({ eventId: 'loan_choice' })
    expect(next.edges.find((edge) => edge.id === 'e_kyos')?.port).toBe(
      'apply_student_loan',
    )
    expect(next.edges.find((edge) => edge.id === 'e_kro')?.port).toBe(
      'apply_kro',
    )
    expect(syncEventChange(flow, before, { ...before, title: 'x' })).toBe(flow)
  })

  it('removes a deleted event card and its edges from the board', () => {
    const next = removeEventFromFlow(flow, 'student_loan')
    expect(next.nodes.some((node) => node.id === 'n_student_loan')).toBe(false)
    expect(
      next.edges.some(
        (edge) =>
          edge.from === 'n_student_loan' || edge.to === 'n_student_loan',
      ),
    ).toBe(false)
  })

  it('saves events before the flow from the Flow tab and only dirty files', () => {
    expect(filesToSave('flow', { events: true, flow: true })).toEqual([
      'events',
      'flow',
    ])
    expect(filesToSave('flow', { events: false, flow: true })).toEqual(['flow'])
    expect(filesToSave('flow', { events: true, flow: false })).toEqual([
      'events',
    ])
    expect(filesToSave('endings', { events: true, flow: true })).toEqual([
      'endings',
    ])
  })
})
