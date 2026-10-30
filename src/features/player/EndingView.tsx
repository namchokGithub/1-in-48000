import type { V2LifeSummary } from '../../engine/v2/game'
import { StatPanel } from './StatPanel'
import { periodLabels } from './labels'

type Props = {
  summary: V2LifeSummary
  portraitPath?: string
  program?: string
  onRestart: () => void
}

type Entry = V2LifeSummary['timeline'][number]

function groupByYear(timeline: Entry[]) {
  const groups: { year: number | null; entries: Entry[] }[] = []
  for (const entry of timeline) {
    const year = entry.time?.year ?? null
    const last = groups.at(-1)
    if (last && last.year === year) last.entries.push(entry)
    else groups.push({ year, entries: [entry] })
  }
  return groups
}

export function EndingView({
  summary,
  portraitPath,
  program,
  onRestart,
}: Props) {
  const years = groupByYear(summary.timeline)
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="grid min-w-0 gap-5">
        <section className="panel p-6 sm:p-10">
          <p className="eyebrow">บทสรุปชีวิตที่ ม.บารพู</p>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">
            {summary.title}
          </h1>
          <p className="muted mt-2">เรื่องของ {summary.playerName}</p>
          <p className="mt-8 max-w-2xl text-xl leading-relaxed">
            {summary.summary}
          </p>
          <div className="mt-8 grid gap-3 border-t border-[var(--color-line)] pt-6 sm:grid-cols-2">
            <p>
              <strong>{summary.eventsVisited}</strong> เหตุการณ์ที่ผ่าน
            </p>
            <p>
              <strong>{summary.choicesMade}</strong> การตัดสินใจ
            </p>
          </div>
          <div className="mt-8 flex justify-end">
            <button
              type="button"
              className="button button-primary"
              onClick={onRestart}
            >
              เริ่มชีวิตใหม่
            </button>
          </div>
        </section>
        <section className="panel p-6 sm:p-10" aria-label="ไทม์ไลน์ชีวิต">
          <h2 className="text-xl font-extrabold">เส้นทางชีวิตของคุณ</h2>
          <p className="muted mt-1 text-sm">
            เหตุการณ์และทางเลือกที่พามาถึงวันนี้ กดที่ปีเพื่อดูหรือซ่อน
          </p>
          <div className="mt-5 grid gap-3">
            {years.map((group, groupIndex) => (
              <details
                key={`${group.year}-${groupIndex}`}
                className="player-timeline-year"
                open={groupIndex === 0}
              >
                <summary>
                  <span className="font-bold">
                    {group.year === null
                      ? 'ช่วงเวลาก่อนหน้า'
                      : `ปี ${group.year}`}
                  </span>
                  <span className="muted text-sm">
                    {group.entries.length} เหตุการณ์
                  </span>
                </summary>
                <ol className="player-timeline">
                  {group.entries.map((entry, index) => (
                    <li key={`${entry.eventId}-${index}`}>
                      {entry.time && (
                        <p className="muted text-xs">
                          {periodLabels[entry.time.period]}
                        </p>
                      )}
                      <h3 className="font-bold">{entry.eventTitle}</h3>
                      <p className="muted text-sm">
                        คุณเลือก: {entry.choiceText}
                      </p>
                      {entry.chanceOutcomes.map((outcome, outcomeIndex) => (
                        <p
                          key={outcomeIndex}
                          className="mt-1 text-xs font-semibold"
                        >
                          โอกาส{' '}
                          {outcome.effectivePercent.toLocaleString('th-TH', {
                            maximumFractionDigits: 4,
                          })}
                          % · {outcome.succeeded ? 'สำเร็จ' : 'ไม่สำเร็จ'}
                        </p>
                      ))}
                    </li>
                  ))}
                </ol>
              </details>
            ))}
          </div>
        </section>
      </div>
      <StatPanel
        stats={summary.stats}
        identity={{ name: summary.playerName, portraitPath, program }}
      />
    </div>
  )
}
