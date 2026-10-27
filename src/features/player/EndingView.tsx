import type { V2LifeSummary } from '../../engine/v2/game'
import { StatPanel } from './StatPanel'

type Props = {
  summary: V2LifeSummary
  onHome: () => void
  onRestart: () => void
  onExport?: () => void
  homeLabel?: string
}

export function EndingView({
  summary,
  onHome,
  onRestart,
  onExport,
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
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="button button-primary"
            onClick={onRestart}
          >
            เริ่มชีวิตใหม่
          </button>
          {onExport && (
            <button
              type="button"
              className="button button-secondary"
              onClick={onExport}
            >
              ดาวน์โหลดเซฟ
            </button>
          )}
          <button
            type="button"
            className="button button-secondary"
            onClick={onHome}
          >
            {homeLabel}
          </button>
        </div>
      </section>
      <StatPanel stats={summary.stats} />
    </div>
  )
}
