import { useState } from 'react'
import { CopyIdButton } from './CopyIdButton'
import {
  v2IdSchema,
  type V2Content,
  type V2Outfit,
} from '../../content/v2/schema'
import { BoDropdown } from './Select'
import { StateEffectList } from './V2EffectList'
import { randomId } from './randomId'

export type CatalogSection = 'faculties' | 'majors' | 'electives' | 'names'

const outfits: { outfit: V2Outfit; label: string }[] = [
  { outfit: 'casual', label: 'ชุดปกติ' },
  { outfit: 'student', label: 'ชุดนักศึกษา' },
]

const labels: Record<CatalogSection, string> = {
  faculties: 'คณะ',
  majors: 'สาขา',
  electives: 'วิชาเสรี',
  names: 'ชื่อผู้เล่น',
}

type CatalogItem =
  | V2Content['faculties'][number]
  | V2Content['majors'][number]
  | V2Content['electives'][number]
  | V2Content['names'][number]

export function CatalogEditor({
  section,
  content,
  onChange,
  onDelete,
  initialId,
}: {
  section: CatalogSection
  content: V2Content
  onChange: (next: V2Content) => void
  onDelete: (title: string, description: string, action: () => void) => void
  initialId?: string
}) {
  const items = content[section]
  const [storedIndex, setIndex] = useState(() =>
    Math.max(
      0,
      items.findIndex((item) => item.id === initialId),
    ),
  )
  const index = Math.min(storedIndex, Math.max(0, items.length - 1))
  const selected = items[index] as CatalogItem | undefined

  function replace(value: CatalogItem) {
    const next = structuredClone(content)
    if (section === 'faculties')
      next.faculties[index] = value as V2Content['faculties'][number]
    if (section === 'majors')
      next.majors[index] = value as V2Content['majors'][number]
    if (section === 'electives')
      next.electives[index] = value as V2Content['electives'][number]
    if (section === 'names')
      next.names[index] = value as V2Content['names'][number]
    onChange(next)
  }

  function add() {
    const next = structuredClone(content)
    if (section === 'faculties')
      next.faculties.push({
        id: randomId(
          'faculty',
          next.faculties.map((item) => item.id),
        ),
        name: 'คณะใหม่',
        supportsSixYear: false,
      })
    if (section === 'majors')
      next.majors.push({
        id: randomId(
          'major',
          next.majors.map((item) => item.id),
        ),
        facultyId: next.faculties[0]?.id ?? '',
        name: 'สาขาใหม่',
        programYears: 4,
      })
    if (section === 'electives')
      next.electives.push({
        id: randomId(
          'elective',
          next.electives.map((item) => item.id),
        ),
        name: 'วิชาเสรีใหม่',
        effects: [],
      })
    if (section === 'names') {
      const existing = new Set(next.names.map((item) => item.name))
      let name = 'ชื่อใหม่'
      let suffix = 2
      while (existing.has(name)) name = `ชื่อใหม่ ${suffix++}`
      next.names.push({
        id: randomId(
          'name',
          next.names.map((item) => item.id),
        ),
        name,
      })
    }
    setIndex(items.length)
    onChange(next)
  }

  function remove() {
    if (!selected) return
    onDelete(
      `ลบ${labels[section]}จากร่าง?`,
      `“${selected.id}” จะถูกนำออกจากร่าง รายการที่อ้างอิง ID นี้ต้องแก้ก่อนบันทึก`,
      () => {
        const next = structuredClone(content)
        next[section].splice(index, 1)
        setIndex(Math.max(0, index - 1))
        onChange(next)
      },
    )
  }

  const faculty = section === 'faculties' ? content.faculties[index] : undefined
  const major = section === 'majors' ? content.majors[index] : undefined
  const elective =
    section === 'electives' ? content.electives[index] : undefined
  const playerName = section === 'names' ? content.names[index] : undefined
  const portraits = outfits.flatMap(({ outfit, label }) => {
    const asset = content.assets.find(
      (item) =>
        item.id === playerName?.portraits?.[outfit] && item.kind === 'portrait',
    )
    return asset ? [{ outfit, label, path: asset.path }] : []
  })

  return (
    <div className="bo-layout bo-data-layout">
      <aside
        className="panel bo-sidebar"
        aria-label={`รายการ${labels[section]}`}
      >
        <div className="bo-section-heading">
          <h2 className="font-extrabold">{labels[section]}</h2>
          <button type="button" className="bo-text-button" onClick={add}>
            + เพิ่ม
          </button>
        </div>
        <div className="bo-item-list">
          {items.map((item, itemIndex) => (
            <button
              key={`${item.id}-${itemIndex}`}
              type="button"
              data-selected={itemIndex === index}
              aria-current={itemIndex === index ? 'true' : undefined}
              onClick={() => setIndex(itemIndex)}
            >
              <strong>{item.name}</strong>
              <small>
                {item.id}
                {'programYears' in item ? ` · ${item.programYears} ปี` : ''}
              </small>
            </button>
          ))}
        </div>
      </aside>
      <section className="panel bo-editor" aria-label={`แก้${labels[section]}`}>
        {selected ? (
          <div className="bo-stack">
            <div className="bo-section-heading">
              <div>
                <p className="eyebrow">{labels[section]}</p>
                <h2 className="text-2xl font-extrabold">{selected.name}</h2>
              </div>
              <button
                type="button"
                className="button button-danger"
                onClick={remove}
              >
                ลบจากร่าง
              </button>
            </div>
            <div className="bo-form-grid">
              <div className="bo-field">
                <label htmlFor="bo-catalog-id">{labels[section]} ID</label>
                <div className="bo-id-actions">
                  <input
                    id="bo-catalog-id"
                    className="field"
                    value={selected.id}
                    aria-invalid={!v2IdSchema.safeParse(selected.id).success}
                    onChange={(event) =>
                      replace({ ...selected, id: event.target.value })
                    }
                  />
                  <button
                    type="button"
                    className="button button-secondary"
                    aria-label={`สุ่ม ID ${labels[section]}`}
                    onClick={() =>
                      replace({
                        ...selected,
                        id: randomId(
                          section === 'faculties'
                            ? 'faculty'
                            : section === 'majors'
                              ? 'major'
                              : section === 'electives'
                                ? 'elective'
                                : 'name',
                          items.map((item) => item.id),
                        ),
                      })
                    }
                  >
                    สุ่ม ID
                  </button>
                  <CopyIdButton
                    value={selected.id}
                    label={`ID ${labels[section]}`}
                  />
                </div>
                {!v2IdSchema.safeParse(selected.id).success && (
                  <small className="bo-field-error">
                    ID ต้องขึ้นต้นด้วยตัวพิมพ์เล็ก และใช้ได้เฉพาะ a–z, 0–9, _
                    หรือ -
                  </small>
                )}
              </div>
              <label className="bo-field">
                <span>ชื่อ{labels[section]}</span>
                <input
                  className="field"
                  value={selected.name}
                  onChange={(event) =>
                    replace({ ...selected, name: event.target.value })
                  }
                />
              </label>
              {faculty && (
                <label className="bo-checkbox-field">
                  <input
                    type="checkbox"
                    checked={faculty.supportsSixYear}
                    onChange={(event) =>
                      replace({
                        ...faculty,
                        supportsSixYear: event.target.checked,
                      })
                    }
                  />
                  <span>รองรับหลักสูตร 6 ปี</span>
                </label>
              )}
              {major && (
                <>
                  <label className="bo-field">
                    <span>คณะ</span>
                    <BoDropdown
                      value={major.facultyId}
                      onChange={(event) =>
                        replace({ ...major, facultyId: event.target.value })
                      }
                    >
                      {content.faculties.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </BoDropdown>
                  </label>
                  <label className="bo-field">
                    <span>ระยะเวลาหลักสูตร</span>
                    <BoDropdown
                      value={String(major.programYears)}
                      onChange={(event) =>
                        replace({
                          ...major,
                          programYears: Number(event.target.value) as 4 | 6,
                        })
                      }
                    >
                      <option value="4">4 ปี</option>
                      <option value="6">6 ปี</option>
                    </BoDropdown>
                  </label>
                </>
              )}
              {playerName &&
                outfits.map(({ outfit, label }) => (
                  <label key={outfit} className="bo-field">
                    <span>ภาพผู้เล่น{label}</span>
                    <BoDropdown
                      value={playerName.portraits?.[outfit] ?? ''}
                      onChange={(event) => {
                        const next = {
                          ...playerName.portraits,
                          [outfit]: event.target.value || undefined,
                        }
                        replace({
                          ...playerName,
                          portraits:
                            next.casual || next.student ? next : undefined,
                        })
                      }}
                    >
                      <option value="">ไม่ใช้ภาพ</option>
                      {content.assets
                        .filter((asset) => asset.kind === 'portrait')
                        .map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.id}
                          </option>
                        ))}
                    </BoDropdown>
                  </label>
                ))}
            </div>
            {major?.programYears === 6 &&
              !content.faculties.find(
                (item) => item.id === major.facultyId && item.supportsSixYear,
              ) && (
                <p className="bo-field-error">
                  คณะที่เลือกต้องรองรับหลักสูตร 6 ปีก่อนบันทึก
                </p>
              )}
            {portraits.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {portraits.map(({ outfit, label, path }) => (
                  <img
                    key={outfit}
                    className="bo-asset-preview"
                    src={path}
                    alt={`ตัวอย่างภาพผู้เล่น ${playerName?.name} ${label}`}
                  />
                ))}
              </div>
            )}
            {elective && (
              <StateEffectList
                label="ผลลัพธ์เมื่อเลือกวิชาเสรี"
                value={elective.effects}
                onChange={(effects) => replace({ ...elective, effects })}
              />
            )}
          </div>
        ) : (
          <p className="muted">
            ยังไม่มี{labels[section]} กดเพิ่มเพื่อเริ่มสร้าง
          </p>
        )}
      </section>
    </div>
  )
}
