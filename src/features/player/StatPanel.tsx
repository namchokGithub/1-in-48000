import type { V2Stats } from '../../content/v2/schema'
import { StatIcon } from './ui/StatIcon'

// Stats with a 0–100 bar first, then money and debt.
const statLabels: { key: keyof V2Stats; label: string }[] = [
  { key: 'study', label: 'การเรียน' },
  { key: 'health', label: 'สุขภาพ' },
  { key: 'stress', label: 'ความเครียด' },
  { key: 'relationships', label: 'ความสัมพันธ์' },
  { key: 'lucky', label: 'โชค' },
  { key: 'money', label: 'เงิน' },
  { key: 'debt', label: 'หนี้' },
]

export function StatPanel({
  stats,
  identity,
}: {
  stats: V2Stats
  identity?: { name: string; portraitPath?: string }
}) {
  return (
    <section className="panel p-5" aria-label="ค่าสถานะ">
      {identity && (
        <div className="mb-5 flex items-center gap-3 border-b border-[var(--color-line)] pb-5">
          {identity.portraitPath ? (
            <img
              className="player-identity-portrait"
              src={identity.portraitPath}
              alt={`ภาพผู้เล่น ${identity.name}`}
            />
          ) : (
            <span
              className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-2xl"
              aria-hidden="true"
            >
              {identity.name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="eyebrow">นิสิต ม.บารพู</p>
            <p className="truncate text-lg font-bold">{identity.name}</p>
          </div>
        </div>
      )}
      <p className="eyebrow">สถานะตอนนี้</p>
      <div className="mt-5 space-y-4">
        {statLabels.map(({ key, label }) => (
          <div
            key={key}
            className={key === 'money' ? 'player-stat-money' : undefined}
          >
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <StatIcon stat={key} />
                {label}
              </span>
              <span className="font-bold tabular-nums">
                {key === 'money' || key === 'debt'
                  ? `${new Intl.NumberFormat('th-TH').format(stats[key])} ฿`
                  : stats[key]}
              </span>
            </div>
            {key !== 'money' && key !== 'debt' && stats[key] >= 0 && (
              <div
                className="stat-track"
                role="meter"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={stats[key]}
              >
                <div
                  className="stat-fill"
                  style={{ width: `${Math.min(100, stats[key])}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
