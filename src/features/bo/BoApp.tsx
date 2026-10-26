import { useEffect, useState } from 'react'
import { loadPlayerContent, type PlayerContent } from '../../content/loader'
import { validateContent, type ValidationIssue } from '../../content/validate'
import type { Ending, Event } from '../../content/schema'
import { EndingEditor } from './EndingEditor'
import { EventEditor } from './EventEditor'
import { PreviewPane } from './PreviewPane'

type Section = 'events' | 'endings'

function nextId(base: string, existing: string[]) {
  if (!existing.includes(base)) return base
  let suffix = 2
  while (existing.includes(`${base}_${suffix}`)) suffix += 1
  return `${base}_${suffix}`
}

function responseIssues(body: unknown): ValidationIssue[] {
  if (
    !body ||
    typeof body !== 'object' ||
    !('issues' in body) ||
    !Array.isArray(body.issues)
  )
    return []
  return body.issues.filter(
    (issue): issue is ValidationIssue =>
      issue !== null &&
      typeof issue === 'object' &&
      'path' in issue &&
      typeof issue.path === 'string' &&
      'message' in issue &&
      typeof issue.message === 'string',
  )
}

export function BoApp() {
  const [saved, setSaved] = useState<PlayerContent | null>(null)
  const [draft, setDraft] = useState<PlayerContent | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [section, setSection] = useState<Section>('events')
  const [eventIndex, setEventIndex] = useState(0)
  const [endingIndex, setEndingIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showIssues, setShowIssues] = useState(false)
  const [serverIssues, setServerIssues] = useState<ValidationIssue[]>([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    loadPlayerContent()
      .then((content) => {
        if (!active) return
        setSaved(content)
        setDraft(structuredClone(content))
        setLoadError(false)
      })
      .catch(() => {
        if (active) setLoadError(true)
      })
    return () => {
      active = false
    }
  }, [retry])

  if (loadError) {
    return (
      <main className="app-shell">
        <section className="panel mx-auto max-w-xl p-7" role="alert">
          <h1 className="text-2xl font-extrabold">โหลดเนื้อหา BO ไม่ได้</h1>
          <p className="muted mt-2">
            ตรวจไฟล์ JSON ใน public/content แล้วลองใหม่
          </p>
          <button
            className="button button-primary mt-5"
            type="button"
            onClick={() => setRetry((value) => value + 1)}
          >
            ลองอีกครั้ง
          </button>
        </section>
      </main>
    )
  }
  if (!saved || !draft) {
    return (
      <main className="app-shell">
        <section className="panel mx-auto max-w-xl p-7" role="status">
          กำลังโหลดเนื้อหา BO…
        </section>
      </main>
    )
  }

  const currentDraft = draft

  const issues = validateContent(draft)
  const visibleIssues = serverIssues.length
    ? serverIssues
    : showIssues
      ? issues
      : []
  const dirtyEvents =
    JSON.stringify(draft.events) !== JSON.stringify(saved.events)
  const dirtyEndings =
    JSON.stringify(draft.endings) !== JSON.stringify(saved.endings)
  const dirty = section === 'events' ? dirtyEvents : dirtyEndings
  const event = draft.events[eventIndex]
  const ending = draft.endings[endingIndex]
  const eventIds = draft.events.map((item) => item.id)

  function updateEvent(next: Event) {
    setDraft(
      (current) =>
        current && {
          ...current,
          events: current.events.map((item, index) =>
            index === eventIndex ? next : item,
          ),
        },
    )
    setNotice('')
    setServerIssues([])
  }

  function updateEnding(next: Ending) {
    setDraft(
      (current) =>
        current && {
          ...current,
          endings: current.endings.map((item, index) =>
            index === endingIndex ? next : item,
          ),
        },
    )
    setNotice('')
    setServerIssues([])
  }

  function addEvent() {
    const newEvent: Event = {
      id: nextId('new_event', eventIds),
      kind: 'main',
      time: { year: 1, period: 'term1' },
      title: 'เหตุการณ์ใหม่',
      sceneAssetId: currentDraft.assets.find((asset) => asset.kind === 'scene')
        ?.id,
      bgmAssetId: currentDraft.assets.find((asset) => asset.kind === 'bgm')?.id,
      conditions: [],
      lines: [{ text: 'เขียนบทสนทนา' }],
      choices: [{ id: 'continue', text: 'ต่อไป', conditions: [], effects: [] }],
    }
    setEventIndex(currentDraft.events.length)
    setDraft({ ...currentDraft, events: [...currentDraft.events, newEvent] })
    setSection('events')
    setNotice('')
  }

  function addEnding() {
    const newEnding: Ending = {
      id: nextId(
        'new_ending',
        currentDraft.endings.map((item) => item.id),
      ),
      title: 'ตอนจบใหม่',
      summary: 'เขียนเรื่องสรุป',
      conditions: [{ type: 'flag', flagId: 'new_ending_ready', value: true }],
    }
    setEndingIndex(currentDraft.endings.length)
    setDraft({ ...currentDraft, endings: [...currentDraft.endings, newEnding] })
    setSection('endings')
    setNotice('')
  }

  function moveSelected(direction: -1 | 1) {
    if (section === 'events') {
      const target = eventIndex + direction
      if (target < 0 || target >= currentDraft.events.length) return
      const events = [...currentDraft.events]
      const selected = events[eventIndex]
      events[eventIndex] = events[target]
      events[target] = selected
      setDraft({ ...currentDraft, events })
      setEventIndex(target)
    } else {
      const target = endingIndex + direction
      if (target < 0 || target >= currentDraft.endings.length) return
      const endings = [...currentDraft.endings]
      const selected = endings[endingIndex]
      endings[endingIndex] = endings[target]
      endings[target] = selected
      setDraft({ ...currentDraft, endings })
      setEndingIndex(target)
    }
    setNotice('')
  }

  async function saveFile(file: Section) {
    setShowIssues(true)
    setServerIssues([])
    setNotice('')
    if (issues.length) return
    setSaving(true)
    try {
      const response = await fetch(`/__bo/content/${file}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentDraft[file]),
      })
      if (!response.ok) {
        const body: unknown = await response.json()
        const found = responseIssues(body)
        if (found.length) setServerIssues(found)
        else setNotice('บันทึกไม่ได้ โปรดตรวจ dev server แล้วลองอีกครั้ง')
        return
      }
      setSaved(
        (current) =>
          current && {
            ...current,
            [file]: structuredClone(currentDraft[file]),
          },
      )
      setShowIssues(false)
      setNotice(file === 'events' ? 'บันทึกเหตุการณ์แล้ว' : 'บันทึกตอนจบแล้ว')
    } catch {
      setNotice('ติดต่อ dev server ไม่ได้ โปรดลองอีกครั้ง')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="app-shell">
      <div className="app-wrap bo-wrap">
        <header className="bo-header">
          <div>
            <p className="eyebrow">เครื่องมือบนเครื่องผู้เขียน</p>
            <h1 className="text-3xl font-extrabold">BO · 1 ใน 48,000</h1>
            <p className="muted text-sm">
              Content {draft.config.contentVersion} · แก้ JSON
              โดยตรงหลังตรวจข้อมูล
            </p>
          </div>
          <div className="bo-header-actions">
            <span className="bo-status">
              {dirtyEvents || dirtyEndings
                ? 'มีร่างที่ยังไม่บันทึก'
                : 'บันทึกแล้ว'}
            </span>
            <button
              type="button"
              className="button button-primary"
              disabled={!dirty || saving}
              onClick={() => saveFile(section)}
            >
              {saving
                ? 'กำลังบันทึก…'
                : `บันทึก${section === 'events' ? 'เหตุการณ์' : 'ตอนจบ'}`}
            </button>
          </div>
        </header>
        <nav className="bo-tabs" aria-label="ชนิดเนื้อหา">
          <button
            aria-pressed={section === 'events'}
            type="button"
            onClick={() => setSection('events')}
          >
            เหตุการณ์ {draft.events.length}
            {dirtyEvents ? ' •' : ''}
          </button>
          <button
            aria-pressed={section === 'endings'}
            type="button"
            onClick={() => setSection('endings')}
          >
            ตอนจบ {draft.endings.length}
            {dirtyEndings ? ' •' : ''}
          </button>
        </nav>
        {notice && (
          <p
            className="bo-notice"
            role={notice.includes('ไม่ได้') ? 'alert' : 'status'}
          >
            {notice}
          </p>
        )}
        {visibleIssues.length > 0 && (
          <section className="bo-issues panel" role="alert">
            <h2 className="font-extrabold">
              ต้องแก้ {visibleIssues.length} จุดก่อนบันทึก
            </h2>
            <ul>
              {visibleIssues.map((issue, index) => (
                <li key={`${issue.path}-${index}`}>
                  <code>{issue.path}</code> — {issue.message}
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="bo-layout">
          <aside
            className="panel bo-sidebar"
            aria-label={
              section === 'events' ? 'รายการเหตุการณ์' : 'รายการตอนจบ'
            }
          >
            <div className="bo-section-heading">
              <h2 className="font-extrabold">
                {section === 'events' ? 'เหตุการณ์' : 'ตอนจบ'}
              </h2>
              <button
                type="button"
                className="bo-text-button"
                onClick={section === 'events' ? addEvent : addEnding}
              >
                + เพิ่ม
              </button>
            </div>
            <div className="bo-item-list">
              {section === 'events'
                ? draft.events.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      data-selected={index === eventIndex}
                      aria-current={index === eventIndex ? 'true' : undefined}
                      onClick={() => setEventIndex(index)}
                    >
                      <strong>{item.title || 'ไม่มีชื่อ'}</strong>
                      <small>
                        {item.id} · ปี {item.time.year} {item.time.period}
                      </small>
                    </button>
                  ))
                : draft.endings.map((item, index) => (
                    <button
                      key={index}
                      type="button"
                      data-selected={index === endingIndex}
                      aria-current={index === endingIndex ? 'true' : undefined}
                      onClick={() => setEndingIndex(index)}
                    >
                      <strong>{item.title || 'ไม่มีชื่อ'}</strong>
                      <small>{item.id}</small>
                    </button>
                  ))}
            </div>
          </aside>
          <section className="panel bo-editor" aria-label="แก้เนื้อหา">
            {((event && section === 'events') ||
              (ending && section === 'endings')) && (
              <div className="bo-order-actions" aria-label="ลำดับในไฟล์">
                <span className="muted text-xs">
                  ลำดับในไฟล์กำหนดการเลือกเหตุการณ์และตอนจบ
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={
                      (section === 'events' ? eventIndex : endingIndex) === 0
                    }
                    onClick={() => moveSelected(-1)}
                  >
                    ↑ ก่อนหน้า
                  </button>
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={
                      section === 'events'
                        ? eventIndex === draft.events.length - 1
                        : endingIndex === draft.endings.length - 1
                    }
                    onClick={() => moveSelected(1)}
                  >
                    ↓ ถัดไป
                  </button>
                </div>
              </div>
            )}
            {section === 'events' ? (
              event ? (
                <EventEditor
                  event={event}
                  assets={draft.assets}
                  characters={draft.characters}
                  eventIds={eventIds}
                  onChange={updateEvent}
                  onDelete={() => {
                    setDraft({
                      ...draft,
                      events: draft.events.filter(
                        (_, index) => index !== eventIndex,
                      ),
                    })
                    setEventIndex(Math.max(0, eventIndex - 1))
                    setNotice('')
                  }}
                />
              ) : (
                <p className="muted">
                  ยังไม่มีเหตุการณ์ กดเพิ่มเพื่อเริ่มเขียน
                </p>
              )
            ) : ending ? (
              <EndingEditor
                ending={ending}
                eventIds={eventIds}
                onChange={updateEnding}
                onDelete={() => {
                  setDraft({
                    ...draft,
                    endings: draft.endings.filter(
                      (_, index) => index !== endingIndex,
                    ),
                  })
                  setEndingIndex(Math.max(0, endingIndex - 1))
                  setNotice('')
                }}
              />
            ) : (
              <p className="muted">ยังไม่มีตอนจบ กดเพิ่มเพื่อเริ่มเขียน</p>
            )}
          </section>
          {section === 'events' && event && (
            <PreviewPane key={eventIndex} content={draft} event={event} />
          )}
        </div>
      </div>
    </main>
  )
}
