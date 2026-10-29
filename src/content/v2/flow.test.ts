import { describe, expect, it } from 'vitest'
import names from '../../../public/content-v2/names.json'
import sample from './sample-content.json'
import sampleFlow from './sample-flow.json'
import { checkV2FlowReferences, v2FlowSchema, type V2Flow } from './flow'
import { v2ContentSchema } from './schema'

const content = v2ContentSchema.parse({ ...sample, names })
const flow = v2FlowSchema.parse(sampleFlow)

function withFlow(change: (flow: V2Flow) => void) {
  const copy = structuredClone(flow)
  change(copy)
  return copy
}

describe('V4 story flow contract', () => {
  it('accepts a sample with every node type and matching content', () => {
    expect(new Set(flow.nodes.map((node) => node.type))).toEqual(
      new Set([
        'start',
        'event',
        'condition',
        'random',
        'nextPeriod',
        'ending',
      ]),
    )
    expect(checkV2FlowReferences(flow, content)).toEqual([])
  })

  it('requires exactly one Start node that no edge enters', () => {
    expect(
      v2FlowSchema.safeParse(
        withFlow((copy) => {
          copy.nodes = copy.nodes.filter((node) => node.type !== 'start')
        }),
      ).success,
    ).toBe(false)
    expect(
      v2FlowSchema.safeParse(
        withFlow((copy) => {
          copy.nodes.push({
            id: 'second_start',
            type: 'start',
            position: { x: 0, y: 0 },
          })
        }),
      ).success,
    ).toBe(false)
    expect(
      v2FlowSchema.safeParse(
        withFlow((copy) => {
          copy.edges[1].to = 'start'
        }),
      ).success,
    ).toBe(false)
  })

  it('rejects duplicate node and edge IDs', () => {
    expect(
      v2FlowSchema.safeParse(
        withFlow((copy) => {
          copy.nodes.push({ ...copy.nodes[1] })
        }),
      ).success,
    ).toBe(false)
    expect(
      v2FlowSchema.safeParse(
        withFlow((copy) => {
          copy.edges.push({ ...copy.edges[0] })
        }),
      ).success,
    ).toBe(false)
  })

  it('rejects edges to unknown nodes and invalid fixed ports', () => {
    expect(
      v2FlowSchema.safeParse(
        withFlow((copy) => {
          copy.edges[0].to = 'missing'
        }),
      ).success,
    ).toBe(false)
    expect(
      v2FlowSchema.safeParse(
        withFlow((copy) => {
          copy.edges.find((edge) => edge.from === 'has_money')!.port = 'after'
        }),
      ).success,
    ).toBe(false)
    expect(
      v2FlowSchema.safeParse(
        withFlow((copy) => {
          copy.edges.push({
            id: 'e_from_ending',
            from: 'end_dismissal',
            port: 'next',
            to: 'review',
          })
        }),
      ).success,
    ).toBe(false)
  })

  it('requires at least one condition on a Condition node and one on an edge', () => {
    expect(
      v2FlowSchema.safeParse(
        withFlow((copy) => {
          const node = copy.nodes.find((item) => item.type === 'condition')!
          if (node.type === 'condition') node.conditions = []
        }),
      ).success,
    ).toBe(false)
    expect(
      v2FlowSchema.safeParse({
        ...sampleFlow,
        edges: [
          {
            ...sampleFlow.edges[0],
            condition: [{ type: 'flag', flagId: 'a', value: true }],
          },
        ],
      }).success,
    ).toBe(false)
  })

  it('reports unknown events, endings, and pools', () => {
    const issues = checkV2FlowReferences(
      withFlow((copy) => {
        copy.nodes.forEach((node) => {
          if (node.type === 'event' && node.eventId === 'student_loan')
            node.eventId = 'missing_event'
          if (node.type === 'ending') node.endingId = 'missing_ending'
          if (node.type === 'random') node.poolId = 'missing_pool'
        })
      }),
      content,
    )
    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        'Unknown event: missing_event',
        'Unknown ending: missing_ending',
        'Unknown pool: missing_pool',
      ]),
    )
  })

  it('places each event once and keeps pool events off the board', () => {
    const twice = checkV2FlowReferences(
      withFlow((copy) => {
        copy.nodes.push({
          id: 'n_student_loan_again',
          type: 'event',
          eventId: 'student_loan',
          position: { x: 0, y: 0 },
        })
      }),
      content,
    )
    expect(twice.map((issue) => issue.message)).toContain(
      'Event placed twice: student_loan',
    )
    const pooled = checkV2FlowReferences(
      withFlow((copy) => {
        copy.nodes.push({
          id: 'n_lottery_ticket',
          type: 'event',
          eventId: 'lottery_ticket',
          position: { x: 0, y: 0 },
        })
      }),
      content,
    )
    expect(pooled.map((issue) => issue.message)).toContain(
      'Pool event cannot be placed on the board: lottery_ticket',
    )
  })

  it('uses choice ports for single-select events and next for selection events', () => {
    const issues = checkV2FlowReferences(
      withFlow((copy) => {
        copy.edges.find((edge) => edge.id === 'e_kyos')!.port = 'next'
        copy.edges.find((edge) => edge.id === 'e_program')!.port =
          'confirm_program'
      }),
      content,
    )
    expect(issues.map((issue) => issue.message).sort()).toEqual([
      'Invalid event port: confirm_program',
      'Invalid event port: next',
    ])
  })

  it('rejects inactive events and pool tags that only inactive events carry', () => {
    const inactive = structuredClone(content)
    inactive.events.find((event) => event.id === 'student_loan')!.active = false
    inactive.events.find((event) => event.id === 'lottery_ticket')!.active =
      false
    expect(
      checkV2FlowReferences(flow, inactive).map((issue) => issue.message),
    ).toEqual(['Inactive event: student_loan', 'Unknown pool: y1_t1_life'])
  })
})
