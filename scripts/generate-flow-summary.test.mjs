import { describe, expect, it } from 'vitest'
import {
  outputPathFromArgs,
  renderFlowSummary,
} from './generate-flow-summary.mjs'

describe('renderFlowSummary', () => {
  it('renders event choices, effects, conditional edges, and random pools as a text tree', () => {
    const output = renderFlowSummary({
      events: [
        {
          id: 'orientation',
          title: 'วันปฐมนิเทศ',
          choices: [
            {
              id: 'join',
              text: 'เข้าไปทำความรู้จักเพื่อนใหม่',
              effects: [{ type: 'setFlag', flagId: 'met_mali', value: true }],
            },
            { id: 'explore', text: 'เดินสำรวจมหาวิทยาลัยก่อน', effects: [] },
          ],
        },
        { id: 'first_class', title: 'คาบเรียนแรก', choices: [] },
        {
          id: 'club_invitation',
          title: 'ข้อความจากชมรม',
          choices: [],
        },
        {
          id: 'quiet_courtyard',
          title: 'ลานเงียบหลังสอบ',
          pool: 'term_one_life',
          choices: [],
        },
      ],
      flow: {
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'orientation', type: 'event', eventId: 'orientation' },
          { id: 'first_class', type: 'event', eventId: 'first_class' },
          {
            id: 'club_invitation',
            type: 'event',
            eventId: 'club_invitation',
          },
          { id: 'random_life', type: 'random', poolId: 'term_one_life' },
        ],
        edges: [
          {
            id: 'start_orientation',
            from: 'start',
            port: 'next',
            to: 'orientation',
          },
          {
            id: 'join_class',
            from: 'orientation',
            port: 'join',
            to: 'first_class',
          },
          {
            id: 'explore_club',
            from: 'orientation',
            port: 'explore',
            to: 'club_invitation',
            condition: { type: 'flag', flagId: 'met_mali', value: true },
          },
          {
            id: 'club_random',
            from: 'club_invitation',
            port: 'next',
            to: 'random_life',
          },
        ],
      },
    })

    expect(output).toContain('วันปฐมนิเทศ')
    expect(output).toContain('├─ เข้าไปทำความรู้จักเพื่อนใหม่')
    expect(output).toContain('ตั้ง `met_mali` -> คาบเรียนแรก')
    expect(output).toContain('└─ เดินสำรวจมหาวิทยาลัยก่อน')
    expect(output).toContain('หาก `met_mali` เป็น true -> ข้อความจากชมรม')
    expect(output).toContain('สุ่มจาก pool `term_one_life`: ลานเงียบหลังสอบ')
  })
})

describe('outputPathFromArgs', () => {
  it('accepts pnpm’s -- separator before the requested output path', () => {
    expect(outputPathFromArgs(['--', 'docs/FLOW_20261010-120500.md'])).toBe(
      'docs/FLOW_20261010-120500.md',
    )
  })
})

describe('renderFlowSummary selection events', () => {
  it('follows the next port after a program-selection event', () => {
    const output = renderFlowSummary({
      events: [
        {
          id: 'program',
          title: 'เลือกคณะและสาขา',
          selection: { type: 'program' },
          choices: [{ id: 'confirm_program', text: 'ไปต่อ', effects: [] }],
        },
        { id: 'orientation', title: 'วันปฐมนิเทศ', choices: [] },
      ],
      flow: {
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'program', type: 'event', eventId: 'program' },
          { id: 'orientation', type: 'event', eventId: 'orientation' },
        ],
        edges: [
          { id: 'start_program', from: 'start', port: 'next', to: 'program' },
          {
            id: 'program_orientation',
            from: 'program',
            port: 'next',
            to: 'orientation',
          },
        ],
      },
    })

    expect(output).toContain('ไปต่อ')
    expect(output).toContain('-> วันปฐมนิเทศ')
  })
})

describe('renderFlowSummary merged paths', () => {
  it('references a node already expanded instead of expanding a shared path again', () => {
    const output = renderFlowSummary({
      events: [
        {
          id: 'start_event',
          title: 'จุดเริ่มต้น',
          choices: [
            { id: 'left', text: 'ทางซ้าย', effects: [] },
            { id: 'right', text: 'ทางขวา', effects: [] },
          ],
        },
        {
          id: 'shared',
          title: 'จุดรวม',
          choices: [{ id: 'continue', text: 'ไปต่อ', effects: [] }],
        },
        { id: 'end', title: 'ปลายทาง', choices: [] },
      ],
      flow: {
        nodes: [
          { id: 'start', type: 'start' },
          { id: 'start_event', type: 'event', eventId: 'start_event' },
          { id: 'shared', type: 'event', eventId: 'shared' },
          { id: 'end', type: 'event', eventId: 'end' },
        ],
        edges: [
          { id: 'start_event', from: 'start', port: 'next', to: 'start_event' },
          {
            id: 'left_shared',
            from: 'start_event',
            port: 'left',
            to: 'shared',
          },
          {
            id: 'right_shared',
            from: 'start_event',
            port: 'right',
            to: 'shared',
          },
          { id: 'shared_end', from: 'shared', port: 'continue', to: 'end' },
        ],
      },
    })

    expect(output).toContain('-> จุดรวม (ดูเส้นทางก่อนหน้า)')
    expect(output.match(/-> ปลายทาง/g)).toHaveLength(1)
  })
})
