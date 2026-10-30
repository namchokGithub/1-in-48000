import { useState, type DragEvent } from 'react'
import { CopyIdButton } from './CopyIdButton'
import type { V2Content, V2Event, V2Outfit } from '../../content/v2/schema'
import { v2StoryIdSchema } from '../../content/v2/schema'
import { BoDropdown } from './Select'
import { randomId } from './randomId'
import { reorder } from './reorder'
import { lineSpeaker } from '../../content/v2/lineSpeaker'
import { V2ConditionList } from './V2ConditionList'
import { V2EffectList } from './V2EffectList'
import { conditionSummary, effectSummary } from './storySummary'

export function V2EventEditor({
  event,
  assets,
  characters,
  catalogs,
  eventIds,
  onChange,
  onDelete,
}: {
  event: V2Event
  assets: V2Content['assets']
  characters: V2Content['characters']
  catalogs: Pick<V2Content, 'faculties' | 'majors' | 'electives'>
  eventIds: string[]
  onChange: (next: V2Event) => void
  onDelete: () => void
}) {
  const [expandedChoice, setExpandedChoice] = useState<number | null>(0)
  const narrator = characters.find((item) => item.isNarrator)
  const update = (change: (next: V2Event) => void) => {
    const next = structuredClone(event)
    change(next)
    onChange(next)
  }
  const duplicateChoice = (index: number) =>
    update((next) => {
      const copy = structuredClone(next.choices[index])
      copy.id = randomId(
        'choice',
        next.choices.map((choice) => choice.id),
      )
      next.choices.splice(index + 1, 0, copy)
    })
  const drop = (
    dropEvent: DragEvent,
    group: 'line' | 'choice',
    target: number,
  ) => {
    dropEvent.preventDefault()
    const [draggedGroup, rawIndex] = dropEvent.dataTransfer
      .getData('text/plain')
      .split(':')
    const source = Number(rawIndex)
    if (draggedGroup !== group || !Number.isInteger(source)) return
    update((next) => {
      if (group === 'line') next.lines = reorder(next.lines, source, target)
      else next.choices = reorder(next.choices, source, target)
    })
    if (group === 'choice') setExpandedChoice(target)
  }
  const idFormatValid = v2StoryIdSchema.safeParse(event.id).success
  const idUnique = eventIds.filter((id) => id === event.id).length === 1
  const idValid = idFormatValid && idUnique

  return (
    <div className="bo-story-editor bo-stack">
      <div className="bo-section-heading">
        <div>
          <p className="eyebrow">เหตุการณ์ · ปี {event.time.year}</p>
          <h2 className="text-2xl font-extrabold">
            {event.title || 'เหตุการณ์ใหม่'}
          </h2>
          <p className="muted text-sm">{event.id}</p>
        </div>
        <div className="bo-story-heading-actions">
          <span className="bo-summary-badge">
            {event.active === false ? 'Inactive' : 'Draft'}
          </span>
          <button
            type="button"
            className="button button-danger"
            onClick={onDelete}
          >
            ลบจากร่าง
          </button>
        </div>
      </div>
      <div className="bo-form-grid">
        <div className="bo-field bo-id-field">
          <label htmlFor="bo-v2-event-id">Event ID</label>
          <div className="bo-id-actions">
            <input
              id="bo-v2-event-id"
              className="field"
              value={event.id}
              aria-invalid={!idValid}
              aria-describedby={!idValid ? 'bo-v2-event-id-error' : undefined}
              onChange={(input) =>
                update((next) => {
                  next.id = input.target.value
                })
              }
            />
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                update((next) => {
                  next.id = randomId('event', eventIds)
                })
              }
            >
              สุ่ม ID
            </button>
            <CopyIdButton value={event.id} label="Event ID" />
          </div>
          {!idValid && (
            <small id="bo-v2-event-id-error" className="bo-field-error">
              {idFormatValid
                ? 'Event ID ซ้ำ'
                : 'ใช้ snake_case เช่น lost_student_card'}
            </small>
          )}
        </div>
        <label className="bo-field">
          <span>ชื่อเหตุการณ์</span>
          <input
            className="field"
            value={event.title}
            aria-invalid={!event.title.trim()}
            onChange={(input) =>
              update((next) => {
                next.title = input.target.value
              })
            }
          />
          {!event.title.trim() && (
            <small className="bo-field-error">กรุณาใส่ชื่อเหตุการณ์</small>
          )}
        </label>
        <label className="bo-field">
          <span>ชนิด</span>
          <BoDropdown
            value={event.kind}
            onChange={(input) =>
              update((next) => {
                next.kind = input.target.value as V2Event['kind']
              })
            }
          >
            <option value="main">เหตุการณ์หลัก</option>
            <option value="conditional">ตามเงื่อนไข</option>
            <option value="holiday">วันหยุด</option>
            <option value="random">สุ่ม</option>
          </BoDropdown>
        </label>
        <label className="bo-field">
          <span>ปี</span>
          <input
            className="field"
            type="number"
            min="1"
            max="8"
            value={event.time.year}
            onChange={(input) =>
              update((next) => {
                next.time.year = Number(input.target.value)
              })
            }
          />
        </label>
        <label className="bo-field">
          <span>ช่วงเวลา</span>
          <BoDropdown
            value={event.time.period}
            onChange={(input) =>
              update((next) => {
                next.time.period = input.target
                  .value as V2Event['time']['period']
              })
            }
          >
            <option value="term1">เทอม 1</option>
            <option value="break">พักเทอม</option>
            <option value="term2">เทอม 2</option>
            <option value="summer">ภาคฤดูร้อน</option>
          </BoDropdown>
        </label>
        <label className="bo-field">
          <span>Pool สำหรับการ์ดสุ่ม</span>
          <input
            className="field"
            value={event.pool ?? ''}
            placeholder="เว้นว่างถ้าวางบนกระดานเอง"
            aria-invalid={
              !!event.pool && !v2StoryIdSchema.safeParse(event.pool).success
            }
            onChange={(input) =>
              update((next) => {
                next.pool = input.target.value || undefined
              })
            }
          />
          {!!event.pool && !v2StoryIdSchema.safeParse(event.pool).success && (
            <small className="bo-field-error">
              ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดล่าง เช่น y1_term1_life
            </small>
          )}
        </label>
        <label className="bo-checkbox-field">
          <input
            type="checkbox"
            checked={event.active !== false}
            onChange={(input) =>
              update((next) => {
                next.active = input.target.checked
              })
            }
          />
          <span>เปิดใช้เหตุการณ์นี้</span>
        </label>
        <label className="bo-field">
          <span>ภาพฉาก</span>
          <BoDropdown
            value={event.sceneAssetId ?? ''}
            onChange={(input) =>
              update((next) => {
                next.sceneAssetId = input.target.value || undefined
              })
            }
          >
            <option value="">ไม่ใช้</option>
            {assets
              .filter((asset) => asset.kind === 'scene')
              .map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.id}
                </option>
              ))}
          </BoDropdown>
        </label>
        <label className="bo-field">
          <span>ชุดผู้เล่น</span>
          <BoDropdown
            value={event.outfit ?? ''}
            onChange={(input) =>
              update((next) => {
                next.outfit = (input.target.value || undefined) as
                  V2Outfit | undefined
              })
            }
          >
            <option value="">ค่าเริ่มต้น (ชุดนักศึกษา)</option>
            <option value="casual">ชุดปกติ</option>
            <option value="student">ชุดนักศึกษา</option>
          </BoDropdown>
        </label>
        <label className="bo-field">
          <span>เพลง</span>
          <BoDropdown
            value={event.bgmAssetId ?? ''}
            onChange={(input) =>
              update((next) => {
                next.bgmAssetId = input.target.value || undefined
              })
            }
          >
            <option value="">ไม่ใช้</option>
            {assets
              .filter((asset) => asset.kind === 'bgm')
              .map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.id}
                </option>
              ))}
          </BoDropdown>
        </label>
      </div>
      <div className="bo-nested bo-stack">
        <label className="bo-field">
          <span>วิธีเลือกคำตอบ</span>
          <BoDropdown
            value={event.selection?.type ?? 'single'}
            onChange={(input) =>
              update((next) => {
                const type = input.target.value
                if (type === 'single') {
                  next.selection = undefined
                } else if (type === 'program' || type === 'elective') {
                  next.selection = { type }
                } else if (type === 'multiple') {
                  next.selection = {
                    type,
                    min: 1,
                    max: Math.min(2, next.choices.length),
                  }
                }
              })
            }
          >
            <option value="single">เลือกหนึ่งข้อ</option>
            <option value="multiple">เลือกหลายข้อ</option>
            <option value="program">เลือกคณะและสาขา</option>
            <option value="elective">เลือกวิชาเสรี</option>
          </BoDropdown>
        </label>
        {event.selection?.type === 'multiple' && (
          <>
            <div className="bo-form-grid">
              <label className="bo-field">
                <span>เลือกอย่างน้อย</span>
                <input
                  className="field"
                  type="number"
                  min="1"
                  max={event.choices.length}
                  value={event.selection.min}
                  aria-invalid={
                    event.selection.min < 1 ||
                    event.selection.min > event.selection.max
                  }
                  onChange={(input) =>
                    update((next) => {
                      if (next.selection?.type === 'multiple')
                        next.selection.min = Number(input.target.value)
                    })
                  }
                />
              </label>
              <label className="bo-field">
                <span>เลือกได้สูงสุด</span>
                <input
                  className="field"
                  type="number"
                  min="1"
                  max={event.choices.length}
                  value={event.selection.max}
                  aria-invalid={
                    event.selection.max < event.selection.min ||
                    event.selection.max > event.choices.length
                  }
                  onChange={(input) =>
                    update((next) => {
                      if (next.selection?.type === 'multiple')
                        next.selection.max = Number(input.target.value)
                    })
                  }
                />
              </label>
            </div>
            {(event.selection.min > event.selection.max ||
              event.selection.max > event.choices.length) && (
              <p className="bo-field-error">
                จำนวนที่เลือกต้องไม่เกิน {event.choices.length} ข้อ
                และค่าต่ำสุดต้องไม่เกินค่าสูงสุด
              </p>
            )}
          </>
        )}
        {(event.selection?.type === 'program' ||
          event.selection?.type === 'elective') && (
          <p className="muted text-sm">
            Player แสดงรายการจากแท็บข้อมูล และใช้ผลลัพธ์ของ Choice
            แรกเมื่อยืนยัน
          </p>
        )}
      </div>
      <details className="bo-nested">
        <summary>เงื่อนไขแสดงเหตุการณ์ · {event.conditions.length}</summary>
        <div className="mt-3">
          <V2ConditionList
            value={event.conditions}
            eventIds={eventIds}
            catalogs={catalogs}
            onChange={(conditions) =>
              update((next) => {
                next.conditions = conditions
              })
            }
          />
        </div>
      </details>
      <section className="bo-story-group" aria-label="บทสนทนา">
        <div className="bo-section-heading">
          <div>
            <h3>
              บทสนทนา{' '}
              <span className="bo-summary-badge">
                {event.lines.length} บรรทัด
              </span>
            </h3>
            <p className="muted text-sm">
              ลากการ์ดเพื่อจัดลำดับ หรือใช้ปุ่มขึ้นลง
            </p>
          </div>
        </div>
        <div className="bo-story-cards">
          {event.lines.map((line, index) => {
            const speaker = lineSpeaker(line, characters)
            const portrait = assets.find(
              (item) =>
                item.id ===
                  (line.portraitAssetId ?? speaker?.portraitAssetId) &&
                item.kind === 'portrait',
            )
            return (
              <article
                key={index}
                className="bo-story-card"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', `line:${index}`)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => drop(e, 'line', index)}
              >
                <div className="bo-section-heading">
                  <div className="bo-story-person">
                    <span className="bo-story-number">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {portrait ? (
                      <img src={portrait.path} alt="" />
                    ) : (
                      <span className="bo-story-avatar" aria-hidden="true">
                        {speaker?.name?.slice(0, 1) ?? '✦'}
                      </span>
                    )}
                    <strong>{speaker?.name ?? 'ผู้บรรยาย'}</strong>
                  </div>
                  <div className="bo-story-card-actions">
                    <span className="bo-drag-handle" aria-hidden="true">
                      ⠿
                    </span>
                    <details className="bo-more">
                      <summary aria-label={`จัดการบทสนทนา ${index + 1}`}>
                        ···
                      </summary>
                      <div className="bo-more-panel">
                        <button
                          type="button"
                          onClick={() =>
                            update((next) => {
                              next.lines.splice(
                                index + 1,
                                0,
                                structuredClone(line),
                              )
                            })
                          }
                        >
                          ทำซ้ำ
                        </button>
                        <button
                          type="button"
                          disabled={event.lines.length === 1}
                          className="bo-danger"
                          onClick={() =>
                            update((next) => {
                              next.lines.splice(index, 1)
                            })
                          }
                        >
                          ลบ
                        </button>
                      </div>
                    </details>
                  </div>
                </div>
                <div className="bo-form-grid">
                  <label className="bo-field">
                    <span>ผู้พูด</span>
                    <BoDropdown
                      value={line.speakerId ?? ''}
                      onChange={(input) =>
                        update((next) => {
                          next.lines[index].speakerId =
                            input.target.value || undefined
                          next.lines[index].portraitAssetId = undefined
                        })
                      }
                    >
                      <option value="">
                        ผู้บรรยาย{narrator ? ` (${narrator.name})` : ''}
                      </option>
                      {characters.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </BoDropdown>
                  </label>
                  <div className="bo-story-order">
                    <button
                      type="button"
                      className="bo-text-button"
                      disabled={index === 0}
                      onClick={() =>
                        update((next) => {
                          next.lines = reorder(next.lines, index, index - 1)
                        })
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="bo-text-button"
                      disabled={index === event.lines.length - 1}
                      onClick={() =>
                        update((next) => {
                          next.lines = reorder(next.lines, index, index + 1)
                        })
                      }
                    >
                      ↓
                    </button>
                  </div>
                </div>
                <label className="bo-field">
                  <span>ข้อความ</span>
                  <textarea
                    className="field bo-textarea"
                    value={line.text}
                    aria-invalid={!line.text.trim()}
                    onChange={(input) =>
                      update((next) => {
                        next.lines[index].text = input.target.value
                      })
                    }
                  />
                  {!line.text.trim() && (
                    <small className="bo-field-error">
                      กรุณาใส่ข้อความบทสนทนา
                    </small>
                  )}
                </label>
                <details className="bo-story-advanced">
                  <summary>Advanced · ภาพตัวละคร</summary>
                  <label className="bo-field">
                    <span>ภาพแทนค่าเริ่มต้น</span>
                    <BoDropdown
                      value={line.portraitAssetId ?? ''}
                      onChange={(input) =>
                        update((next) => {
                          next.lines[index].portraitAssetId =
                            input.target.value || undefined
                        })
                      }
                    >
                      <option value="">ใช้ภาพของผู้พูด</option>
                      {assets
                        .filter((asset) => asset.kind === 'portrait')
                        .map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.id}
                          </option>
                        ))}
                    </BoDropdown>
                  </label>
                </details>
              </article>
            )
          })}
        </div>
        <button
          type="button"
          className="button button-secondary bo-add-at-end"
          onClick={() =>
            update((next) => {
              next.lines.push({ text: 'บทสนทนาใหม่' })
            })
          }
        >
          + เพิ่มบรรทัด
        </button>
      </section>
      <section className="bo-story-group" aria-label="ตัวเลือกผู้เล่น">
        <div className="bo-section-heading">
          <h3>
            ตัวเลือกผู้เล่น{' '}
            <span className="bo-summary-badge">
              {event.choices.length} ตัวเลือก
            </span>
          </h3>
        </div>
        <div className="bo-story-cards">
          {event.choices.map((choice, index) => (
            <article
              key={index}
              className="bo-story-card bo-choice-card"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', `choice:${index}`)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => drop(e, 'choice', index)}
            >
              <div className="bo-section-heading">
                <button
                  type="button"
                  className="bo-choice-toggle"
                  aria-expanded={expandedChoice === index}
                  onClick={() =>
                    setExpandedChoice(expandedChoice === index ? null : index)
                  }
                >
                  <span className="bo-choice-kicker">
                    Choice {String(index + 1).padStart(2, '0')}
                  </span>
                  <strong>{choice.text || 'ตัวเลือกใหม่'}</strong>
                  <small className="muted">{choice.id}</small>
                  <span aria-hidden="true">
                    {expandedChoice === index ? '⌃' : '⌄'}
                  </span>
                </button>
                <div className="bo-story-card-actions">
                  <span className="bo-drag-handle" aria-hidden="true">
                    ⠿
                  </span>
                  <details className="bo-more">
                    <summary aria-label={`จัดการตัวเลือก ${index + 1}`}>
                      ···
                    </summary>
                    <div className="bo-more-panel">
                      <button
                        type="button"
                        onClick={() => {
                          duplicateChoice(index)
                          setExpandedChoice(index + 1)
                        }}
                      >
                        ทำซ้ำ
                      </button>
                      <button
                        type="button"
                        disabled={event.choices.length === 1}
                        className="bo-danger"
                        onClick={() => {
                          update((next) => {
                            next.choices.splice(index, 1)
                          })
                          setExpandedChoice(null)
                        }}
                      >
                        ลบ
                      </button>
                    </div>
                  </details>
                </div>
              </div>
              <div className="bo-choice-summaries">
                {choice.effects.map((effect, effectIndex) => (
                  <span className="bo-summary-badge" key={effectIndex}>
                    {effectSummary(effect)}
                  </span>
                ))}
                {!choice.effects.length && (
                  <span className="muted text-xs">ยังไม่มีผลลัพธ์</span>
                )}
              </div>
              <p className="muted text-xs">
                {choice.effects.length} ผลลัพธ์ ·{' '}
                {choice.conditions.length
                  ? choice.conditions.map(conditionSummary).join(', ')
                  : 'ไม่มีเงื่อนไข'}
              </p>
              {expandedChoice === index && (
                <div className="bo-choice-body bo-stack">
                  <label className="bo-field">
                    <span>ข้อความตัวเลือก</span>
                    <input
                      className="field"
                      value={choice.text}
                      aria-invalid={!choice.text.trim()}
                      onChange={(input) =>
                        update((next) => {
                          next.choices[index].text = input.target.value
                        })
                      }
                    />
                    {!choice.text.trim() && (
                      <small className="bo-field-error">
                        กรุณาใส่ข้อความตัวเลือก
                      </small>
                    )}
                  </label>
                  <details className="bo-story-advanced">
                    <summary>Advanced · Choice ID และลำดับ</summary>
                    <div className="bo-id-actions">
                      <input
                        className="field"
                        aria-label="Choice ID"
                        value={choice.id}
                        aria-invalid={
                          !v2StoryIdSchema.safeParse(choice.id).success ||
                          event.choices.filter((item) => item.id === choice.id)
                            .length !== 1
                        }
                        onChange={(input) =>
                          update((next) => {
                            next.choices[index].id = input.target.value
                          })
                        }
                      />
                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() =>
                          update((next) => {
                            next.choices[index].id = randomId(
                              'choice',
                              next.choices.map((item) => item.id),
                            )
                          })
                        }
                      >
                        สุ่ม ID
                      </button>
                      <CopyIdButton value={choice.id} label="Choice ID" />
                    </div>
                    {(!v2StoryIdSchema.safeParse(choice.id).success ||
                      event.choices.filter((item) => item.id === choice.id)
                        .length !== 1) && (
                      <small className="bo-field-error">
                        {v2StoryIdSchema.safeParse(choice.id).success
                          ? 'Choice ID ซ้ำ'
                          : 'ใช้ snake_case เช่น take_loan'}
                      </small>
                    )}
                    <div className="bo-story-order">
                      <button
                        type="button"
                        className="bo-text-button"
                        disabled={index === 0}
                        onClick={() =>
                          update((next) => {
                            next.choices = reorder(
                              next.choices,
                              index,
                              index - 1,
                            )
                          })
                        }
                      >
                        ↑ ก่อนหน้า
                      </button>
                      <button
                        type="button"
                        className="bo-text-button"
                        disabled={index === event.choices.length - 1}
                        onClick={() =>
                          update((next) => {
                            next.choices = reorder(
                              next.choices,
                              index,
                              index + 1,
                            )
                          })
                        }
                      >
                        ↓ ถัดไป
                      </button>
                    </div>
                  </details>
                  <details className="bo-nested">
                    <summary>เงื่อนไข · {choice.conditions.length}</summary>
                    <div className="mt-3">
                      <V2ConditionList
                        value={choice.conditions}
                        eventIds={eventIds}
                        catalogs={catalogs}
                        onChange={(conditions) =>
                          update((next) => {
                            next.choices[index].conditions = conditions
                          })
                        }
                      />
                    </div>
                  </details>
                  <div className="bo-nested">
                    <h4>ผลลัพธ์</h4>
                    <V2EffectList
                      value={choice.effects}
                      eventIds={eventIds}
                      onChange={(effects) =>
                        update((next) => {
                          next.choices[index].effects = effects
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
        <button
          type="button"
          className="button button-secondary bo-add-at-end"
          onClick={() => {
            update((next) => {
              next.choices.push({
                id: randomId(
                  'choice',
                  next.choices.map((choice) => choice.id),
                ),
                text: 'ตัวเลือกใหม่',
                conditions: [],
                effects: [],
              })
            })
            setExpandedChoice(event.choices.length)
          }}
        >
          + เพิ่มตัวเลือก
        </button>
      </section>
    </div>
  )
}
