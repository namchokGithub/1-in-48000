import type { V2Event } from '../../content/v2/schema'
import { v2IdSchema, v2StoryIdSchema } from '../../content/v2/schema'
import { BoDropdown } from './Select'
import { v2StatOptions } from './v2StatOptions'
import { conditionSummary } from './storySummary'

type Condition = V2Event['conditions'][number]

function makeCondition(type: Condition['type'], eventIds: string[]): Condition {
  switch (type) {
    case 'year':
      return { type, operator: 'eq', value: 1 }
    case 'stat':
      return { type, stat: 'study', operator: 'gte', value: 50 }
    case 'flag':
      return { type, flagId: 'new_flag', value: true }
    case 'pastEvent':
      return { type, eventId: eventIds[0] ?? 'new_event', visited: true }
  }
}

export function V2ConditionList({
  value,
  eventIds,
  onChange,
}: {
  value: Condition[]
  eventIds: string[]
  onChange: (next: Condition[]) => void
}) {
  const replace = (index: number, next: Condition) =>
    onChange(value.map((item, position) => (position === index ? next : item)))
  return (
    <div className="bo-stack">
      {value.map((condition, index) => (
        <div className="bo-condition-row" key={index}>
          <div className="bo-condition-sentence">
            <span className="muted">เมื่อ</span>
            <BoDropdown
              label="ชนิดเงื่อนไข"
              value={condition.type}
              onChange={(event) =>
                replace(
                  index,
                  makeCondition(
                    event.target.value as Condition['type'],
                    eventIds,
                  ),
                )
              }
            >
              <option value="year">ปีการศึกษา</option>
              <option value="stat">ค่าสถานะ</option>
              <option value="flag">Flag</option>
              <option value="pastEvent">เหตุการณ์ที่ผ่านมา</option>
            </BoDropdown>
            {condition.type === 'year' && (
              <>
                <BoDropdown
                  label="การเปรียบเทียบปี"
                  value={condition.operator}
                  onChange={(event) =>
                    replace(index, {
                      ...condition,
                      operator: event.target.value as typeof condition.operator,
                    })
                  }
                >
                  <option value="eq">เท่ากับ</option>
                  <option value="gte">อย่างน้อย</option>
                  <option value="lte">ไม่เกิน</option>
                </BoDropdown>
                <input
                  className="field bo-short-field"
                  type="number"
                  min="1"
                  max="8"
                  aria-label="ปี"
                  value={condition.value}
                  onChange={(event) =>
                    replace(index, {
                      ...condition,
                      value: Number(event.target.value),
                    })
                  }
                />
              </>
            )}
            {condition.type === 'stat' && (
              <>
                <BoDropdown
                  label="ค่าสถานะ"
                  value={condition.stat}
                  onChange={(event) =>
                    replace(index, {
                      ...condition,
                      stat: event.target.value as typeof condition.stat,
                    })
                  }
                >
                  {v2StatOptions.map((stat) => (
                    <option key={stat.id} value={stat.id}>
                      {stat.label}
                    </option>
                  ))}
                </BoDropdown>
                <BoDropdown
                  label="การเปรียบเทียบค่าสถานะ"
                  value={condition.operator}
                  onChange={(event) =>
                    replace(index, {
                      ...condition,
                      operator: event.target.value as typeof condition.operator,
                    })
                  }
                >
                  <option value="eq">เท่ากับ</option>
                  <option value="gt">มากกว่า</option>
                  <option value="gte">อย่างน้อย</option>
                  <option value="lt">น้อยกว่า</option>
                  <option value="lte">ไม่เกิน</option>
                </BoDropdown>
                <input
                  className="field bo-short-field"
                  type="number"
                  aria-label="ค่า"
                  value={condition.value}
                  onChange={(event) =>
                    replace(index, {
                      ...condition,
                      value: Number(event.target.value),
                    })
                  }
                />
              </>
            )}
            {condition.type === 'flag' && (
              <>
                <input
                  className="field bo-medium-field"
                  aria-label="Flag ID"
                  aria-invalid={!v2IdSchema.safeParse(condition.flagId).success}
                  value={condition.flagId}
                  onChange={(event) =>
                    replace(index, { ...condition, flagId: event.target.value })
                  }
                />
                {!v2IdSchema.safeParse(condition.flagId).success && (
                  <small className="bo-field-error">
                    Flag ID ต้องขึ้นต้นด้วยตัวพิมพ์เล็ก
                  </small>
                )}
                <label className="bo-checkbox-field">
                  <input
                    type="checkbox"
                    checked={condition.value}
                    onChange={(event) =>
                      replace(index, {
                        ...condition,
                        value: event.target.checked,
                      })
                    }
                  />
                  <span>เป็นจริง</span>
                </label>
              </>
            )}
            {condition.type === 'pastEvent' && (
              <>
                <label className="bo-checkbox-field">
                  <input
                    type="checkbox"
                    checked={condition.visited}
                    onChange={(event) =>
                      replace(index, {
                        ...condition,
                        visited: event.target.checked,
                      })
                    }
                  />
                  <span>เคยพบ</span>
                </label>
                <input
                  className="field bo-medium-field"
                  aria-label="Event ID"
                  aria-invalid={
                    !v2StoryIdSchema.safeParse(condition.eventId).success ||
                    !eventIds.includes(condition.eventId)
                  }
                  value={condition.eventId}
                  onChange={(event) =>
                    replace(index, {
                      ...condition,
                      eventId: event.target.value,
                    })
                  }
                />
                {(!v2StoryIdSchema.safeParse(condition.eventId).success ||
                  !eventIds.includes(condition.eventId)) && (
                  <small className="bo-field-error">
                    ไม่พบ Event ID ที่ใช้งานได้
                  </small>
                )}
              </>
            )}
          </div>
          <button
            type="button"
            className="bo-text-button bo-danger"
            aria-label={`ลบเงื่อนไข ${conditionSummary(condition)}`}
            onClick={() =>
              onChange(value.filter((_, position) => position !== index))
            }
          >
            ลบ
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button-secondary bo-add-at-end"
        onClick={() => onChange([...value, makeCondition('year', eventIds)])}
      >
        + เพิ่มเงื่อนไข
      </button>
    </div>
  )
}
