import type { Asset, Character, Event } from '../../content/schema'
import { BoDropdown } from './Select'
import { ConditionList } from './ConditionList'
import { EffectList } from './EffectList'
import { randomId } from './randomId'
import { storyIdSchema } from '../../content/schema'

function AssetSelect({
  label,
  kind,
  value,
  assets,
  onChange,
}: {
  label: string
  kind: Asset['kind']
  value: string | undefined
  assets: Asset[]
  onChange: (id: string | undefined) => void
}) {
  return (
    <label className="bo-field">
      <span>{label}</span>
      <BoDropdown
        className="field"
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
      >
        <option value="">ไม่ใช้</option>
        {assets
          .filter((asset) => asset.kind === kind)
          .map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.id}
            </option>
          ))}
      </BoDropdown>
    </label>
  )
}

export function EventEditor({
  event,
  assets,
  characters,
  eventIds,
  onChange,
  onDelete,
}: {
  event: Event
  assets: Asset[]
  characters: Character[]
  eventIds: string[]
  onChange: (next: Event) => void
  onDelete: () => void
}) {
  function update(change: (next: Event) => void) {
    const next = structuredClone(event)
    change(next)
    onChange(next)
  }

  return (
    <div className="bo-stack">
      <div className="bo-section-heading">
        <div>
          <p className="eyebrow">เหตุการณ์</p>
          <h2 className="text-2xl font-extrabold">
            {event.title || 'เหตุการณ์ใหม่'}
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
          <label htmlFor="bo-event-id">Event ID</label>
          <div className="bo-id-actions">
            <input
              id="bo-event-id"
              className="field"
              value={event.id}
              aria-invalid={!storyIdSchema.safeParse(event.id).success}
              aria-describedby={
                !storyIdSchema.safeParse(event.id).success
                  ? 'bo-event-id-error'
                  : undefined
              }
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
          </div>
          {!storyIdSchema.safeParse(event.id).success && (
            <small id="bo-event-id-error" className="bo-field-error">
              ใช้ตัวพิมพ์เล็ก ตัวเลข และ _ คั่นคำ เช่น lost_student_card
            </small>
          )}
        </div>
        <label className="bo-field">
          <span>ชื่อเหตุการณ์</span>
          <input
            className="field"
            value={event.title}
            onChange={(input) =>
              update((next) => {
                next.title = input.target.value
              })
            }
          />
        </label>
        <label className="bo-field">
          <span>ชนิด</span>
          <BoDropdown
            className="field"
            value={event.kind}
            onChange={(input) =>
              update((next) => {
                next.kind = input.target.value as Event['kind']
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
            max="4"
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
            className="field"
            value={event.time.period}
            onChange={(input) =>
              update((next) => {
                next.time.period = input.target.value as Event['time']['period']
              })
            }
          >
            <option value="term1">เทอม 1</option>
            <option value="break">พักเทอม</option>
            <option value="term2">เทอม 2</option>
            <option value="summer">ภาคฤดูร้อน</option>
          </BoDropdown>
        </label>
      </div>
      <div className="bo-form-grid">
        <AssetSelect
          label="ภาพฉาก"
          kind="scene"
          value={event.sceneAssetId}
          assets={assets}
          onChange={(id) =>
            update((next) => {
              next.sceneAssetId = id
            })
          }
        />
        <AssetSelect
          label="เพลง"
          kind="bgm"
          value={event.bgmAssetId}
          assets={assets}
          onChange={(id) =>
            update((next) => {
              next.bgmAssetId = id
            })
          }
        />
      </div>
      <section className="bo-editor-section">
        <h3>เงื่อนไขแสดงเหตุการณ์</h3>
        <ConditionList
          value={event.conditions}
          eventIds={eventIds}
          onChange={(conditions) =>
            update((next) => {
              next.conditions = conditions
            })
          }
        />
      </section>
      <section className="bo-editor-section">
        <div className="bo-section-heading">
          <h3>บทสนทนา</h3>
          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              update((next) => {
                next.lines.push({ text: 'บทสนทนาใหม่' })
              })
            }
          >
            + เพิ่มบรรทัด
          </button>
        </div>
        {event.lines.map((line, index) => (
          <div className="bo-list-item" key={index}>
            <div className="bo-form-grid">
              <label className="bo-field">
                <span>ผู้พูด</span>
                <BoDropdown
                  className="field"
                  value={line.speakerId ?? ''}
                  onChange={(input) =>
                    update((next) => {
                      next.lines[index].speakerId =
                        input.target.value || undefined
                    })
                  }
                >
                  <option value="">ผู้บรรยาย</option>
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </BoDropdown>
              </label>
              <AssetSelect
                label="ภาพตัวละครแทนค่าเริ่มต้น"
                kind="portrait"
                value={line.portraitAssetId}
                assets={assets}
                onChange={(id) =>
                  update((next) => {
                    next.lines[index].portraitAssetId = id
                  })
                }
              />
            </div>
            <label className="bo-field">
              <span>ข้อความ</span>
              <textarea
                className="field bo-textarea resize-none"
                value={line.text}
                onChange={(input) =>
                  update((next) => {
                    next.lines[index].text = input.target.value
                  })
                }
              />
            </label>
            <button
              type="button"
              className="bo-text-button bo-danger"
              disabled={event.lines.length === 1}
              onClick={() =>
                update((next) => {
                  next.lines.splice(index, 1)
                })
              }
            >
              ลบบรรทัด
            </button>
          </div>
        ))}
      </section>
      <section className="bo-editor-section">
        <div className="bo-section-heading">
          <h3>ตัวเลือก</h3>
          <button
            type="button"
            className="button button-secondary"
            onClick={() =>
              update((next) => {
                next.choices.push({
                  id: randomId(
                    'choice',
                    next.choices.map((item) => item.id),
                  ),
                  text: 'ตัวเลือกใหม่',
                  conditions: [],
                  effects: [],
                })
              })
            }
          >
            + เพิ่มตัวเลือก
          </button>
        </div>
        {event.choices.map((choice, index) => (
          <div className="bo-list-item bo-choice" key={index}>
            <div className="bo-form-grid">
              <div className="bo-field">
                <label htmlFor={`bo-choice-id-${index}`}>Choice ID</label>
                <div className="bo-id-actions">
                  <input
                    id={`bo-choice-id-${index}`}
                    className="field"
                    value={choice.id}
                    aria-invalid={!storyIdSchema.safeParse(choice.id).success}
                    aria-describedby={
                      !storyIdSchema.safeParse(choice.id).success
                        ? `bo-choice-id-${index}-error`
                        : undefined
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
                </div>
                {!storyIdSchema.safeParse(choice.id).success && (
                  <small
                    id={`bo-choice-id-${index}-error`}
                    className="bo-field-error"
                  >
                    ใช้ตัวพิมพ์เล็ก ตัวเลข และ _ คั่นคำ เช่น take_loan
                  </small>
                )}
              </div>
              <label className="bo-field">
                <span>ข้อความตัวเลือก</span>
                <input
                  className="field"
                  value={choice.text}
                  onChange={(input) =>
                    update((next) => {
                      next.choices[index].text = input.target.value
                    })
                  }
                />
              </label>
            </div>
            <div className="bo-nested">
              <h4>เงื่อนไขของตัวเลือก</h4>
              <ConditionList
                value={choice.conditions}
                eventIds={eventIds}
                onChange={(conditions) =>
                  update((next) => {
                    next.choices[index].conditions = conditions
                  })
                }
              />
            </div>
            <div className="bo-nested">
              <h4>ผลลัพธ์</h4>
              <EffectList
                value={choice.effects}
                eventIds={eventIds}
                onChange={(effects) =>
                  update((next) => {
                    next.choices[index].effects = effects
                  })
                }
              />
            </div>
            <button
              type="button"
              className="bo-text-button bo-danger"
              disabled={event.choices.length === 1}
              onClick={() =>
                update((next) => {
                  next.choices.splice(index, 1)
                })
              }
            >
              ลบตัวเลือก
            </button>
          </div>
        ))}
      </section>
    </div>
  )
}
