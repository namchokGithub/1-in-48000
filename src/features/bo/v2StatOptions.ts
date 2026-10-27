import type { V2Stats } from '../../content/v2/schema'

export const v2StatOptions: { id: keyof V2Stats; label: string }[] = [
  { id: 'study', label: 'การเรียน' },
  { id: 'money', label: 'เงิน' },
  { id: 'health', label: 'สุขภาพ' },
  { id: 'stress', label: 'ความเครียด' },
  { id: 'relationships', label: 'ความสัมพันธ์' },
  { id: 'debt', label: 'หนี้' },
  { id: 'lucky', label: 'โชค' },
]

export function statLabel(id: keyof V2Stats) {
  return v2StatOptions.find((stat) => stat.id === id)?.label ?? id
}
