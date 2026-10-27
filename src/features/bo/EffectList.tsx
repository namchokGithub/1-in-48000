import type { Effect, StateEffect } from '../../content/schema'
import { BoDropdown } from './Select'
import { statOptions } from './statOptions'

function newEffect(type: Effect['type'], eventIds: string[]): Effect {
  switch (type) {
    case 'statDelta':
      return { type, stat: 'study', amount: 1 }
    case 'setFlag':
      return { type, flagId: 'new_flag', value: true }
    case 'goToEvent':
      return { type, eventId: eventIds[0] ?? 'orientation' }
    case 'schedule':
      return {
        type,
        trigger: { type: 'afterEvent', eventId: eventIds[0] ?? 'orientation' },
        effect: { type: 'statDelta', stat: 'study', amount: 1 },
      }
  }
}

function StateEffectFields({
  effect,
  onChange,
}: {
  effect: StateEffect
  onChange: (next: StateEffect) => void
}) {
  return (
    <div className="bo-form-grid">
      <label className="bo-field">
        <span>ผลที่เกิด</span>
        <BoDropdown
          className="field"
          value={effect.type}
          onChange={(event) =>
            onChange(
              event.target.value === 'setFlag'
                ? { type: 'setFlag', flagId: 'new_flag', value: true }
                : { type: 'statDelta', stat: 'study', amount: 1 },
            )
          }
        >
          <option value="statDelta">เปลี่ยนค่าสถานะ</option>
          <option value="setFlag">ตั้ง Flag</option>
        </BoDropdown>
      </label>
      {effect.type === 'statDelta' ? (
        <>
          <label className="bo-field">
            <span>ค่าสถานะ</span>
            <BoDropdown
              className="field"
              value={effect.stat}
              onChange={(event) =>
                onChange({
                  ...effect,
                  stat: event.target.value as typeof effect.stat,
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
            <span>จำนวนที่เปลี่ยน</span>
            <input
              className="field"
              type="number"
              value={effect.amount}
              onChange={(event) =>
                onChange({ ...effect, amount: Number(event.target.value) })
              }
            />
          </label>
        </>
      ) : (
        <>
          <label className="bo-field">
            <span>Flag ID</span>
            <input
              className="field"
              value={effect.flagId}
              onChange={(event) =>
                onChange({ ...effect, flagId: event.target.value })
              }
            />
          </label>
          <label className="bo-checkbox-field">
            <input
              type="checkbox"
              checked={effect.value}
              onChange={(event) =>
                onChange({ ...effect, value: event.target.checked })
              }
            />
            <span>ตั้ง Flag เป็นจริง</span>
          </label>
        </>
      )}
    </div>
  )
}

export function EffectList({
  value,
  onChange,
  eventIds,
}: {
  value: Effect[]
  onChange: (next: Effect[]) => void
  eventIds: string[]
}) {
  const replace = (index: number, effect: Effect) =>
    onChange(
      value.map((entry, position) => (position === index ? effect : entry)),
    )

  return (
    <div className="bo-stack">
      {value.map((effect, index) => (
        <div className="bo-list-item" key={index}>
          <div className="bo-form-grid">
            <label className="bo-field">
              <span>ชนิดผลลัพธ์</span>
              <BoDropdown
                className="field"
                value={effect.type}
                onChange={(event) =>
                  replace(
                    index,
                    newEffect(event.target.value as Effect['type'], eventIds),
                  )
                }
              >
                <option value="statDelta">เปลี่ยนค่าสถานะ</option>
                <option value="setFlag">ตั้ง Flag</option>
                <option value="goToEvent">ไปเหตุการณ์</option>
                <option value="schedule">เกิดภายหลัง</option>
              </BoDropdown>
            </label>
            {effect.type === 'statDelta' && (
              <>
                <label className="bo-field">
                  <span>ค่าสถานะ</span>
                  <BoDropdown
                    className="field"
                    value={effect.stat}
                    onChange={(event) =>
                      replace(index, {
                        ...effect,
                        stat: event.target.value as typeof effect.stat,
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
                  <span>จำนวนที่เปลี่ยน</span>
                  <input
                    className="field"
                    type="number"
                    value={effect.amount}
                    onChange={(event) =>
                      replace(index, {
                        ...effect,
                        amount: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </>
            )}
            {effect.type === 'setFlag' && (
              <>
                <label className="bo-field">
                  <span>Flag ID</span>
                  <input
                    className="field"
                    value={effect.flagId}
                    onChange={(event) =>
                      replace(index, { ...effect, flagId: event.target.value })
                    }
                  />
                </label>
                <label className="bo-checkbox-field">
                  <input
                    type="checkbox"
                    checked={effect.value}
                    onChange={(event) =>
                      replace(index, { ...effect, value: event.target.checked })
                    }
                  />
                  <span>ตั้ง Flag เป็นจริง</span>
                </label>
              </>
            )}
            {effect.type === 'goToEvent' && (
              <label className="bo-field">
                <span>เหตุการณ์ถัดไป</span>
                <BoDropdown
                  className="field"
                  value={effect.eventId}
                  onChange={(event) =>
                    replace(index, { ...effect, eventId: event.target.value })
                  }
                >
                  {eventIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </BoDropdown>
              </label>
            )}
          </div>
          {effect.type === 'schedule' && (
            <div className="bo-stack mt-3">
              <div className="bo-form-grid">
                <label className="bo-field">
                  <span>เวลาเกิดผล</span>
                  <BoDropdown
                    className="field"
                    value={effect.trigger.type}
                    onChange={(event) =>
                      replace(index, {
                        ...effect,
                        trigger:
                          event.target.value === 'atPeriod'
                            ? {
                                type: 'atPeriod',
                                time: { year: 1, period: 'break' },
                              }
                            : {
                                type: 'afterEvent',
                                eventId: eventIds[0] ?? 'orientation',
                              },
                      })
                    }
                  >
                    <option value="afterEvent">หลังเหตุการณ์</option>
                    <option value="atPeriod">เมื่อเข้าช่วงเวลา</option>
                  </BoDropdown>
                </label>
                {effect.trigger.type === 'afterEvent' ? (
                  <label className="bo-field">
                    <span>เหตุการณ์</span>
                    <BoDropdown
                      className="field"
                      value={effect.trigger.eventId}
                      onChange={(event) =>
                        replace(index, {
                          ...effect,
                          trigger: {
                            type: 'afterEvent',
                            eventId: event.target.value,
                          },
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
                ) : (
                  <>
                    <label className="bo-field">
                      <span>ปี</span>
                      <input
                        className="field"
                        type="number"
                        min="1"
                        max="4"
                        value={effect.trigger.time.year}
                        onChange={(event) =>
                          replace(index, {
                            ...effect,
                            trigger: {
                              type: 'atPeriod',
                              time: {
                                year: Number(event.target.value),
                                period:
                                  effect.trigger.type === 'atPeriod'
                                    ? effect.trigger.time.period
                                    : 'break',
                              },
                            },
                          })
                        }
                      />
                    </label>
                    <label className="bo-field">
                      <span>ช่วงเวลา</span>
                      <BoDropdown
                        className="field"
                        value={effect.trigger.time.period}
                        onChange={(event) =>
                          replace(index, {
                            ...effect,
                            trigger: {
                              type: 'atPeriod',
                              time: {
                                year:
                                  effect.trigger.type === 'atPeriod'
                                    ? effect.trigger.time.year
                                    : 1,
                                period: event.target.value as
                                  'term1' | 'break' | 'term2' | 'summer',
                              },
                            },
                          })
                        }
                      >
                        <option value="term1">เทอม 1</option>
                        <option value="break">พักเทอม</option>
                        <option value="term2">เทอม 2</option>
                        <option value="summer">ภาคฤดูร้อน</option>
                      </BoDropdown>
                    </label>
                  </>
                )}
              </div>
              <StateEffectFields
                effect={effect.effect}
                onChange={(next) => replace(index, { ...effect, effect: next })}
              />
            </div>
          )}
          <button
            type="button"
            className="bo-text-button bo-danger"
            onClick={() =>
              onChange(value.filter((_, position) => position !== index))
            }
          >
            ลบผลลัพธ์
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button-secondary"
        onClick={() => onChange([...value, newEffect('statDelta', eventIds)])}
      >
        + เพิ่มผลลัพธ์
      </button>
    </div>
  )
}
