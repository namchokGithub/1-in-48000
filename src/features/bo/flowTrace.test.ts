import { describe, expect, it } from 'vitest'
import names from '../../../public/content-v2/names.json'
import sample from '../../content/v2/sample-content.json'
import sampleFlow from '../../content/v2/sample-flow.json'
import { v2ContentSchema } from '../../content/v2/schema'
import { describeFlowStep, previewErrorMessage, tracedPath } from './flowTrace'

const content = v2ContentSchema.parse({ ...sample, names, flow: sampleFlow })
const money = {
  type: 'stat' as const,
  stat: 'money' as const,
  operator: 'gte' as const,
  value: 100,
}

describe('BO preview trace', () => {
  it('explains skipped and used edges, Condition results, and reviews in Thai', () => {
    expect(
      describeFlowStep(
        {
          type: 'edge',
          from: 'n_student_loan',
          port: 'apply_kro',
          to: 'n_borrow_from_friend',
          edgeId: 'e_kro_fallback',
          checked: [
            {
              edgeId: 'e_kro',
              condition: { type: 'flag', flagId: 'met_mali', value: false },
              passed: false,
            },
            { edgeId: 'e_kro_fallback', passed: true },
          ],
        },
        content,
      ),
    ).toEqual({
      text: 'ทุนเรียนต่อ → เพื่อนช่วยได้ไหม',
      detail:
        'ข้ามเส้น: Flag met_mali = เท็จ ไม่ผ่าน · ใช้เส้นที่ไม่มีเงื่อนไข',
      passed: true,
    })
    expect(
      describeFlowStep(
        {
          type: 'condition',
          nodeId: 'has_money',
          join: 'and',
          results: [{ condition: money, passed: false }],
          passed: false,
        },
        content,
      ),
    ).toMatchObject({
      text: 'Condition has_money: ไม่ผ่าน (ทุกข้อ)',
      detail: '✗ เงิน อย่างน้อย 100',
      passed: false,
    })
    expect(
      describeFlowStep(
        {
          type: 'nextPeriod',
          nodeId: 'review',
          from: { year: 4, period: 'summer' },
          to: { year: 5, period: 'term1' },
          review: 'extend',
          score: 55.5,
        },
        content,
      ),
    ).toMatchObject({
      text: 'ตรวจผลการเรียน ปี 4 · ภาคฤดูร้อน: ไม่ผ่านเกณฑ์ → เรียนต่อ',
      passed: false,
    })
  })

  it('collects the start card and every traced card and edge for highlighting', () => {
    expect(
      tracedPath(
        [
          {
            type: 'edge',
            from: 'n_student_loan',
            port: 'apply_kyos',
            to: 'has_money',
            edgeId: 'e_kyos',
            checked: [{ edgeId: 'e_kyos', passed: true }],
          },
          {
            type: 'condition',
            nodeId: 'has_money',
            join: 'and',
            results: [],
            passed: true,
          },
          { type: 'ending', nodeId: null, endingId: 'dismissal' },
        ],
        'n_student_loan',
      ),
    ).toEqual({
      nodeIds: ['n_student_loan', 'has_money'],
      edgeIds: ['e_kyos'],
    })
  })

  it('turns missing-path errors into Thai guidance', () => {
    expect(
      previewErrorMessage('No path from bo_preview_event (next)', content),
    ).toContain('ยังไม่ได้วางบนกระดาน Flow')
    expect(
      previewErrorMessage('No path from n_student_loan (apply_kro)', content),
    ).toBe(
      'การ์ด “ทุนเรียนต่อ” ยังไม่มีเส้นที่ใช้ได้จากทาง “apply_kro” ลากเส้นหรือเพิ่มเส้นที่ไม่มีเงื่อนไขในแท็บ Flow เรื่อง',
    )
    expect(previewErrorMessage('Other error', content)).toBe('Other error')
  })
})
