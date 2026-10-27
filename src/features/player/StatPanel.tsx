import type { V2Stats } from '../../content/v2/schema'

const statLabels: { key: keyof V2Stats; label: string }[] = [
  { key: 'study', label: 'การเรียน' },
  { key: 'money', label: 'เงิน' },
  { key: 'health', label: 'สุขภาพ' },
  { key: 'stress', label: 'ความเครียด' },
  { key: 'relationships', label: 'ความสัมพันธ์' },
  { key: 'debt', label: 'หนี้' },
  { key: 'lucky', label: 'โชค' },
]

export function StatPanel({ stats }: { stats: V2Stats }) {
  return (
    <section className="panel p-5" aria-label="ค่าสถานะ">
      <p className="eyebrow">สถานะตอนนี้</p>
      <div className="mt-5 space-y-4">
        {statLabels.map(({ key, label }) => (
          <div key={key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">{label}</span>
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
