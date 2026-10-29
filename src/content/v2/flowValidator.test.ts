import { describe, expect, it } from 'vitest'
import liveEvents from '../../../public/content-v2/events.json'
import liveFlow from '../../../public/content-v2/flow.json'
import names from '../../../public/content-v2/names.json'
import sample from './sample-content.json'
import sampleFlow from './sample-flow.json'
import { validateV2Flow } from './flowValidator'
import {
  v2ContentSchema,
  v2EventSchema,
  v2FlowSchema,
  type V2Flow,
} from './schema'

const events = sample.events.map((event) => v2EventSchema.parse(event))
const flow = v2FlowSchema.parse(sampleFlow)
const at = { x: 0, y: 0 }

function report(change: (copy: V2Flow) => void) {
  const copy = structuredClone(flow)
  change(copy)
  return validateV2Flow(copy, events)
}

const messages = (issues: { message: string }[]) =>
  issues.map((issue) => issue.message)

describe('V4 flow validator', () => {
  it('accepts the sample and live flows without errors', () => {
    expect(validateV2Flow(flow, events)).toEqual({ errors: [], warnings: [] })
    const live = validateV2Flow(
      v2FlowSchema.parse(liveFlow),
      liveEvents.map((event) => v2EventSchema.parse(event)),
    )
    expect(live).toEqual({ errors: [], warnings: [] })
  })

  it('reports unconnected choices and selection events', () => {
    const result = report((copy) => {
      copy.edges = copy.edges.filter(
        (edge) => edge.id !== 'e_kyos' && edge.id !== 'e_borrow',
      )
    })
    expect(messages(result.errors)).toEqual([
      'Choice apply_kyos has no edge: n_student_loan',
      'Event has no edge: n_borrow_from_friend',
    ])
  })

  it('reports Condition nodes without pass or fail edges', () => {
    const result = report((copy) => {
      copy.edges = copy.edges.filter((edge) => edge.id !== 'e_money_fail')
    })
    expect(messages(result.errors)).toEqual([
      'Condition fail has no edge: has_money',
    ])
  })

  it('reports Random nodes without after or fallback edges', () => {
    const result = report((copy) => {
      copy.edges = copy.edges.filter(
        (edge) => edge.id !== 'e_daily_fallback' && edge.id !== 'e_daily_after',
      )
    })
    expect(messages(result.errors)).toEqual([
      'Random after has no edge: daily_life',
      'Random fallback has no edge: daily_life',
    ])
  })

  it('reports a Next Period node without edges and warns about half review pairs', () => {
    const empty = report((copy) => {
      copy.edges = copy.edges.filter((edge) => edge.from !== 'to_year_3')
    })
    expect(messages(empty.errors)).toEqual([
      'Next Period has no edge: to_year_3',
    ])
    const half = report((copy) => {
      copy.edges = copy.edges.filter((edge) => edge.id !== 'e_extend')
    })
    expect(half.errors).toEqual([])
    expect(messages(half.warnings)).toContain(
      'Next Period needs both graduate and extend edges: review',
    )
  })

  it('warns when every edge from a port is conditional', () => {
    const result = report((copy) => {
      copy.edges = copy.edges.filter((edge) => edge.id !== 'e_kro_fallback')
    })
    expect(result.errors).toEqual([])
    expect(messages(result.warnings)).toEqual([
      'Choice apply_kro may stop when no edge condition holds: n_student_loan',
    ])
  })

  it('warns about nodes that cannot be reached from Start', () => {
    const result = report((copy) => {
      copy.nodes.push({
        id: 'island',
        type: 'ending',
        endingId: 'study_complete',
        position: at,
      })
    })
    expect(messages(result.warnings)).toEqual([
      'Unreachable from Start: island',
    ])
  })

  it('warns about loops with no exit unless time moves inside them', () => {
    const trapped = report((copy) => {
      copy.edges = copy.edges.map((edge) =>
        edge.id === 'e_borrow' ? { ...edge, to: 'has_money' } : edge,
      )
      copy.edges = copy.edges.filter((edge) => edge.id !== 'e_money_pass')
      copy.edges.push({
        id: 'e_money_pass_loop',
        from: 'has_money',
        port: 'pass',
        to: 'n_borrow_from_friend',
      })
    })
    expect(messages(trapped.warnings)).toContain(
      'Loop may never exit: has_money → n_borrow_from_friend',
    )
    const timed = validateV2Flow(flow, events)
    expect(messages(timed.warnings).some((m) => m.startsWith('Loop'))).toBe(
      false,
    )
  })

  it('makes content invalid when the flow has errors but not warnings', () => {
    const content = { ...sample, names, flow: sampleFlow }
    expect(v2ContentSchema.safeParse(content).success).toBe(true)
    expect(
      v2ContentSchema.safeParse({
        ...content,
        flow: {
          ...sampleFlow,
          edges: sampleFlow.edges.filter((edge) => edge.id !== 'e_kyos'),
        },
      }).success,
    ).toBe(false)
    expect(
      v2ContentSchema.safeParse({
        ...content,
        flow: {
          ...sampleFlow,
          nodes: [
            ...sampleFlow.nodes,
            {
              id: 'island',
              type: 'ending',
              endingId: 'study_complete',
              position: at,
            },
          ],
        },
      }).success,
    ).toBe(true)
  })
})
