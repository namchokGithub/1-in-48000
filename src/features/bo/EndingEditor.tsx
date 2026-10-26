import type { Ending } from '../../content/schema'
import { ConditionList } from './ConditionList'

export function EndingEditor({
  ending,
  eventIds,
  onChange,
  onDelete,
}: {
  ending: Ending
  eventIds: string[]
  onChange: (next: Ending) => void
  onDelete: () => void
}) {
  return (
    <div className="bo-stack">
      <div className="bo-section-heading">
        <div>
          <p className="eyebrow">ตอนจบ</p>
          <h2 className="text-2xl font-extrabold">
            {ending.title || 'ตอนจบใหม่'}
          </h2>
        </div>
        <button
          type="button"
          className="button button-danger"
          onClick={onDelete}
        >
          ลบจากร่าง
        </button>
      </div>
      <div className="bo-form-grid">
        <label className="bo-field">
          <span>Ending ID</span>
          <input
            className="field"
            value={ending.id}
            onChange={(event) =>
              onChange({ ...ending, id: event.target.value })
            }
          />
        </label>
        <label className="bo-field">
          <span>ชื่อตอนจบ</span>
          <input
            className="field"
            value={ending.title}
            onChange={(event) =>
              onChange({ ...ending, title: event.target.value })
            }
          />
        </label>
      </div>
      <label className="bo-field">
        <span>เรื่องสรุปชีวิต</span>
        <textarea
          className="field bo-textarea resize-none"
          value={ending.summary}
          onChange={(event) =>
            onChange({ ...ending, summary: event.target.value })
          }
        />
      </label>
      <section className="bo-editor-section">
        <h3>เงื่อนไขตอนจบ</h3>
        <p className="muted text-sm">ตอนจบจะตรวจตามลำดับในรายการ</p>
        <ConditionList
          value={ending.conditions}
          eventIds={eventIds}
          onChange={(conditions) => onChange({ ...ending, conditions })}
        />
      </section>
    </div>
  )
}
