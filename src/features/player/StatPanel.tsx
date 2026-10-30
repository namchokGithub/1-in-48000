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
  loanRatePercent,
}: {
  stats: V2Stats
  identity?: { name: string; portraitPath?: string; program?: string }
  // Shown with negative money, which is an automatic loan.
  loanRatePercent?: number
}) {
  const number = new Intl.NumberFormat('th-TH')
  return (
    <section className="panel player-stat-panel" aria-label="ค่าสถานะ">
      {identity && (
        <div className="player-stat-identity">
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
            {identity.program && (
              <p className="muted mt-0.5 text-xs leading-snug">
                {identity.program}
              </p>
            )}
          </div>
        </div>
      )}
      <p className="eyebrow">สถานะตอนนี้</p>
      <div className="player-stat-list">
        {statLabels
          .filter(({ key }) => key !== 'money' && key !== 'debt')
          .map(({ key, label }) => (
            <div key={key}>
              <div className="player-stat-row">
                <span className="player-stat-name">
                  <StatIcon stat={key} />
                  {label}
                </span>
                <span className="font-bold tabular-nums">{stats[key]}</span>
              </div>
              {stats[key] >= 0 && (
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
      <div className="player-stat-money">
        {statLabels
          .filter(({ key }) => key === 'money' || key === 'debt')
          .map(({ key, label }) => (
            <div key={key} className="player-stat-row">
              <span className="player-stat-name">
                <StatIcon stat={key} />
                {label}
              </span>
              <span
                className="font-bold tabular-nums"
                data-negative={stats[key] < 0 || undefined}
              >
                {number.format(stats[key])} ฿
              </span>
            </div>
          ))}
        {stats.money < 0 && loanRatePercent !== undefined && (
          <p className="player-stat-loan">
            เงินติดลบคือยอดกู้อัตโนมัติ {number.format(-stats.money)} ฿ ดอกเบี้ย{' '}
            {number.format(loanRatePercent)}% ต่อปี
            คิดทุกครั้งที่ขึ้นช่วงเวลาใหม่ หนี้ทั้งหมดหักคืนตอนจบ
          </p>
        )}
      </div>
    </section>
  )
}
