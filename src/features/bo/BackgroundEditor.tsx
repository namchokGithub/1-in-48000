import { useState } from 'react'
import type { V2Content } from '../../content/v2/schema'
import { V2_FIXED_BACKGROUND_ID } from '../../engine/v2/game'
import { CopyIdButton } from './CopyIdButton'
import { ListSearch } from './ListSearch'
import { filterOptionIndexes } from './dropdownFilter'
import { idProblem } from './idCheck'
import { randomId } from './randomId'
import { reorder } from './reorder'
import { v2StatOptions } from './v2StatOptions'
import { NumberInput } from './NumberInput'

type Background = V2Content['config']['backgrounds'][number]

const textFields: { key: 'family' | 'personality' | 'skill'; label: string }[] =
  [
    { key: 'family', label: 'ครอบครัว' },
    { key: 'personality', label: 'นิสัย' },
    { key: 'skill', label: 'ทักษะ' },
  ]

export function BackgroundEditor({
  content,
  onChange,
  onDelete,
  initialId,
}: {
  content: V2Content
  onChange: (next: V2Content) => void
  onDelete: (title: string, description: string, action: () => void) => void
  initialId?: string
}) {
  const items = content.config.backgrounds
  const [storedIndex, setIndex] = useState(() =>
    Math.max(
      0,
      items.findIndex((item) => item.id === initialId),
    ),
  )
  const [query, setQuery] = useState('')
  const index = Math.min(storedIndex, Math.max(0, items.length - 1))
  const selected = items[index] as Background | undefined
  const fixed = selected?.id === V2_FIXED_BACKGROUND_ID
  const idError = selected
    ? idProblem(
        selected.id,
        items.filter((item) => item !== selected).map((item) => item.id),
      )
    : null
  const visibleIndexes = filterOptionIndexes(
    items.map((item) => ({ value: item.id, label: item.title })),
    query,
  )

  function setBackgrounds(backgrounds: Background[]) {
    onChange({ ...content, config: { ...content.config, backgrounds } })
  }

  function replace(value: Background) {
    setBackgrounds(items.map((item, at) => (at === index ? value : item)))
  }

  function add() {
    setBackgrounds([
      ...items,
      {
        id: randomId(
          'background',
          items.map((item) => item.id),
        ),
        title: 'พื้นฐานใหม่',
        family: '',
        personality: '',
        skill: '',
        statDeltas: {
          study: 0,
          money: 0,
          health: 0,
          stress: 0,
          relationships: 0,
          debt: 0,
          lucky: 0,
        },
      },
    ])
    setIndex(items.length)
  }

  function move(offset: number) {
    setBackgrounds(reorder(items, index, index + offset))
    setIndex(Math.min(items.length - 1, Math.max(0, index + offset)))
  }

  function remove() {
    if (!selected || fixed) return
    onDelete(
      'ลบพื้นฐานตัวละครจากร่าง?',
      `“${selected.id}” จะถูกนำออกจากร่าง`,
      () => {
        setBackgrounds(items.filter((_, at) => at !== index))
        setIndex(Math.max(0, index - 1))
      },
    )
  }

  return (
    <div className="bo-layout bo-data-layout">
      <aside className="panel bo-sidebar" aria-label="รายการพื้นฐานตัวละคร">
        <div className="bo-section-heading">
          <h2 className="font-extrabold">พื้นฐานตัวละคร</h2>
          <button type="button" className="bo-text-button" onClick={add}>
            + เพิ่ม
          </button>
        </div>
        <p className="muted text-xs">
          หน้าเริ่มเกมแสดง 3 แบบ: {V2_FIXED_BACKGROUND_ID} เป็นแบบแรกเสมอ อีก 2
          แบบสุ่มจากที่เหลือ
        </p>
        <ListSearch
          label="ค้นหาพื้นฐานตัวละคร"
          value={query}
          onChange={setQuery}
        />
        <div className="bo-item-list">
          {visibleIndexes.map((itemIndex) => {
            const item = items[itemIndex]
            return (
              <button
                key={`${item.id}-${itemIndex}`}
                type="button"
                data-selected={itemIndex === index}
                aria-current={itemIndex === index ? 'true' : undefined}
                onClick={() => setIndex(itemIndex)}
              >
                <strong>{item.title}</strong>
                <small>
                  {item.id}
                  {item.id === V2_FIXED_BACKGROUND_ID ? ' · แสดงเสมอ' : ''}
                </small>
              </button>
            )
          })}
        </div>
        {!visibleIndexes.length && (
          <p className="muted mt-3 text-sm">ไม่พบรายการที่ค้นหา</p>
        )}
      </aside>
      <section className="panel bo-editor" aria-label="แก้พื้นฐานตัวละคร">
        {selected ? (
          <div className="bo-stack">
            <div className="bo-section-heading">
              <div>
                <p className="eyebrow">
                  พื้นฐานตัวละคร{fixed ? ' · แสดงเป็นแบบแรกเสมอ' : ''}
                </p>
                <h2 className="text-2xl font-extrabold">{selected.title}</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={index === 0}
                  onClick={() => move(-1)}
                >
                  ↑ ก่อนหน้า
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={index === items.length - 1}
                  onClick={() => move(1)}
                >
                  ↓ ถัดไป
                </button>
                <button
                  type="button"
                  className="button button-danger"
                  disabled={fixed}
                  title={fixed ? 'พื้นฐานนี้ลบไม่ได้' : undefined}
                  onClick={remove}
                >
                  ลบจากร่าง
                </button>
              </div>
            </div>
            <div className="bo-form-grid">
              <div className="bo-field">
                <label htmlFor="bo-background-id">Background ID</label>
                <div className="bo-id-actions">
                  <input
                    id="bo-background-id"
                    className="field"
                    value={selected.id}
                    readOnly={fixed}
                    aria-invalid={!!idError}
                    aria-describedby={
                      idError ? 'bo-background-id-error' : undefined
                    }
                    onChange={(event) =>
                      replace({ ...selected, id: event.target.value })
                    }
                  />
                  {!fixed && (
                    <button
                      type="button"
                      className="button button-secondary"
                      aria-label="สุ่ม ID พื้นฐานตัวละคร"
                      onClick={() =>
                        replace({
                          ...selected,
                          id: randomId(
                            'background',
                            items.map((item) => item.id),
                          ),
                        })
                      }
                    >
                      สุ่ม ID
                    </button>
                  )}
                  <CopyIdButton value={selected.id} label="Background ID" />
                </div>
                {fixed ? (
                  <small className="muted">ID นี้ล็อกไว้ แก้ไม่ได้</small>
                ) : (
                  idError && (
                    <small
                      id="bo-background-id-error"
                      className="bo-field-error"
                    >
                      {idError}
                    </small>
                  )
                )}
              </div>
              <label className="bo-field">
                <span>ชื่อพื้นฐาน</span>
                <input
                  className="field"
                  value={selected.title}
                  onChange={(event) =>
                    replace({ ...selected, title: event.target.value })
                  }
                />
              </label>
              {textFields.map(({ key, label }) => (
                <label key={key} className="bo-field">
                  <span>{label}</span>
                  <input
                    className="field"
                    value={selected[key]}
                    onChange={(event) =>
                      replace({ ...selected, [key]: event.target.value })
                    }
                  />
                </label>
              ))}
            </div>
            <section className="bo-editor-section">
              <h3>ค่าสถานะเริ่มต้นที่เพิ่มหรือลด</h3>
              <div className="bo-form-grid">
                {v2StatOptions.map((stat) => (
                  <label key={stat.id} className="bo-field">
                    <span>{stat.label}</span>
                    <NumberInput
                      key={`${selected.id}:${stat.id}`}
                      className="field"
                      integer
                      step="1"
                      value={selected.statDeltas[stat.id]}
                      onValueChange={(value) =>
                        replace({
                          ...selected,
                          statDeltas: {
                            ...selected.statDeltas,
                            [stat.id]: value,
                          },
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <p className="muted">ยังไม่มีพื้นฐานตัวละคร กดเพิ่มเพื่อเริ่มสร้าง</p>
        )}
      </section>
    </div>
  )
}
