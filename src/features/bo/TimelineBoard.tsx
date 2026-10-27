import { useState, type DragEvent } from 'react'
import type { V2Event } from '../../content/v2/schema'
import { BoDropdown } from './Select'
import {
  filterTimelineStories,
  mainEventCount,
  type KindFilter,
} from './timelineFilters'

type TimelineEvent = {
  active?: boolean
  id: string
  title: string
  kind: 'main' | 'conditional' | 'holiday' | 'random'
  time: V2Event['time']
}

type GameTime = V2Event['time']

const periods: { id: GameTime['period']; label: string }[] = [
  { id: 'term1', label: 'เทอม 1' },
  { id: 'break', label: 'พักเทอม' },
  { id: 'term2', label: 'เทอม 2' },
  { id: 'summer', label: 'ภาคฤดูร้อน' },
]

export function TimelineBoard({
  events,
  query,
  onSelect,
  onMove,
  onPreview,
}: {
  events: TimelineEvent[]
  query: string
  onSelect: (index: number) => void
  onMove: (id: string, time: GameTime, index: number) => void
  onPreview: (index: number) => void
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const visible = filterTimelineStories(events, query, kindFilter)

  function drop(event: DragEvent, time: GameTime, index: number) {
    event.preventDefault()
    event.stopPropagation()
    const id = event.dataTransfer.getData('text/plain')
    if (visible.some((entry) => entry.id === id)) onMove(id, time, index)
    setDraggingId(null)
  }

  return (
    <section className="panel bo-timeline" aria-label="Timeline เหตุการณ์">
      <div className="bo-section-heading">
        <div>
          <p className="eyebrow">ปี 1–8</p>
          <h2 className="text-2xl font-extrabold">Timeline</h2>
        </div>
        <p className="muted max-w-xl text-sm">
          ลากการ์ดไปก่อนเหตุการณ์อื่นหรือวางท้ายช่วงเวลา คลิกการ์ดเพื่อแก้ไข;
          บนมือถือใช้ปี/ช่วงเวลาและปุ่มขึ้น–ลงในฟอร์ม
        </p>
      </div>
      <div className="bo-timeline-filters">
        <label className="bo-field">
          <span>ชนิดเหตุการณ์</span>
          <BoDropdown
            value={kindFilter}
            onChange={(event) =>
              setKindFilter(event.target.value as KindFilter)
            }
          >
            <option value="all">ทุกชนิด</option>
            <option value="main">เหตุการณ์หลัก</option>
            <option value="conditional">ตามเงื่อนไข</option>
            <option value="holiday">วันหยุด</option>
            <option value="random">สุ่ม</option>
          </BoDropdown>
        </label>
        <p className="muted text-sm" role="status">
          พบ {visible.length} เหตุการณ์
        </p>
      </div>
      {!visible.length && (
        <p className="muted" role="status">
          ไม่พบเหตุการณ์ที่ตรงกับคำค้นหาหรือตัวกรอง
        </p>
      )}
      {Array.from({ length: 8 }, (_, index) => index + 1).map((year) => (
        <section
          key={year}
          className="bo-timeline-year"
          aria-label={`ปี ${year}`}
        >
          <h3>ปี {year}</h3>
          <div className="bo-timeline-periods">
            {periods.map(({ id: period, label }) => {
              const time: GameTime = { year, period }
              const fullSlot = events.filter(
                (entry) =>
                  entry.time.year === year && entry.time.period === period,
              )
              const slot = visible.filter(
                (entry) =>
                  entry.time.year === year && entry.time.period === period,
              )
              const mainCount = mainEventCount(events, time)
              return (
                <section
                  key={period}
                  className="bo-timeline-slot"
                  aria-label={`ปี ${year} ${label}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => drop(event, time, fullSlot.length)}
                >
                  <div className="bo-timeline-slot-heading">
                    <h4>{label}</h4>
                    <span>{slot.length}</span>
                  </div>
                  {mainCount > 10 && (
                    <p className="bo-timeline-warning" role="status">
                      เหตุการณ์หลัก {mainCount} รายการในช่วงนี้ — ยังเพิ่มได้
                    </p>
                  )}
                  {slot.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      className="bo-timeline-card"
                      data-dragging={draggingId === item.id}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData('text/plain', item.id)
                        setDraggingId(item.id)
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) =>
                        drop(event, time, fullSlot.indexOf(item))
                      }
                    >
                      <button
                        type="button"
                        className="bo-timeline-card-select"
                        onClick={() => onSelect(events.indexOf(item))}
                      >
                        <strong>{item.title}</strong>
                        <small>
                          {item.id} · {item.kind}
                        </small>
                      </button>
                      <button
                        type="button"
                        className="bo-text-button bo-timeline-preview"
                        onClick={() => onPreview(events.indexOf(item))}
                      >
                        ทดลอง
                      </button>
                    </div>
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
