import type { Stats } from '../../content/schema'

const statLabels: { key: keyof Stats; label: string }[] = [
  { key: 'study', label: 'การเรียน' },
  { key: 'money', label: 'เงิน' },
  { key: 'health', label: 'สุขภาพ' },
  { key: 'stress', label: 'ความเครียด' },
  { key: 'relationships', label: 'ความสัมพันธ์' },
]

export function StatPanel({ stats }: { stats: Stats }) {
  return (
    <section className="panel p-5" aria-label="ค่าสถานะ">
      <p className="eyebrow">สถานะตอนนี้</p>
      <div className="mt-5 space-y-4">
        {statLabels.map(({ key, label }) => (
          <div key={key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold">{label}</span>
              <span className="font-bold tabular-nums">
                {key === 'money'
                  ? `${new Intl.NumberFormat('th-TH').format(stats.money)} ฿`
                  : stats[key]}
              </span>
            </div>
            {key !== 'money' && (
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
                  style={{ width: `${stats[key]}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
