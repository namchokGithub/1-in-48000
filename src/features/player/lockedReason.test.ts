import { describe, expect, it } from 'vitest'
import { lockedReason } from './lockedReason'

const catalogs = {
  faculties: [{ id: 'science', name: 'วิทยาศาสตร์', supportsSixYear: false }],
  majors: [
    {
      id: 'biology',
      facultyId: 'science',
      name: 'ชีววิทยา',
      programYears: 4 as const,
    },
  ],
  electives: [{ id: 'music', name: 'ดนตรี', effects: [] }],
}

describe('locked choice reason', () => {
  it('explains stat, year, and program conditions', () => {
    expect(
      lockedReason(
        [
          { type: 'stat', stat: 'money', operator: 'gte', value: 500 },
          { type: 'stat', stat: 'stress', operator: 'lte', value: 40 },
          { type: 'year', operator: 'gte', value: 2 },
          { type: 'faculty', facultyId: 'science' },
          { type: 'major', majorId: 'biology' },
          { type: 'elective', electiveId: 'music' },
        ],
        catalogs,
      ),
    ).toBe(
      'ต้องมีเงินอย่างน้อย 500 ฿ · ต้องมีความเครียดไม่เกิน 40 · ต้องอยู่ปี 2 ขึ้นไป · เฉพาะคณะวิทยาศาสตร์ · เฉพาะสาขาชีววิทยา · ต้องเรียนวิชาเสรีดนตรี',
    )
  })

  it('keeps flag and past-event conditions secret and says it once', () => {
    expect(
      lockedReason(
        [
          { type: 'flag', flagId: 'met_mali', value: true },
          { type: 'pastEvent', eventId: 'club_fair', visited: true },
          { type: 'year', operator: 'lte', value: 3 },
        ],
        catalogs,
      ),
    ).toBe('ยังไม่เข้าเงื่อนไข · ต้องอยู่ปี 3 หรือต่ำกว่า')
  })
})
