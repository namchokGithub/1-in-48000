import type { V2Content, V2Event } from '../../content/v2/schema'
import { statLabels } from './choicePreview'

type V2Condition = V2Event['conditions'][number]
type Catalogs = Pick<V2Content, 'faculties' | 'majors' | 'electives'>

const statOperators = {
  eq: 'เท่ากับ',
  gt: 'มากกว่า',
  gte: 'อย่างน้อย',
  lt: 'น้อยกว่า',
  lte: 'ไม่เกิน',
} as const

const number = new Intl.NumberFormat('th-TH')

function reason(condition: V2Condition, catalogs: Catalogs): string {
  switch (condition.type) {
    case 'stat': {
      const unit =
        condition.stat === 'money' || condition.stat === 'debt' ? ' ฿' : ''
      return `ต้องมี${statLabels[condition.stat]}${statOperators[condition.operator]} ${number.format(condition.value)}${unit}`
    }
    case 'year':
      return condition.operator === 'gte'
        ? `ต้องอยู่ปี ${condition.value} ขึ้นไป`
        : condition.operator === 'lte'
          ? `ต้องอยู่ปี ${condition.value} หรือต่ำกว่า`
          : `ต้องอยู่ปี ${condition.value}`
    case 'faculty':
      return `เฉพาะคณะ${catalogs.faculties.find((item) => item.id === condition.facultyId)?.name ?? condition.facultyId}`
    case 'major':
      return `เฉพาะสาขา${catalogs.majors.find((item) => item.id === condition.majorId)?.name ?? condition.majorId}`
    case 'elective':
      return `ต้องเรียนวิชาเสรี${catalogs.electives.find((item) => item.id === condition.electiveId)?.name ?? condition.electiveId}`
    // Flags and past events stay vague so a locked choice does not spoil the story.
    case 'flag':
    case 'pastEvent':
      return 'ยังไม่เข้าเงื่อนไข'
  }
}

export function lockedReason(unmet: V2Condition[], catalogs: Catalogs): string {
  return [
    ...new Set(unmet.map((condition) => reason(condition, catalogs))),
  ].join(' · ')
}
