import type { V2Event } from '../../content/v2/schema'

type GameTime = V2Event['time']

export const periodLabels: Record<GameTime['period'], string> = {
  term1: 'เทอม 1',
  break: 'ปิดเทอม',
  term2: 'เทอม 2',
  summer: 'ภาคฤดูร้อน',
}

export function formatGameTime(time: GameTime): string {
  return `ปี ${time.year} · ${periodLabels[time.period]}`
}
