import type { Stats } from '../../content/schema'

export const statOptions: { id: keyof Stats; label: string }[] = [
  { id: 'study', label: 'การเรียน' },
  { id: 'money', label: 'เงิน' },
  { id: 'health', label: 'สุขภาพ' },
  { id: 'stress', label: 'ความเครียด' },
  { id: 'relationships', label: 'ความสัมพันธ์' },
]
