import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { V2Content, V2Event } from '../../content/v2/schema'
import { getV2LastRecaps } from '../../engine/v2/game'
import { SceneView } from '../player/SceneView'
import { EventFilterFields } from './EventFilterFields'
import { ListSearch } from './ListSearch'
import { NumberInput } from './NumberInput'
import { periodLabels } from './periodLabels'
import { createV2PreviewSave } from './preview'
import { randomId } from './randomId'
import {
  addChoice,
  addStatDelta,
  editableStatDeltas,
  neighborIndex,
  otherEffectCount,
  proofreadEntries,
  removeChoice,
  removeEffect,
  updateStatDelta,
  withSelectionMode,
  type ProofreadSort,
  type SelectionMode,
} from './proofread'
import { BoDropdown } from './Select'
import {
  allEvents,
  matchesEventFilter,
  matchesStoryQuery,
  usedEventIds,
  type EventFilter,
} from './timelineFilters'
import { v2StatOptions } from './v2StatOptions'

const sortLabels: Record<ProofreadSort, string> = {
  time: 'ตามเวลา (ปีและช่วง)',
  id: 'ตาม ID',
  file: 'ตามลำดับในไฟล์',
}
const noop = () => {}

/**
 * Proofreading view: the Player scene for one event with its lines, choice
 * text, stat changes, and selection mode editable beside it. Edits go to the
 * shared draft, so undo, validation, and saving work as in the event form.
 */
export function ProofreadPanel({
  draft,
  onUpdateEvent,
  onOpenInForm,
}: {
  draft: V2Content
  onUpdateEvent: (index: number, next: V2Event) => void
  onOpenInForm: (index: number) => void
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<EventFilter>(allEvents)
  const [sort, setSort] = useState<ProofreadSort>('time')
  const [selected, setSelected] = useState(-1)
  const [lineIndex, setLineIndex] = useState(0)
  const [editorOpen, setEditorOpen] = useState(true)
  const [listOpen, setListOpen] = useState(true)

  const usedEvents = useMemo(
    () => usedEventIds(draft.flow, draft.events),
    [draft.flow, draft.events],
  )
  const entries = proofreadEntries(draft.events, sort).filter(
    ({ event }) =>
      matchesStoryQuery(event, query) &&
      matchesEventFilter(event, filter, usedEvents),
  )
  const shownIndex = entries.some(({ index }) => index === selected)
    ? selected
    : (entries[0]?.index ?? -1)
  const position = entries.findIndex(({ index }) => index === shownIndex)
  const event = draft.events[shownIndex] as V2Event | undefined
  const previous = neighborIndex(entries, shownIndex, -1)
  const next = neighborIndex(entries, shownIndex, 1)

  function select(index: number) {
    if (index < 0) return
    setSelected(index)
    setLineIndex(0)
  }

  useEffect(() => {
    function onKey(keyEvent: KeyboardEvent) {
      if (keyEvent.key !== 'ArrowLeft' && keyEvent.key !== 'ArrowRight') return
      const target = keyEvent.target as HTMLElement | null
      if (
        target?.closest(
          'input, textarea, select, [contenteditable], [role="listbox"], [role="combobox"]',
        )
      )
        return
      const index = keyEvent.key === 'ArrowLeft' ? previous : next
      if (index < 0) return
      keyEvent.preventDefault()
      setSelected(index)
      setLineIndex(0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previous, next])

  function update(change: (current: V2Event) => V2Event) {
    if (event) onUpdateEvent(shownIndex, change(event))
  }
  function updateLine(
    index: number,
    change: Partial<V2Event['lines'][number]>,
  ) {
    update((current) => ({
      ...current,
      lines: current.lines.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...change } : item,
      ),
    }))
  }
  const sceneAssets = draft.assets.filter((asset) => asset.kind === 'scene')
  const portraitAssets = draft.assets.filter(
    (asset) => asset.kind === 'portrait',
  )

  // The preview treats an inactive event as active so it can still be read.
  const preview = useMemo(() => {
    if (!event) return null
    const content = {
      ...draft,
      events: draft.events.map((item) =>
        item.id === event.id ? { ...item, active: true } : item,
      ),
    }
    try {
      const save = createV2PreviewSave(content, event.id)
      return { save, recaps: getV2LastRecaps(content, save) }
    } catch {
      return null
    }
  }, [draft, event])

  const speakerName = (speakerId?: string) => {
    if (!speakerId)
      return (
        draft.characters.find((item) => item.isNarrator)?.name ?? 'ผู้บรรยาย'
      )
    return (
      draft.characters.find((item) => item.id === speakerId)?.name ?? speakerId
    )
  }
  const selection = event?.selection?.type ?? 'single'
  const fixedSelection = selection === 'program' || selection === 'elective'

  return (
    <div
      className="bo-proofread mt-3"
      data-editor={editorOpen ? 'open' : 'closed'}
      data-list={listOpen || !event ? 'open' : 'closed'}
    >
      <aside
        id="bo-proofread-list"
        className="panel bo-sidebar"
        aria-label="รายการเหตุการณ์"
        hidden={!listOpen && Boolean(event)}
      >
        <div className="bo-section-heading">
          <h2 className="font-extrabold">ตรวจข้อความ</h2>
        </div>
        <ListSearch
          label="ค้นหาเหตุการณ์"
          value={query}
          placeholder="ชื่อ, ID, ข้อความ"
          onChange={setQuery}
        />
        <EventFilterFields
          events={draft.events}
          value={filter}
          onChange={setFilter}
          shown={entries.length}
        />
        <label className="bo-field mt-3">
          <span>เรียงลำดับ</span>
          <BoDropdown
            value={sort}
            onChange={(input) => setSort(input.target.value as ProofreadSort)}
          >
            {(Object.keys(sortLabels) as ProofreadSort[]).map((key) => (
              <option key={key} value={key}>
                {sortLabels[key]}
              </option>
            ))}
          </BoDropdown>
        </label>
        <div className="bo-item-list">
          {entries.map(({ event: item, index }) => (
            <button
              key={index}
              type="button"
              data-selected={index === shownIndex}
              aria-current={index === shownIndex ? 'true' : undefined}
              onClick={() => select(index)}
            >
              <strong>{item.title || 'ไม่มีชื่อ'}</strong>
              <small>
                {item.id} · ปี {item.time.year} {periodLabels[item.time.period]}
                {item.active === false ? ' · ปิดใช้' : ''}
              </small>
            </button>
          ))}
        </div>
        {!entries.length && (
          <p className="muted mt-3 text-sm">ไม่พบรายการที่ค้นหา</p>
        )}
      </aside>

      {event ? (
        <>
          <div className="bo-proofread-nav panel">
            <button
              type="button"
              className="button button-secondary bo-proofread-toggle"
              aria-pressed={listOpen}
              aria-controls="bo-proofread-list"
              onClick={() => setListOpen((open) => !open)}
              title={listOpen ? 'ซ่อนแผงค้นหา' : 'แสดงแผงค้นหา'}
            >
              {listOpen ? (
                <PanelLeftClose aria-hidden="true" size={18} />
              ) : (
                <PanelLeftOpen aria-hidden="true" size={18} />
              )}
              {listOpen ? 'ซ่อนแผงค้นหา' : 'แสดงแผงค้นหา'}
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={previous < 0}
              onClick={() => select(previous)}
              title="กด ← เพื่อไปก่อนหน้า"
            >
              <kbd className="bo-simulation-kbd">←</kbd> ก่อนหน้า
            </button>
            <div className="min-w-0 text-center">
              <p className="truncate font-extrabold">{event.title}</p>
              <p className="muted text-xs">
                {position + 1} / {entries.length} · {event.id}
              </p>
            </div>
            <button
              type="button"
              className="button button-secondary"
              disabled={next < 0}
              onClick={() => select(next)}
              title="กด → เพื่อไปถัดไป"
            >
              ถัดไป <kbd className="bo-simulation-kbd">→</kbd>
            </button>
            <button
              type="button"
              className="button button-secondary bo-proofread-toggle"
              aria-pressed={editorOpen}
              aria-controls="bo-proofread-editor"
              onClick={() => setEditorOpen((open) => !open)}
              title={editorOpen ? 'ซ่อนแผงแก้ไข' : 'แสดงแผงแก้ไข'}
            >
              {editorOpen ? (
                <PanelRightClose aria-hidden="true" size={18} />
              ) : (
                <PanelRightOpen aria-hidden="true" size={18} />
              )}
              {editorOpen ? 'ซ่อนแผงแก้ไข' : 'แสดงแผงแก้ไข'}
            </button>
          </div>

          <div className="bo-proofread-scene">
            {preview ? (
              <SceneView
                key={`${event.id}-${lineIndex}`}
                event={event}
                save={preview.save}
                assets={draft.assets}
                characters={draft.characters}
                faculties={draft.faculties}
                majors={draft.majors}
                electives={draft.electives}
                names={draft.names}
                loanRatePercent={draft.config.loan.annualRatePercent}
                recaps={preview.recaps}
                statModifiers={draft.config.statModifiers}
                error={null}
                initialLineIndex={lineIndex}
                onChoose={noop}
                onChooseMany={noop}
                onChooseProgram={noop}
                onChooseElective={noop}
                onHome={() => onOpenInForm(shownIndex)}
                homeLabel="เปิดในฟอร์ม"
              />
            ) : (
              <p className="bo-error panel p-5" role="alert">
                แสดงตัวอย่างเหตุการณ์นี้ไม่ได้
              </p>
            )}
          </div>

          <section
            id="bo-proofread-editor"
            className="panel bo-proofread-editor bo-stack"
            aria-label="แก้ข้อความและค่าสถานะ"
            hidden={!editorOpen}
          >
            <div className="bo-section-heading">
              <h3 className="font-extrabold">แก้ไข</h3>
              <button
                type="button"
                className="bo-text-button"
                onClick={() => onOpenInForm(shownIndex)}
              >
                เปิดในฟอร์ม
              </button>
            </div>

            <label className="bo-field">
              <span>ชื่อเหตุการณ์</span>
              <input
                className="field"
                value={event.title}
                onChange={(input) =>
                  update((current) => ({
                    ...current,
                    title: input.target.value,
                  }))
                }
              />
            </label>
            <label className="bo-field">
              <span>ภาพฉาก</span>
              <BoDropdown
                value={event.sceneAssetId ?? ''}
                onChange={(input) =>
                  update((current) => ({
                    ...current,
                    sceneAssetId: input.target.value || undefined,
                  }))
                }
              >
                <option value="">ไม่ใช้</option>
                {sceneAssets.map((asset) => (
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
                  update((current) => ({
                    ...current,
                    outfit: (input.target.value || undefined) as
                      V2Event['outfit'] | undefined,
                  }))
                }
              >
                <option value="">ค่าเริ่มต้น (ชุดนักศึกษา)</option>
                <option value="casual">ชุดปกติ</option>
                <option value="student">ชุดนักศึกษา</option>
              </BoDropdown>
            </label>
            {/* <label className="bo-checkbox-field">
              <input
                type="checkbox"
                checked={event.hidePlayer === true}
                onChange={(input) =>
                  update((current) => {
                    const next = { ...current }
                    if (input.target.checked) next.hidePlayer = true
                    else delete next.hidePlayer
                    return next
                  })
                }
              />
              <span>ซ่อนภาพผู้เล่นในฉากนี้</span>
            </label> */}

            <h4 className="font-bold">บทพูด</h4>
            {event.lines.map((line, index) => (
              <div
                key={index}
                className="bo-proofread-line"
                data-current={index === lineIndex || undefined}
              >
                <div className="bo-proofread-line-head">
                  <span className="muted text-xs">
                    {index + 1}. {speakerName(line.speakerId)}
                  </span>
                  <button
                    type="button"
                    className="bo-text-button"
                    onClick={() => setLineIndex(index)}
                  >
                    ดูบรรทัดนี้
                  </button>
                </div>
                <div className="bo-proofread-speaker">
                  <BoDropdown
                    label={`ผู้พูดบรรทัดที่ ${index + 1}`}
                    value={line.speakerId ?? ''}
                    onChange={(input) => {
                      setLineIndex(index)
                      updateLine(index, {
                        speakerId: input.target.value || undefined,
                        // A new speaker shows their own portrait again.
                        portraitAssetId: undefined,
                      })
                    }}
                  >
                    <option value="">ผู้บรรยาย ({speakerName()})</option>
                    {draft.characters
                      .filter((item) => !item.isNarrator)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </BoDropdown>
                  <BoDropdown
                    label={`ภาพผู้พูดบรรทัดที่ ${index + 1}`}
                    value={line.portraitAssetId ?? ''}
                    onChange={(input) => {
                      setLineIndex(index)
                      updateLine(index, {
                        portraitAssetId: input.target.value || undefined,
                      })
                    }}
                  >
                    <option value="">ใช้ภาพของผู้พูด</option>
                    {portraitAssets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.id}
                      </option>
                    ))}
                  </BoDropdown>
                </div>
                <textarea
                  className="field"
                  rows={3}
                  aria-label={`บทพูดบรรทัดที่ ${index + 1}`}
                  value={line.text}
                  onFocus={() => setLineIndex(index)}
                  onChange={(input) =>
                    update((current) => ({
                      ...current,
                      lines: current.lines.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, text: input.target.value }
                          : item,
                      ),
                    }))
                  }
                />
              </div>
            ))}

            <h4 className="font-bold">ตัวเลือก</h4>
            <label className="bo-field">
              <span>วิธีเลือกคำตอบ</span>
              {fixedSelection ? (
                <p className="muted text-sm">
                  {selection === 'program'
                    ? 'เลือกคณะและสาขา'
                    : 'เลือกวิชาเสรี'}{' '}
                  · แก้ในฟอร์มเหตุการณ์
                </p>
              ) : (
                <BoDropdown
                  value={selection}
                  onChange={(input) =>
                    update((current) =>
                      withSelectionMode(
                        current,
                        input.target.value as SelectionMode,
                      ),
                    )
                  }
                >
                  <option value="single">เลือกหนึ่งข้อ</option>
                  <option value="multiple">เลือกหลายข้อ</option>
                </BoDropdown>
              )}
            </label>
            {event.selection?.type === 'multiple' && (
              <div className="bo-proofread-range">
                <label className="bo-field">
                  <span>เลือกอย่างน้อย</span>
                  <NumberInput
                    className="field"
                    integer
                    min={1}
                    value={event.selection.min}
                    onValueChange={(min) =>
                      update((current) =>
                        current.selection?.type === 'multiple'
                          ? {
                              ...current,
                              selection: { ...current.selection, min },
                            }
                          : current,
                      )
                    }
                  />
                </label>
                <label className="bo-field">
                  <span>เลือกได้มากสุด</span>
                  <NumberInput
                    className="field"
                    integer
                    min={1}
                    value={event.selection.max}
                    onValueChange={(max) =>
                      update((current) =>
                        current.selection?.type === 'multiple'
                          ? {
                              ...current,
                              selection: { ...current.selection, max },
                            }
                          : current,
                      )
                    }
                  />
                </label>
              </div>
            )}
            {!fixedSelection && (
              <p className="muted text-xs">
                เปลี่ยนวิธีเลือกแล้ว ต้องต่อเส้นของเหตุการณ์นี้ใน Story Flow
                ใหม่
              </p>
            )}

            {event.choices.map((choice, choiceIndex) => {
              const deltas = editableStatDeltas(choice)
              const others = otherEffectCount(choice)
              const setChoice = (
                change: (
                  current: V2Event['choices'][number],
                ) => V2Event['choices'][number],
              ) =>
                update((current) => ({
                  ...current,
                  choices: current.choices.map((item, itemIndex) =>
                    itemIndex === choiceIndex ? change(item) : item,
                  ),
                }))
              return (
                <div key={choice.id} className="bo-proofread-choice bo-nested">
                  <div className="bo-proofread-line-head">
                    <span className="text-sm">
                      ตัวเลือกที่ {choiceIndex + 1}{' '}
                      <span className="muted">· {choice.id}</span>
                    </span>
                    <button
                      type="button"
                      className="bo-text-button bo-danger"
                      disabled={event.choices.length === 1}
                      onClick={() =>
                        update((current) => removeChoice(current, choiceIndex))
                      }
                    >
                      ลบตัวเลือก
                    </button>
                  </div>
                  <label className="bo-field">
                    <textarea
                      className="field"
                      rows={2}
                      aria-label={`ข้อความตัวเลือกที่ ${choiceIndex + 1}`}
                      value={choice.text}
                      onFocus={() => setLineIndex(event.lines.length - 1)}
                      onChange={(input) =>
                        setChoice((current) => ({
                          ...current,
                          text: input.target.value,
                        }))
                      }
                    />
                  </label>
                  {deltas.map((delta) => (
                    <div key={delta.effectIndex} className="bo-proofread-delta">
                      <BoDropdown
                        label={`ค่าสถานะของตัวเลือกที่ ${choiceIndex + 1}`}
                        value={delta.stat}
                        onChange={(input) =>
                          setChoice((current) =>
                            updateStatDelta(current, delta.effectIndex, {
                              stat: input.target
                                .value as (typeof v2StatOptions)[number]['id'],
                            }),
                          )
                        }
                      >
                        {v2StatOptions.map((stat) => (
                          <option key={stat.id} value={stat.id}>
                            {stat.label}
                          </option>
                        ))}
                      </BoDropdown>
                      <NumberInput
                        className="field"
                        integer
                        aria-label="จำนวนที่เปลี่ยน"
                        value={delta.amount}
                        onValueChange={(amount) =>
                          setChoice((current) =>
                            updateStatDelta(current, delta.effectIndex, {
                              amount,
                            }),
                          )
                        }
                      />
                      {delta.delayed ? (
                        <span className="muted text-xs">ภายหลัง</span>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        className="bo-text-button bo-danger"
                        aria-label="ลบค่าสถานะนี้"
                        title="ลบค่าสถานะนี้"
                        onClick={() =>
                          setChoice((current) =>
                            removeEffect(current, delta.effectIndex),
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="bo-text-button justify-self-start"
                    onClick={() => setChoice(addStatDelta)}
                  >
                    + เพิ่มค่าสถานะ
                  </button>
                  {others > 0 && (
                    <p className="muted text-xs">
                      ผลอื่นอีก {others} รายการ (โอกาสหรือ Flag)
                      แก้ในฟอร์มเหตุการณ์
                    </p>
                  )}
                  {!deltas.length && !others && (
                    <p className="muted text-xs">ไม่มีผลต่อค่าสถานะ</p>
                  )}
                </div>
              )
            })}
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                update((current) =>
                  addChoice(
                    current,
                    randomId(
                      'choice',
                      current.choices.map((item) => item.id),
                    ),
                  ),
                )
              }
            >
              + เพิ่มตัวเลือก
            </button>
            <p className="muted text-xs">
              ตัวเลือกที่เพิ่มหรือลบ ต้องต่อเส้นใน Story Flow ใหม่
            </p>
          </section>
        </>
      ) : (
        <p className="muted panel p-5">ไม่มีเหตุการณ์ให้ตรวจ</p>
      )}
    </div>
  )
}
