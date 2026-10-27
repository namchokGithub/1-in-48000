import { useState } from 'react'
import type { PlayerContent } from '../../content/loader'
import type { Asset, Character } from '../../content/schema'
import { BoDropdown } from './Select'
import { randomId } from './randomId'

export type DataSection = 'speakers' | 'backgrounds' | 'sounds'

const labels: Record<DataSection, string> = {
  speakers: 'ผู้พูด',
  backgrounds: 'ภาพฉาก',
  sounds: 'เสียง',
}

export function DataEditor({
  section,
  content,
  onChange,
  onDelete,
}: {
  section: DataSection
  content: PlayerContent
  onChange: (next: PlayerContent) => void
  onDelete: (title: string, description: string, action: () => void) => void
}) {
  const [storedIndex, setIndex] = useState(0)
  const items =
    section === 'speakers'
      ? content.characters
      : content.assets.filter((asset) =>
          section === 'backgrounds'
            ? asset.kind === 'scene'
            : asset.kind === 'bgm' || asset.kind === 'sfx',
        )
  const index = Math.min(storedIndex, Math.max(0, items.length - 1))
  const selected = items[index]
  const file = section === 'speakers' ? 'characters' : 'assets'

  function replace(value: Character | Asset) {
    const next = structuredClone(content)
    if (file === 'characters') {
      next.characters[index] = value as Character
    } else {
      next.assets[content.assets.indexOf(selected as Asset)] = value as Asset
    }
    onChange(next)
  }

  function add() {
    const next = structuredClone(content)
    if (section === 'speakers') {
      next.characters.push({
        id: randomId(
          'speaker',
          next.characters.map((item) => item.id),
        ),
        name: 'ผู้พูดใหม่',
      })
    } else {
      const kind = section === 'backgrounds' ? 'scene' : 'bgm'
      next.assets.push({
        id: randomId(
          kind,
          next.assets.map((item) => item.id),
        ),
        kind,
        path: '',
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
        if (file === 'characters') next.characters.splice(index, 1)
        else next.assets.splice(content.assets.indexOf(selected as Asset), 1)
        setIndex(Math.max(0, index - 1))
        onChange(next)
      },
    )
  }

  const asset = file === 'assets' ? (selected as Asset | undefined) : undefined
  const speaker =
    file === 'characters' ? (selected as Character | undefined) : undefined

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
              <strong>{'name' in item ? item.name : item.id}</strong>
              <small>
                {item.id}
                {'kind' in item ? ` · ${item.kind.toUpperCase()}` : ''}
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
                <h2 className="text-2xl font-extrabold">
                  {speaker?.name || selected.id}
                </h2>
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
                <label htmlFor="bo-data-id">
                  {section === 'speakers' ? 'Speaker ID' : 'Asset ID'}
                </label>
                <div className="bo-id-actions">
                  <input
                    id="bo-data-id"
                    className="field"
                    value={selected.id}
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
                          section === 'speakers'
                            ? 'speaker'
                            : section === 'backgrounds'
                              ? 'scene'
                              : 'sound',
                          items.map((item) => item.id),
                        ),
                      })
                    }
                  >
                    สุ่ม ID
                  </button>
                </div>
              </div>
              {speaker ? (
                <>
                  <label className="bo-field">
                    <span>ชื่อผู้พูด</span>
                    <input
                      className="field"
                      value={speaker.name}
                      onChange={(event) =>
                        replace({ ...speaker, name: event.target.value })
                      }
                    />
                  </label>
                  <label className="bo-field">
                    <span>ภาพตัวละคร</span>
                    <BoDropdown
                      value={speaker.portraitAssetId ?? ''}
                      onChange={(event) =>
                        replace({
                          ...speaker,
                          portraitAssetId: event.target.value || undefined,
                        })
                      }
                    >
                      <option value="">ไม่ใช้ภาพ</option>
                      {content.assets
                        .filter((item) => item.kind === 'portrait')
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.id}
                          </option>
                        ))}
                    </BoDropdown>
                  </label>
                </>
              ) : asset ? (
                <>
                  {section === 'sounds' && (
                    <label className="bo-field">
                      <span>ชนิดเสียง</span>
                      <BoDropdown
                        value={asset.kind}
                        onChange={(event) =>
                          replace({
                            ...asset,
                            kind: event.target.value as 'bgm' | 'sfx',
                          })
                        }
                      >
                        <option value="bgm">เพลง (BGM)</option>
                        <option value="sfx">เอฟเฟกต์ (SFX)</option>
                      </BoDropdown>
                    </label>
                  )}
                  <label className="bo-field">
                    <span>ที่อยู่ไฟล์ใน public/assets</span>
                    <input
                      className="field"
                      value={asset.path}
                      placeholder={
                        asset.kind === 'scene'
                          ? '/assets/scene/example.png'
                          : '/assets/sound/example.mp3'
                      }
                      onChange={(event) =>
                        replace({ ...asset, path: event.target.value })
                      }
                    />
                  </label>
                </>
              ) : null}
            </div>
            {asset?.kind === 'scene' && asset.path.startsWith('/assets/') && (
              <img
                className="bo-asset-preview"
                src={asset.path}
                alt={`ตัวอย่างภาพฉาก ${asset.id}`}
              />
            )}
            {asset && (
              <p className="muted text-sm">
                วางไฟล์จริงใน public/assets ก่อนบันทึก BO จะตรวจว่าไฟล์มีอยู่
              </p>
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
