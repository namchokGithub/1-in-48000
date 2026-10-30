import type { V2Event } from '../../content/v2/schema'

export const periodLabels: Record<V2Event['time']['period'], string> = {
  term1: 'เทอม 1',
  break: 'ปิดเทอม',
  term2: 'เทอม 2',
  summer: 'ซัมเมอร์',
}
