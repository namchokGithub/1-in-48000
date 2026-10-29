import { useState } from 'react'
import type { V2Event, V2Stats } from '../../content/v2/schema'
import { v2IdSchema, v2StoryIdSchema } from '../../content/v2/schema'
import { BoDropdown } from './Select'
import { v2StatOptions } from './v2StatOptions'
import { effectSummary } from './storySummary'

type Effect = V2Event['choices'][number]['effects'][number]
type StateEffect = Extract<Effect, { type: 'statDelta' | 'setFlag' }>

function makeStateEffect(type: StateEffect['type']): StateEffect {
  return type === 'setFlag'
    ? { type, flagId: 'new_flag', value: true }
    : { type, stat: 'study', amount: 1 }
}

function makeEffect(type: Effect['type'], eventIds: string[]): Effect {
  switch (type) {
    case 'statDelta':
      return makeStateEffect(type)
    case 'setFlag':
      return makeStateEffect(type)
    case 'schedule':
      return {
        type,
        trigger: { type: 'afterEvent', eventId: eventIds[0] ?? 'new_event' },
        effect: makeStateEffect('statDelta'),
      }
    case 'chance':
      return {
        type,
        successPercent: 50,
        displayMode: 'amounts',
        successEffects: [],
        failureEffects: [],
      }
  }
}

function StateEffectEditor({
  effect,
  onChange,
}: {
  effect: StateEffect
  onChange: (next: StateEffect) => void
}) {
  return (
    <div className="bo-form-grid">
      <label className="bo-field">
        <span>ชนิดผลลัพธ์</span>
        <BoDropdown
          value={effect.type}
          onChange={(event) =>
            onChange(makeStateEffect(event.target.value as StateEffect['type']))
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
              value={effect.stat}
              onChange={(event) =>
                onChange({
                  ...effect,
                  stat: event.target.value as keyof V2Stats,
                })
              }
            >
              {v2StatOptions.map((stat) => (
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
              aria-invalid={!v2IdSchema.safeParse(effect.flagId).success}
              onChange={(event) =>
                onChange({ ...effect, flagId: event.target.value })
              }
            />
            {!v2IdSchema.safeParse(effect.flagId).success && (
              <small className="bo-field-error">
                Flag ID ต้องขึ้นต้นด้วยตัวพิมพ์เล็ก
              </small>
            )}
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

export function StateEffectList({
  value,
  onChange,
  label,
}: {
  value: StateEffect[]
  onChange: (next: StateEffect[]) => void
  label: string
}) {
  return (
    <div className="bo-nested bo-stack">
      <h5 className="font-bold">{label}</h5>
      {value.map((effect, index) => (
        <div className="bo-list-item" key={index}>
          <StateEffectEditor
            effect={effect}
            onChange={(next) =>
              onChange(
                value.map((item, position) =>
                  position === index ? next : item,
                ),
              )
            }
          />
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
        className="button button-secondary bo-add-at-end"
        onClick={() => onChange([...value, makeStateEffect('statDelta')])}
      >
        + เพิ่มผลลัพธ์
      </button>
    </div>
  )
}

export function V2EffectList({
  value,
  onChange,
  eventIds,
}: {
  value: Effect[]
  onChange: (next: Effect[]) => void
  eventIds: string[]
}) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const replace = (index: number, effect: Effect) =>
    onChange(
      value.map((item, position) => (position === index ? effect : item)),
    )
  return (
    <div className="bo-stack">
      {value.map((effect, index) => (
        <div className="bo-effect-card" key={index}>
          <div className="bo-section-heading">
            <button
              type="button"
              className="bo-effect-toggle"
              aria-expanded={expanded === index}
              onClick={() => setExpanded(expanded === index ? null : index)}
            >
              <span className="bo-summary-badge">{effectSummary(effect)}</span>
              <span aria-hidden="true">{expanded === index ? '⌃' : '⌄'}</span>
            </button>
            <details className="bo-more">
              <summary aria-label={`จัดการผลลัพธ์ ${index + 1}`}>···</summary>
              <div className="bo-more-panel">
                <button
                  type="button"
                  onClick={() => {
                    onChange([
                      ...value.slice(0, index + 1),
                      structuredClone(effect),
                      ...value.slice(index + 1),
                    ])
                    setExpanded(index + 1)
                  }}
                >
                  ทำซ้ำ
                </button>
                <button
                  type="button"
                  className="bo-danger"
                  onClick={() => {
                    onChange(value.filter((_, position) => position !== index))
                    setExpanded(null)
                  }}
                >
                  ลบ
                </button>
              </div>
            </details>
          </div>
          {expanded === index && (
            <div className="bo-effect-body bo-stack">
              <label className="bo-field">
                <span>ชนิดผลลัพธ์</span>
                <BoDropdown
                  value={effect.type}
                  onChange={(event) =>
                    replace(
                      index,
                      makeEffect(
                        event.target.value as Effect['type'],
                        eventIds,
                      ),
                    )
                  }
                >
                  <option value="statDelta">เปลี่ยนค่าสถานะ</option>
                  <option value="setFlag">ตั้ง Flag</option>
                  <option value="schedule">เกิดภายหลัง</option>
                  <option value="chance">สุ่มโอกาส</option>
                </BoDropdown>
              </label>
              {(effect.type === 'statDelta' || effect.type === 'setFlag') && (
                <StateEffectEditor
                  effect={effect}
                  onChange={(next) => replace(index, next)}
                />
              )}
              {effect.type === 'schedule' && (
                <details open className="bo-nested">
                  <summary>ผลลัพธ์ภายหลัง</summary>
                  <div className="bo-stack mt-3">
                    <label className="bo-field">
                      <span>เวลาเกิดผล</span>
                      <BoDropdown
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
                                    eventId: eventIds[0] ?? 'new_event',
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
                        <span>Event ID</span>
                        <input
                          className="field"
                          value={effect.trigger.eventId}
                          aria-invalid={
                            !v2StoryIdSchema.safeParse(effect.trigger.eventId)
                              .success ||
                            !eventIds.includes(effect.trigger.eventId)
                          }
                          onChange={(event) =>
                            replace(index, {
                              ...effect,
                              trigger: {
                                type: 'afterEvent',
                                eventId: event.target.value,
                              },
                            })
                          }
                        />
                        {(!v2StoryIdSchema.safeParse(effect.trigger.eventId)
                          .success ||
                          !eventIds.includes(effect.trigger.eventId)) && (
                          <small className="bo-field-error">
                            ไม่พบ Event ID สำหรับผลภายหลัง
                          </small>
                        )}
                      </label>
                    ) : (
                      <div className="bo-form-grid">
                        <label className="bo-field">
                          <span>ปี</span>
                          <input
                            className="field"
                            type="number"
                            min="1"
                            max="8"
                            value={effect.trigger.time.year}
                            onChange={(event) => {
                              if (effect.trigger.type !== 'atPeriod') return
                              replace(index, {
                                ...effect,
                                trigger: {
                                  type: 'atPeriod',
                                  time: {
                                    ...effect.trigger.time,
                                    year: Number(event.target.value),
                                  },
                                },
                              })
                            }}
                          />
                        </label>
                        <label className="bo-field">
                          <span>ช่วงเวลา</span>
                          <BoDropdown
                            value={effect.trigger.time.period}
                            onChange={(event) => {
                              if (effect.trigger.type !== 'atPeriod') return
                              replace(index, {
                                ...effect,
                                trigger: {
                                  type: 'atPeriod',
                                  time: {
                                    ...effect.trigger.time,
                                    period: event.target
                                      .value as V2Event['time']['period'],
                                  },
                                },
                              })
                            }}
                          >
                            <option value="term1">เทอม 1</option>
                            <option value="break">พักเทอม</option>
                            <option value="term2">เทอม 2</option>
                            <option value="summer">ฤดูร้อน</option>
                          </BoDropdown>
                        </label>
                      </div>
                    )}
                    <StateEffectEditor
                      effect={effect.effect}
                      onChange={(next) =>
                        replace(index, { ...effect, effect: next })
                      }
                    />
                  </div>
                </details>
              )}
              {effect.type === 'chance' && (
                <div className="bo-stack">
                  <div className="bo-form-grid">
                    <label className="bo-field">
                      <span>โอกาสสำเร็จ (%)</span>
                      <input
                        className="field"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={effect.successPercent}
                        onChange={(event) =>
                          replace(index, {
                            ...effect,
                            successPercent: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="bo-field">
                      <span>วิธีแสดงผลแก่ผู้เล่น</span>
                      <BoDropdown
                        value={effect.displayMode}
                        onChange={(event) =>
                          replace(index, {
                            ...effect,
                            displayMode: event.target
                              .value as typeof effect.displayMode,
                          })
                        }
                      >
                        <option value="amounts">แสดงจำนวนที่เปลี่ยน</option>
                        <option value="statsOnly">แสดงเฉพาะค่าสถานะ</option>
                      </BoDropdown>
                    </label>
                  </div>
                  <StateEffectList
                    label="เมื่อสำเร็จ"
                    value={effect.successEffects}
                    onChange={(next) =>
                      replace(index, { ...effect, successEffects: next })
                    }
                  />
                  <StateEffectList
                    label="เมื่อไม่สำเร็จ"
                    value={effect.failureEffects}
                    onChange={(next) =>
                      replace(index, { ...effect, failureEffects: next })
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        className="button button-secondary bo-add-at-end"
        onClick={() => {
          onChange([...value, makeEffect('statDelta', eventIds)])
          setExpanded(value.length)
        }}
      >
        + เพิ่มผลลัพธ์
      </button>
    </div>
  )
}
