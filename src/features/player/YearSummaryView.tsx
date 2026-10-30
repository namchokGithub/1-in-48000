import { useState } from 'react'
import { statLabels } from './choicePreview'
import { StatIcon } from './ui/StatIcon'
import type { YearSummary } from './yearSummary'

const number = new Intl.NumberFormat('th-TH')
const signed = (amount: number) =>
  `${amount > 0 ? '+' : ''}${number.format(amount)}`
const baht = (value: number) => `${number.format(value)} ฿`

// Events shown before "ดูเหตุการณ์ทั้งหมด".
const FIRST_EVENTS = 5

function CapIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m2.5 9 9.5-4 9.5 4-9.5 4Z" />
      <path d="M6.5 11v5c3.5 2.5 7.5 2.5 11 0v-5M21.5 9v7" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="player-stat-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M7.5 3.5v3M16.5 3.5v3M3.5 10h17M9 15l2 2 4-4" />
    </svg>
  )
}

export function YearSummaryView({
  summary,
  onNext,
}: {
  summary: YearSummary
  onNext: () => void
}) {
  const [allEvents, setAllEvents] = useState(false)
  const bars = summary.changes.filter(
    ({ stat }) => stat !== 'money' && stat !== 'debt',
  )
  const largest = Math.max(1, ...bars.map(({ amount }) => Math.abs(amount)))
  const shownEvents = allEvents
    ? summary.events
    : summary.events.slice(0, FIRST_EVENTS)

  return (
    <section
      className="panel player-year-summary"
      aria-labelledby="year-summary-title"
    >
      <header className="player-year-header">
        <div>
          <p className="eyebrow">Chapter complete · Year {summary.year}</p>
          <h1 id="year-summary-title" className="text-2xl font-extrabold">
            หนึ่งปีผ่านไป...
          </h1>
          <p className="muted text-sm">
            บทสรุปเส้นทางมหาวิทยาลัยปีที่ {summary.year}
          </p>
        </div>
        <span className="player-year-badge">
          <CapIcon />
        </span>
      </header>

      <div className="player-year-columns">
        <div className="player-year-main">
          <div className="player-year-cards">
            {summary.highlights.map(({ stat, amount }) => (
              <div key={stat} className="player-year-card">
                <StatIcon stat={stat} />
                <strong className="tabular-nums">{signed(amount)}</strong>
                <span className="muted">{statLabels[stat]}</span>
              </div>
            ))}
            <div
              className="player-year-card"
              style={{
                gridColumn: `span ${3 - summary.highlights.length}`,
              }}
            >
              <CalendarIcon />
              <strong className="tabular-nums">{summary.events.length}</strong>
              <span className="muted">เหตุการณ์</span>
            </div>
          </div>

          <section className="player-year-box" aria-labelledby="year-changes">
            <div className="player-year-box-heading">
              <h2 id="year-changes" className="font-bold">
                การเปลี่ยนแปลงค่าสถานะ
              </h2>
              <span className="muted text-xs">ตลอดปี {summary.year}</span>
            </div>
            {bars.length ? (
              <>
                <ul className="player-year-bars">
                  {bars.map(({ stat, amount }) => (
                    <li key={stat}>
                      <span className="player-stat-name">
                        <StatIcon stat={stat} />
                        {statLabels[stat]}
                      </span>
                      <span className="player-year-track" aria-hidden="true">
                        <span
                          style={{
                            width: `${(Math.abs(amount) / largest) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="tabular-nums">{signed(amount)}</span>
                    </li>
                  ))}
                </ul>
                <p className="muted mt-2 text-xs">
                  แถบเปรียบเทียบขนาดการเปลี่ยนแปลง ไม่ใช่ค่าสถานะปัจจุบัน
                </p>
              </>
            ) : (
              <p className="muted text-sm">ปีนี้ค่าสถานะไม่เปลี่ยน</p>
            )}
          </section>

          <div className="player-year-money">
            <div className="player-year-card">
              <span className="muted">เงินเข้า</span>
              <strong className="tabular-nums">{baht(summary.moneyIn)}</strong>
            </div>
            <div className="player-year-card">
              <span className="muted">เงินออก</span>
              <strong className="tabular-nums">{baht(summary.moneyOut)}</strong>
            </div>
          </div>
        </div>

        <section className="player-year-box" aria-labelledby="year-memories">
          <div className="player-year-box-heading">
            <div>
              <h2 id="year-memories" className="font-bold">
                ความทรงจำปี {summary.year}
              </h2>
              <p className="muted text-xs">
                เหตุการณ์ที่ผ่านมา {summary.events.length} เหตุการณ์
              </p>
            </div>
          </div>
          {summary.events.length ? (
            <ol id="year-memory-list" className="player-year-timeline">
              {shownEvents.map((title, index) => (
                <li key={index}>
                  <span>{title}</span>
                  <small className="muted">เหตุการณ์ที่ {index + 1}</small>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted text-sm">ยังไม่มีเหตุการณ์ในปีนี้</p>
          )}
          {summary.events.length > FIRST_EVENTS && (
            <button
              type="button"
              className="button button-secondary w-full"
              aria-expanded={allEvents}
              aria-controls="year-memory-list"
              onClick={() => setAllEvents((open) => !open)}
            >
              {allEvents
                ? 'ย่อรายการ'
                : `ดูเหตุการณ์ทั้งหมด (${summary.events.length})`}
            </button>
          )}
        </section>
      </div>

      <div className="flex justify-end">
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
