import { useEffect, useRef } from 'react'
import {
  BookOpen,
  Certificate,
  ClockPlus,
  Compass,
  GraduationCap,
  NotepadText,
  UserCog,
  UserGroup,
  type LucideIcon,
} from 'lucide-react'
import { getV2GoalYear } from '../../engine/v2/game'

const firstYears: { label: string; icon: LucideIcon }[] = [
  { label: 'Freshman', icon: BookOpen },
  { label: 'Sophomore', icon: UserGroup },
  { label: 'Junior', icon: Compass },
  { label: 'Senior', icon: GraduationCap },
  { label: 'Fifth-Year', icon: NotepadText },
  { label: 'Sixth-Year', icon: Certificate },
  { label: 'Extended Year', icon: ClockPlus },
]

export function YearTimeline({
  currentYear,
  programYears,
}: {
  currentYear: number
  programYears: number
}) {
  const targetYear = getV2GoalYear(programYears, currentYear)
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
            const Icon = earlyYear?.icon ?? UserCog
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
                  <Icon aria-hidden="true" className="year-stepper-icon" />
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
