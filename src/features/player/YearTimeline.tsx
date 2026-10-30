import { useEffect, useRef } from 'react'

type IconKind = 'book' | 'people' | 'compass' | 'cap' | 'calendar'

const firstYears: { label: string; icon: IconKind }[] = [
  { label: 'Freshman', icon: 'book' },
  { label: 'Sophomore', icon: 'people' },
  { label: 'Junior', icon: 'compass' },
  { label: 'Senior', icon: 'cap' },
]

function YearIcon({ kind }: { kind: IconKind }) {
  return (
    <svg
      aria-hidden="true"
      className="year-stepper-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'book' && (
        <>
          <path d="M12 5.5c-2.1-1.5-4.5-2-8-1.5v14c3.5-.5 5.9 0 8 1.5 2.1-1.5 4.5-2 8-1.5V4c-3.5-.5-5.9 0-8 1.5Z" />
          <path d="M12 5.5v14" />
        </>
      )}
      {kind === 'people' && (
        <>
          <circle cx="9" cy="8" r="2.5" />
          <path d="M3.5 19v-1.5a5.5 5.5 0 0 1 11 0V19H3.5Z" />
          <path d="M16.5 5.8a2.5 2.5 0 0 1 0 4.4M17 12.4a5.5 5.5 0 0 1 3.5 5.1V19h-3" />
        </>
      )}
      {kind === 'compass' && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m15.7 8.3-2.1 5.3-5.3 2.1 2.1-5.3 5.3-2.1Z" />
        </>
      )}
      {kind === 'cap' && (
        <>
          <path d="m2.5 9 9.5-4 9.5 4-9.5 4Z" />
          <path d="M6.5 11v5c3.5 2.5 7.5 2.5 11 0v-5M21.5 9v7" />
        </>
      )}
      {kind === 'calendar' && (
        <>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M7.5 3.5v3M16.5 3.5v3M3.5 10h17M8 14h3M14 14h2" />
        </>
      )}
    </svg>
  )
}

export function YearTimeline({ currentYear }: { currentYear: number }) {
  const targetYear = currentYear <= 4 ? 4 : currentYear <= 6 ? 6 : 8
  const viewportRef = useRef<HTMLOListElement>(null)
  const currentRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    const viewport = viewportRef.current
    const current = currentRef.current
    if (!viewport || !current) return
    viewport.scrollLeft = Math.max(
      0,
      current.offsetLeft - (viewport.clientWidth - current.clientWidth) / 2,
    )
  }, [currentYear, targetYear])

  return (
    <section className="year-timeline" aria-label="เส้นทางการศึกษา">
      <div className="year-timeline-heading">
        <strong>เส้นทางมหาวิทยาลัย</strong>
        <span className="muted">เป้าหมายปี {targetYear}</span>
      </div>
      <ol className="year-stepper" ref={viewportRef}>
        {Array.from({ length: targetYear }, (_, index) => index + 1).map(
          (year) => {
            const earlyYear = firstYears[year - 1]
            return (
              <li
                key={year}
                ref={year === currentYear ? currentRef : undefined}
                aria-current={year === currentYear ? 'step' : undefined}
                className="year-stepper-item"
              >
                <span
                  className="year-stepper-card"
                  data-state={
                    year === currentYear
                      ? 'current'
                      : year < currentYear
                        ? 'complete'
                        : 'future'
                  }
                >
                  <YearIcon kind={earlyYear?.icon ?? 'calendar'} />
                  <span className="year-stepper-label">
                    {earlyYear?.label ?? `ปี ${year}`}
                  </span>
                  {earlyYear && (
                    <span className="year-stepper-sub">ปี {year}</span>
                  )}
                </span>
              </li>
            )
          },
        )}
      </ol>
    </section>
  )
}
