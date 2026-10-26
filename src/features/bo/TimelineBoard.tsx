import { useState, type DragEvent } from 'react'
import type { Event, GameTime } from '../../content/schema'

const periods: { id: GameTime['period']; label: string }[] = [
  { id: 'term1', label: 'เทอม 1' },
  { id: 'break', label: 'พักเทอม' },
  { id: 'term2', label: 'เทอม 2' },
  { id: 'summer', label: 'ภาคฤดูร้อน' },
]

export function TimelineBoard({
  events,
  onSelect,
  onMove,
}: {
  events: Event[]
  onSelect: (index: number) => void
  onMove: (id: string, time: GameTime, index: number) => void
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)

  function drop(event: DragEvent, time: GameTime, index: number) {
    event.preventDefault()
    event.stopPropagation()
    const id = event.dataTransfer.getData('text/plain')
    if (events.some((entry) => entry.id === id)) onMove(id, time, index)
    setDraggingId(null)
  }

  return (
    <section className="panel bo-timeline" aria-label="Timeline เหตุการณ์">
      <div className="bo-section-heading">
        <div>
          <p className="eyebrow">ปี 1–4</p>
          <h2 className="text-2xl font-extrabold">Timeline</h2>
        </div>
        <p className="muted max-w-xl text-sm">
          ลากการ์ดไปก่อนเหตุการณ์อื่นหรือวางท้ายช่วงเวลา คลิกการ์ดเพื่อแก้ไข;
          บนมือถือใช้ปี/ช่วงเวลาและปุ่มขึ้น–ลงในฟอร์ม
        </p>
      </div>
      {[1, 2, 3, 4].map((year) => (
        <section
          key={year}
          className="bo-timeline-year"
          aria-label={`ปี ${year}`}
        >
          <h3>ปี {year}</h3>
          <div className="bo-timeline-periods">
            {periods.map(({ id: period, label }) => {
              const time: GameTime = { year, period }
              const slot = events.filter(
                (entry) =>
                  entry.time.year === year && entry.time.period === period,
              )
              return (
                <section
                  key={period}
                  className="bo-timeline-slot"
                  aria-label={`ปี ${year} ${label}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => drop(event, time, slot.length)}
                >
                  <div className="bo-timeline-slot-heading">
                    <h4>{label}</h4>
                    <span>{slot.length}</span>
                  </div>
                  {slot.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      draggable
                      className="bo-timeline-card"
                      data-dragging={draggingId === item.id}
                      onClick={() => onSelect(events.indexOf(item))}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', item.id)
                        setDraggingId(item.id)
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => drop(event, time, index)}
                    >
                      <strong>{item.title}</strong>
                      <small>
                        {item.id} · {item.kind}
                      </small>
                    </button>
                  ))}
                  {!slot.length && (
                    <p className="bo-timeline-empty">วางเหตุการณ์ที่นี่</p>
                  )}
                </section>
              )
            })}
          </div>
        </section>
      ))}
    </section>
  )
}
