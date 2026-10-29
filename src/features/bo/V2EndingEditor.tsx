import type { V2Content } from '../../content/v2/schema'

type Ending = V2Content['endings'][number]

export function V2EndingEditor({
  ending,
  onChange,
  onDelete,
}: {
  ending: Ending
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
            aria-invalid={!ending.title.trim()}
            onChange={(event) =>
              onChange({ ...ending, title: event.target.value })
            }
          />
        </label>
      </div>
      <label className="bo-field">
        <span>สรุปชีวิต</span>
        <textarea
          className="field bo-textarea"
          value={ending.summary}
          aria-invalid={!ending.summary.trim()}
          onChange={(event) =>
            onChange({ ...ending, summary: event.target.value })
          }
        />
      </label>
    </div>
  )
}
