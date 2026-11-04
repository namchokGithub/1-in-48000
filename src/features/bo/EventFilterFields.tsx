import type { V2Event } from '../../content/v2/schema'
import { periodLabels } from './periodLabels'
import { BoDropdown } from './Select'
import {
  ALL,
  NO_POOL,
  allEvents,
  eventPools,
  isFiltering,
  type EventFilter,
  type EventStatusFilter,
} from './timelineFilters'

const kindLabels: Record<V2Event['kind'], string> = {
  main: 'หลัก',
  conditional: 'มีเงื่อนไข',
  holiday: 'วันหยุด',
  random: 'สุ่ม',
}
const statusLabels: Record<EventStatusFilter, string> = {
  all: 'ทุกสถานะ',
  active: 'ใช้งาน',
  inactive: 'ปิดใช้',
  unused: 'ยังไม่ได้ใช้ใน Flow',
}

/** Pool, kind, year, period, and status filters for an event list. */
export function EventFilterFields({
  events,
  value,
  onChange,
  shown,
}: {
  events: Pick<V2Event, 'pool' | 'time'>[]
  value: EventFilter
  onChange: (next: EventFilter) => void
  /** How many events pass the filters and search. */
  shown: number
}) {
  const set =
    (key: keyof EventFilter) => (event: { target: { value: string } }) =>
      onChange({ ...value, [key]: event.target.value })
  const years = [
    ...new Set([1, 2, 3, 4, ...events.map((event) => event.time.year)]),
  ].sort((a, b) => a - b)
  return (
    <div className="bo-event-filters">
      <div className="bo-form-grid">
        <label className="bo-field">
          <span>Pool</span>
          <BoDropdown value={value.pool} onChange={set('pool')}>
            <option value={ALL}>ทุก Pool</option>
            <option value={NO_POOL}>ไม่อยู่ใน Pool</option>
            {eventPools(events).map(({ pool, count }) => (
              <option key={pool} value={pool}>
                {pool} ({count})
              </option>
            ))}
          </BoDropdown>
        </label>
        <label className="bo-field">
          <span>ประเภท</span>
          <BoDropdown value={value.kind} onChange={set('kind')}>
            <option value={ALL}>ทุกประเภท</option>
            {Object.entries(kindLabels).map(([kind, label]) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </BoDropdown>
        </label>
        <label className="bo-field">
          <span>ปี</span>
          <BoDropdown value={value.year} onChange={set('year')}>
            <option value={ALL}>ทุกปี</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                ปี {year}
              </option>
            ))}
          </BoDropdown>
        </label>
        <label className="bo-field">
          <span>ช่วงเวลา</span>
          <BoDropdown value={value.period} onChange={set('period')}>
            <option value={ALL}>ทุกช่วง</option>
            {Object.entries(periodLabels).map(([period, label]) => (
              <option key={period} value={period}>
                {label}
              </option>
            ))}
          </BoDropdown>
        </label>
        <label className="bo-field bo-event-filters-wide">
          <span>สถานะ</span>
          <BoDropdown value={value.status} onChange={set('status')}>
            {Object.entries(statusLabels).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </BoDropdown>
        </label>
      </div>
      <p className="bo-event-filters-summary muted text-xs" role="status">
        แสดง {shown} จาก {events.length}
        {isFiltering(value) && (
          <button
            type="button"
            className="bo-text-button"
            onClick={() => onChange(allEvents)}
          >
            ล้างตัวกรอง
          </button>
        )}
      </p>
    </div>
  )
}
