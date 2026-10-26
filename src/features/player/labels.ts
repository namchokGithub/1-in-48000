import type { GameTime } from '../../content/schema'

const periodLabels: Record<GameTime['period'], string> = {
  term1: 'เทอม 1',
  break: 'ปิดเทอม',
  term2: 'เทอม 2',
  summer: 'ภาคฤดูร้อน',
}

export function formatGameTime(time: GameTime): string {
  return `ปี ${time.year} · ${periodLabels[time.period]}`
}
