import type { Condition } from '../../content/schema'
import { BoDropdown } from './Select'
import { statOptions } from './statOptions'

const types: { id: Condition['type']; label: string }[] = [
  { id: 'year', label: 'ปีการศึกษา' },
  { id: 'stat', label: 'ค่าสถานะ' },
  { id: 'flag', label: 'Flag' },
  { id: 'pastEvent', label: 'เหตุการณ์ที่ผ่านมา' },
]

function newCondition(type: Condition['type'], eventIds: string[]): Condition {
  switch (type) {
    case 'year':
      return { type, operator: 'eq', value: 1 }
    case 'stat':
      return { type, stat: 'study', operator: 'gte', value: 50 }
    case 'flag':
      return { type, flagId: 'new_flag', value: true }
    case 'pastEvent':
      return { type, eventId: eventIds[0] ?? 'orientation', visited: true }
  }
}

export function ConditionList({
  value,
  onChange,
  eventIds,
}: {
  value: Condition[]
  onChange: (next: Condition[]) => void
  eventIds: string[]
}) {
  const replace = (index: number, condition: Condition) =>
    onChange(
      value.map((entry, position) => (position === index ? condition : entry)),
    )

  return (
    <div className="bo-stack">
      {value.map((condition, index) => (
        <div className="bo-list-item" key={index}>
          <div className="bo-form-grid">
            <label className="bo-field">
              <span>ชนิดเงื่อนไข</span>
              <BoDropdown
                className="field"
                value={condition.type}
                onChange={(event) =>
                  replace(
                    index,
                    newCondition(
                      event.target.value as Condition['type'],
                      eventIds,
                    ),
                  )
                }
              >
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </BoDropdown>
            </label>
            {condition.type === 'year' && (
              <>
                <label className="bo-field">
                  <span>เปรียบเทียบ</span>
                  <BoDropdown
                    className="field"
                    value={condition.operator}
                    onChange={(event) =>
                      replace(index, {
                        ...condition,
                        operator: event.target
                          .value as typeof condition.operator,
                      })
                    }
                  >
                    <option value="eq">เท่ากับ</option>
                    <option value="gte">อย่างน้อย</option>
                    <option value="lte">ไม่เกิน</option>
                  </BoDropdown>
                </label>
                <label className="bo-field">
                  <span>ปี</span>
                  <input
                    className="field"
                    type="number"
                    min="1"
                    max="4"
                    value={condition.value}
                    onChange={(event) =>
                      replace(index, {
                        ...condition,
                        value: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </>
            )}
            {condition.type === 'stat' && (
              <>
                <label className="bo-field">
                  <span>ค่าสถานะ</span>
                  <BoDropdown
                    className="field"
                    value={condition.stat}
                    onChange={(event) =>
                      replace(index, {
                        ...condition,
                        stat: event.target.value as typeof condition.stat,
                      })
                    }
                  >
                    {statOptions.map((stat) => (
                      <option key={stat.id} value={stat.id}>
                        {stat.label}
                      </option>
                    ))}
                  </BoDropdown>
                </label>
                <label className="bo-field">
                  <span>เปรียบเทียบ</span>
                  <BoDropdown
                    className="field"
                    value={condition.operator}
                    onChange={(event) =>
                      replace(index, {
                        ...condition,
                        operator: event.target
                          .value as typeof condition.operator,
                      })
                    }
                  >
                    <option value="eq">=</option>
                    <option value="gt">&gt;</option>
                    <option value="gte">≥</option>
                    <option value="lt">&lt;</option>
                    <option value="lte">≤</option>
                  </BoDropdown>
                </label>
                <label className="bo-field">
                  <span>ค่า</span>
                  <input
                    className="field"
                    type="number"
                    value={condition.value}
                    onChange={(event) =>
                      replace(index, {
                        ...condition,
                        value: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </>
            )}
            {condition.type === 'flag' && (
              <>
                <label className="bo-field">
                  <span>Flag ID</span>
                  <input
                    className="field"
                    value={condition.flagId}
                    onChange={(event) =>
                      replace(index, {
                        ...condition,
                        flagId: event.target.value,
                      })
                    }
                  />
                </label>
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
                  <span>Flag เป็นจริง</span>
                </label>
              </>
            )}
            {condition.type === 'pastEvent' && (
              <>
                <label className="bo-field">
                  <span>เหตุการณ์</span>
                  <BoDropdown
                    className="field"
                    value={condition.eventId}
                    onChange={(event) =>
                      replace(index, {
                        ...condition,
                        eventId: event.target.value,
                      })
                    }
                  >
                    {eventIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </BoDropdown>
                </label>
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
                  <span>เคยพบเหตุการณ์</span>
                </label>
              </>
            )}
          </div>
          <button
            type="button"
            className="bo-text-button bo-danger"
            onClick={() =>
              onChange(value.filter((_, position) => position !== index))
            }
          >
            ลบเงื่อนไข
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button-secondary"
        onClick={() => onChange([...value, newCondition('stat', eventIds)])}
      >
        + เพิ่มเงื่อนไข
      </button>
    </div>
  )
}
