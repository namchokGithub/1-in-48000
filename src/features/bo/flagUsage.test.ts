import { describe, expect, it } from 'vitest'
import { flagUsage } from './flagUsage'
import type { V2Content } from '../../content/v2/schema'

const content: Pick<V2Content, 'events' | 'electives' | 'flow'> = {
  events: [
    {
      id: 'club_fair',
      kind: 'main',
      time: { year: 1, period: 'term1' },
      title: 'งานชมรม',
      conditions: [{ type: 'flag', flagId: 'met_mali', value: true }],
      lines: [{ text: 'ข้อความ' }],
      choices: [
        {
          id: 'join',
          text: 'สมัครชมรม',
          conditions: [{ type: 'flag', flagId: 'has_time', value: true }],
          effects: [
            { type: 'setFlag', flagId: 'joined_club', value: true },
            { type: 'setFlag', flagId: 'joined_club', value: true },
            {
              type: 'schedule',
              trigger: { type: 'afterEvent', eventId: 'exam' },
              effect: { type: 'setFlag', flagId: 'club_award', value: true },
            },
            {
              type: 'chance',
              successPercent: 50,
              displayMode: 'statsOnly',
              successEffects: [
                { type: 'setFlag', flagId: 'met_mali', value: true },
              ],
              failureEffects: [],
            },
          ],
        },
      ],
    },
  ],
  electives: [
    {
      id: 'music',
      name: 'ดนตรี',
      effects: [{ type: 'setFlag', flagId: 'has_time', value: false }],
    },
  ],
  flow: {
    nodes: [
      {
        id: 'check_club',
        type: 'condition',
        position: { x: 0, y: 0 },
        join: 'and',
        conditions: [{ type: 'flag', flagId: 'joined_club', value: true }],
      },
    ],
    edges: [
      {
        id: 'edge_1',
        from: 'check_club',
        port: 'pass',
        to: 'club_fair',
        condition: { type: 'flag', flagId: 'lost_wallet', value: true },
      },
    ],
  },
}

const event = { section: 'events', index: 0, id: 'club_fair' } as const
const eventLabel = 'เหตุการณ์ “งานชมรม” (club_fair)'

describe('flag usage', () => {
  it('lists every flag with where it is set and where it is checked', () => {
    expect(flagUsage(content)).toEqual([
      {
        id: 'club_award',
        sets: [
          {
            ...event,
            label: eventLabel,
            field: 'ตัวเลือก “สมัครชมรม”',
          },
        ],
        checks: [],
      },
      {
        id: 'has_time',
        sets: [
          {
            section: 'electives',
            index: 0,
            id: 'music',
            label: 'วิชาเสรี “ดนตรี” (music)',
            field: 'ผลของวิชา',
          },
        ],
        checks: [
          {
            ...event,
            label: eventLabel,
            field: 'เงื่อนไขตัวเลือก “สมัครชมรม”',
          },
        ],
      },
      {
        id: 'joined_club',
        sets: [
          {
            ...event,
            label: eventLabel,
            field: 'ตัวเลือก “สมัครชมรม”',
          },
        ],
        checks: [
          {
            section: 'flow',
            label: 'Flow เรื่อง',
            field: 'การ์ด Condition check_club',
          },
        ],
      },
      {
        id: 'lost_wallet',
        sets: [],
        checks: [
          {
            section: 'flow',
            label: 'Flow เรื่อง',
            field: 'เส้น check_club → club_fair',
          },
        ],
      },
      {
        id: 'met_mali',
        sets: [
          {
            ...event,
            label: eventLabel,
            field: 'ตัวเลือก “สมัครชมรม”',
          },
        ],
        checks: [{ ...event, label: eventLabel, field: 'เงื่อนไขเหตุการณ์' }],
      },
    ])
  })
})
