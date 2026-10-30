import { CopyIdButton } from './CopyIdButton'
import { idProblem } from './idCheck'
import { randomId } from './randomId'
import type { V2Content } from '../../content/v2/schema'

type Ending = V2Content['endings'][number]

export function V2EndingEditor({
  ending,
  onChange,
  onDelete,
  otherIds,
}: {
  ending: Ending
  onChange: (next: Ending) => void
  onDelete: () => void
  otherIds: string[]
}) {
  const idError = idProblem(ending.id, otherIds)
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
        <div className="bo-field">
          <label htmlFor="bo-ending-id">Ending ID</label>
          <div className="bo-id-actions">
            <input
              id="bo-ending-id"
              className="field"
              value={ending.id}
              aria-invalid={!!idError}
              aria-describedby={idError ? 'bo-ending-id-error' : undefined}
              onChange={(event) =>
                onChange({ ...ending, id: event.target.value })
              }
            />
            <button
              type="button"
              className="button button-secondary"
              aria-label="สุ่ม Ending ID"
              onClick={() =>
                onChange({ ...ending, id: randomId('ending', otherIds) })
              }
            >
              สุ่ม ID
            </button>
            <CopyIdButton value={ending.id} label="Ending ID" />
          </div>
          {idError && (
            <small id="bo-ending-id-error" className="bo-field-error">
              {idError}
            </small>
          )}
        </div>
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
          {!ending.title.trim() && (
            <small className="bo-field-error">ต้องมีชื่อตอนจบ</small>
          )}
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
        {!ending.summary.trim() && (
          <small className="bo-field-error">ต้องมีสรุปชีวิต</small>
        )}
      </label>
    </div>
  )
}
