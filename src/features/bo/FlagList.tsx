import { useState } from 'react'
import type { V2Content } from '../../content/v2/schema'
import { flagUsage } from './flagUsage'
import type { IssueTarget } from './issueTarget'
import { ListSearch } from './ListSearch'

function Places({
  places,
  onGo,
}: {
  places: IssueTarget[]
  onGo: (target: IssueTarget) => void
}) {
  if (!places.length) return <span className="muted">—</span>
  return (
    <ul className="bo-flag-places">
      {places.map((place, index) => (
        <li key={index}>
          <button
            type="button"
            className="bo-issue-link"
            onClick={() => onGo(place)}
          >
            <strong>{place.label}</strong>
            <span>{place.field}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function FlagList({
  content,
  onGo,
}: {
  content: V2Content
  onGo: (target: IssueTarget) => void
}) {
  const [query, setQuery] = useState('')
  const flags = flagUsage(content)
  const visible = flags.filter((flag) =>
    flag.id.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <section className="panel bo-editor mt-3" aria-label="ตัวแปร (Flag)">
      <div className="bo-section-heading">
        <h2 className="font-extrabold">ตัวแปร (Flag) {flags.length}</h2>
      </div>
      <p className="muted text-sm">
        รวมจากเหตุการณ์ วิชาเสรี และ Flow เรื่อง แก้ Flag ได้ที่ตำแหน่งที่ใช้
      </p>
      <ListSearch label="ค้นหา Flag" value={query} onChange={setQuery} />
      {visible.length ? (
        <table className="bo-flag-table">
          <thead>
            <tr>
              <th scope="col">Flag</th>
              <th scope="col">ตั้งค่าที่</th>
              <th scope="col">ตรวจที่</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((flag) => (
              <tr key={flag.id}>
                <th scope="row">
                  <code>{flag.id}</code>
                  {!flag.sets.length && (
                    <small className="bo-field-error">
                      ตรวจแต่ไม่เคยตั้งค่า
                    </small>
                  )}
                  {!flag.checks.length && (
                    <small className="muted">ตั้งค่าแต่ไม่เคยตรวจ</small>
                  )}
                </th>
                <td>
                  <Places places={flag.sets} onGo={onGo} />
                </td>
                <td>
                  <Places places={flag.checks} onGo={onGo} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted mt-3 text-sm">
          {flags.length ? 'ไม่พบ Flag ที่ค้นหา' : 'ยังไม่มี Flag ในเนื้อหา'}
        </p>
      )}
    </section>
  )
}

// One shared list for every Flag ID field, so a field suggests known flags
// and still accepts a new name.
export function FlagIdOptions({ content }: { content: V2Content }) {
  return (
    <datalist id="bo-flag-ids">
      {flagUsage(content).map((flag) => (
        <option key={flag.id} value={flag.id} />
      ))}
    </datalist>
  )
}
