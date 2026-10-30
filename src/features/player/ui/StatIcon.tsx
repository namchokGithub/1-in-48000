import type { V2Stats } from '../../../content/v2/schema'
import debt from '../assets/status/debt.png'
import health from '../assets/status/health.png'
import lucky from '../assets/status/lucky.png'
import money from '../assets/status/money.png'
import relationships from '../assets/status/relationships.png'
import stress from '../assets/status/stress.png'
import study from '../assets/status/study.png'

const icons: Record<keyof V2Stats, string> = {
  study,
  money,
  health,
  stress,
  relationships,
  debt,
  lucky,
}

export function StatIcon({ stat }: { stat: keyof V2Stats }) {
  return (
    <img
      className="player-stat-icon"
      src={icons[stat]}
      alt=""
      width="16"
      height="16"
      aria-hidden="true"
    />
  )
}
