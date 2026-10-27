export function YearTimeline({ currentYear }: { currentYear: number }) {
  const targetYear = currentYear <= 4 ? 4 : currentYear <= 6 ? 6 : 8

  return (
    <section className="mb-4" aria-label="เส้นทางการศึกษา">
      <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
        <strong>เส้นทางมหาวิทยาลัย</strong>
        <span className="muted">เป้าหมายปี {targetYear}</span>
      </div>
      <ol
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${targetYear}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: targetYear }, (_, index) => index + 1).map(
          (year) => (
            <li
              key={year}
              aria-current={year === currentYear ? 'step' : undefined}
              className={`year-step rounded-lg border px-1 py-2 text-center text-xs font-bold sm:text-sm ${
                year === currentYear
                  ? 'year-step-current'
                  : year < currentYear
                    ? 'year-step-complete'
                    : 'year-step-future'
              }`}
            >
              ปี {year}
            </li>
          ),
        )}
      </ol>
    </section>
  )
}
