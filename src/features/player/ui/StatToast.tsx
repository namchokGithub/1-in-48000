import { useEffect } from 'react'
import { formatStatChange } from '../choicePreview'
import type { StatChange } from '../statChanges'
import { StatIcon } from './StatIcon'

export function StatToast({
  changes,
  onDone,
}: {
  changes: StatChange[]
  onDone: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 4000)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className="player-toast" role="status">
      <ul>
        {changes.map(({ stat, amount }) => (
          <li key={stat} data-direction={amount > 0 ? 'up' : 'down'}>
            <StatIcon stat={stat} />
            {formatStatChange(stat, amount)}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="player-toast-close"
        aria-label="ปิดการแจ้งเตือน"
        onClick={onDone}
      >
        ×
      </button>
    </div>
  )
}
