import type { V2LifeSummary } from '../../engine/v2/game'
import { StatPanel } from './StatPanel'
import { formatGameTime } from './labels'

type Props = {
  summary: V2LifeSummary
  portraitPath?: string
  onHome: () => void
  onRestart: () => void
  homeLabel?: string
}

export function EndingView({
  summary,
  portraitPath,
  onHome,
  onRestart,
  homeLabel = 'หน้าแรก',
}: Props) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
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
        <section
          className="mt-8 border-t border-[var(--color-line)] pt-6"
          aria-label="ไทม์ไลน์ชีวิต"
        >
          <h2 className="text-xl font-extrabold">เส้นทางชีวิตของคุณ</h2>
          <p className="muted mt-1 text-sm">
            เหตุการณ์และทางเลือกที่พามาถึงวันนี้
          </p>
          <ol className="mt-5 space-y-4 border-l-2 border-[var(--color-line)] pl-5">
            {summary.timeline.map((entry, index) => (
              <li key={`${entry.eventId}-${index}`} className="relative">
                <span
                  className="absolute -left-[1.7rem] top-2 size-3 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-primary)]"
                  aria-hidden="true"
                />
                <p className="eyebrow">
                  {entry.time ? formatGameTime(entry.time) : 'ช่วงเวลาก่อนหน้า'}
                </p>
                <h3 className="mt-1 font-bold">{entry.eventTitle}</h3>
                <p className="muted text-sm">คุณเลือก: {entry.choiceText}</p>
                {entry.chanceOutcomes.map((outcome, outcomeIndex) => (
                  <p key={outcomeIndex} className="mt-1 text-xs font-semibold">
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
        </section>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="button button-primary"
            onClick={onRestart}
          >
            เริ่มชีวิตใหม่
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={onHome}
          >
            {homeLabel}
          </button>
        </div>
      </section>
      <StatPanel
        stats={summary.stats}
        identity={{ name: summary.playerName, portraitPath }}
      />
    </div>
  )
}
