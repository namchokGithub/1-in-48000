import { formatStatChange } from './choicePreview'
import { StatIcon } from './ui/StatIcon'
import type { YearSummary } from './yearSummary'

const baht = (value: number) =>
  `${new Intl.NumberFormat('th-TH').format(value)} ฿`

export function YearSummaryView({
  summary,
  onNext,
}: {
  summary: YearSummary
  onNext: () => void
}) {
  return (
    <section
      className="panel player-year-summary p-6 sm:p-10"
      aria-labelledby="year-summary-title"
    >
      <p className="eyebrow">จบปี {summary.year}</p>
      <h1 id="year-summary-title" className="mt-2 text-3xl font-extrabold">
        สรุปปี {summary.year}
      </h1>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="font-bold">ค่าสถานะที่เปลี่ยน</h2>
          {summary.changes.length ? (
            <ul className="player-year-list mt-2">
              {summary.changes.map(({ stat, amount }) => (
                <li key={stat} data-direction={amount > 0 ? 'up' : 'down'}>
                  <StatIcon stat={stat} />
                  {formatStatChange(stat, amount)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted mt-2">ไม่มีค่าสถานะที่เปลี่ยน</p>
          )}
          <h2 className="mt-5 font-bold">เงินเข้าออก</h2>
          <ul className="player-year-list mt-2 tabular-nums">
            <li>เงินเข้า {baht(summary.moneyIn)}</li>
            <li>เงินออก {baht(summary.moneyOut)}</li>
          </ul>
        </div>
        <div>
          <h2 className="font-bold">
            เหตุการณ์ที่ผ่าน ({summary.events.length})
          </h2>
          {summary.events.length ? (
            <ol className="player-year-events mt-2">
              {summary.events.map((title, index) => (
                <li key={index}>{title}</li>
              ))}
            </ol>
          ) : (
            <p className="muted mt-2">ยังไม่มีเหตุการณ์ในปีนี้</p>
          )}
        </div>
      </div>
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          className="button button-primary"
          autoFocus
          onClick={onNext}
        >
          ต่อไป
        </button>
      </div>
    </section>
  )
}
