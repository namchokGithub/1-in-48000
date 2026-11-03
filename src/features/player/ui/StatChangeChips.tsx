import type { StatChange } from '../../../engine/v2/statChanges'
import { statLabels } from '../choicePreview'
import { StatIcon } from './StatIcon'

const number = new Intl.NumberFormat('th-TH')
const signed = (amount: number) =>
  `${amount > 0 ? '+' : ''}${number.format(amount)}`

// The stat changes of one decision, or a muted note when it changed nothing.
export function StatChangeChips({ changes }: { changes: StatChange[] }) {
  if (!changes.length)
    return <small className="muted">ไม่มีผลต่อค่าสถานะ</small>
  return (
    <ul className="player-stat-chips" aria-label="ค่าสถานะที่เปลี่ยน">
      {changes.map(({ stat, amount }) => (
        <li key={stat} data-direction={amount > 0 ? 'up' : 'down'}>
          <StatIcon stat={stat} />
          <span className="sr-only">{statLabels[stat]}</span>
          <span className="tabular-nums">{signed(amount)}</span>
        </li>
      ))}
    </ul>
  )
}
