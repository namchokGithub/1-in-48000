import { useEffect, useState, type SetStateAction } from 'react'
import { loadV2Content } from '../../content/v2/loader'
import {
  v2ContentSchema,
  type V2Content,
  type V2Event,
} from '../../content/v2/schema'
import { V2EndingEditor } from './V2EndingEditor'
import { V2EventEditor } from './V2EventEditor'
import { PreviewDialog } from './PreviewDialog'
import { TimelineBoard } from './TimelineBoard'
import { ConfirmationDialog } from './ConfirmationDialog'
import {
  commitHistory,
  createHistory,
  redoHistory,
  undoHistory,
  type DraftHistory,
} from './draftHistory'
import { moveEvent } from './timeline'
import { neighboringStoryIndex, orderedStoryEntries } from './storyVisibility'
import { matchesStoryQuery } from './timelineFilters'
import { DataEditor, type DataSection } from './DataEditor'

type Section = 'events' | 'endings' | DataSection
type EditableFile = 'events' | 'endings' | 'characters' | 'assets'
type ValidationIssue = { path: string; message: string }

function sectionFromUrl(): Section {
  const tab = new URLSearchParams(window.location.search).get('tab')
  if (
    tab === 'endings' ||
    tab === 'speakers' ||
    tab === 'backgrounds' ||
    tab === 'sounds'
  ) {
    return tab
  }
  return 'events'
}

function sectionFile(section: Section): EditableFile {
  if (section === 'speakers') return 'characters'
  if (section === 'backgrounds' || section === 'sounds') return 'assets'
  return section
}

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
  const [saved, setSaved] = useState<V2Content | null>(null)
  const [history, setHistory] = useState<DraftHistory<V2Content> | null>(null)
  const draft = history?.present ?? null
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [section, setSection] = useState<Section>(sectionFromUrl)
  const [eventView, setEventView] = useState<'editor' | 'timeline'>('editor')
  const [eventQuery, setEventQuery] = useState('')
  const [storedEventIndex, setEventIndex] = useState(0)
  const [storedEndingIndex, setEndingIndex] = useState(0)
  const eventIndex = draft
    ? Math.min(storedEventIndex, Math.max(0, draft.events.length - 1))
    : storedEventIndex
  const endingIndex = draft
    ? Math.min(storedEndingIndex, Math.max(0, draft.endings.length - 1))
    : storedEndingIndex
  const [saving, setSaving] = useState(false)
  const [showIssues, setShowIssues] = useState(false)
  const [serverIssues, setServerIssues] = useState<ValidationIssue[]>([])
  const [notice, setNotice] = useState('')
  const [confirmation, setConfirmation] = useState<{
    title: string
    description: string
    confirmLabel: string
    action: () => void
  } | null>(null)
  const [previewEventId, setPreviewEventId] = useState<string | null>(null)

  function setDraft(change: SetStateAction<V2Content | null>) {
    setHistory((current) => {
      const previous = current?.present ?? null
      const next = typeof change === 'function' ? change(previous) : change
      if (!next) return null
      return current ? commitHistory(current, next) : createHistory(next)
    })
  }

  function selectSection(next: Section) {
    const url = new URL(window.location.href)
    if (next === 'events') url.searchParams.delete('tab')
    else url.searchParams.set('tab', next)
    window.history.replaceState(window.history.state, '', url)
    setSection(next)
  }

  useEffect(() => {
    let active = true
    loadV2Content()
      .then((content) => {
        if (!active) return
        setSaved(content)
        setHistory(createHistory(structuredClone(content)))
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

  const checked = v2ContentSchema.safeParse(draft)
  const issues: ValidationIssue[] = checked.success
    ? []
    : checked.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }))
  const visibleIssues = serverIssues.length
    ? serverIssues
    : showIssues
      ? issues
      : []
  const dirtyEvents =
    JSON.stringify(draft.events) !== JSON.stringify(saved.events)
  const dirtyEndings =
    JSON.stringify(draft.endings) !== JSON.stringify(saved.endings)
  const dirtyCharacters =
    JSON.stringify(draft.characters) !== JSON.stringify(saved.characters)
  const dirtyAssets =
    JSON.stringify(draft.assets) !== JSON.stringify(saved.assets)
  const file = sectionFile(section)
  const dirty =
    file === 'events'
      ? dirtyEvents
      : file === 'endings'
        ? dirtyEndings
        : file === 'characters'
          ? dirtyCharacters
          : dirtyAssets
  const event = draft.events[eventIndex]
  const ending = draft.endings[endingIndex]
  const eventIds = draft.events.map((item) => item.id)
  const visibleEventEntries = orderedStoryEntries(draft.events).filter(
    ({ event: item }) => matchesStoryQuery(item, eventQuery),
  )

  function updateEvent(next: V2Event) {
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

  function updateEnding(next: V2Content['endings'][number]) {
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
    const newEvent: V2Event = {
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
    selectSection('events')
    setEventView('editor')
    setEventQuery('')
    setNotice('')
  }

  function addEnding() {
    const newEnding: V2Content['endings'][number] = {
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
    selectSection('endings')
    setNotice('')
  }

  function moveSelected(direction: -1 | 1) {
    if (section === 'events') {
      const target = neighboringStoryIndex(
        currentDraft.events,
        eventIndex,
        direction,
      )
      if (target < 0) return
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

  function moveOnTimeline(id: string, time: V2Event['time'], index: number) {
    const events = moveEvent(currentDraft.events, id, time, index)
    setDraft({ ...currentDraft, events })
    setEventIndex(events.findIndex((event) => event.id === id))
    setNotice('')
    setServerIssues([])
  }

  function undoDraft() {
    setHistory((current) => (current ? undoHistory(current) : null))
    setNotice('')
    setServerIssues([])
  }

  function redoDraft() {
    setHistory((current) => (current ? redoHistory(current) : null))
    setNotice('')
    setServerIssues([])
  }

  async function saveFile(file: EditableFile) {
    setShowIssues(true)
    setServerIssues([])
    setNotice('')
    if (issues.length) return
    setSaving(true)
    try {
      const response = await fetch(`/__bo/v2/content/${file}`, {
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
      const name = {
        events: 'เหตุการณ์',
        endings: 'ตอนจบ',
        characters: 'ผู้พูด',
        assets: 'Asset',
      }[file]
      setNotice(`บันทึก${name}แล้ว`)
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
        </header>
        <div className="bo-toolbar" role="toolbar" aria-label="เครื่องมือแก้ไข">
          <span className="bo-status" role="status">
            {dirtyEvents || dirtyEndings || dirtyCharacters || dirtyAssets
              ? 'มีร่างที่ยังไม่บันทึก'
              : 'บันทึกแล้ว'}
          </span>
          <div className="bo-toolbar-actions">
            <button
              type="button"
              className="button button-secondary"
              disabled={!history?.past.length || saving}
              onClick={undoDraft}
            >
              เลิกทำ
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={!history?.future.length || saving}
              onClick={redoDraft}
            >
              ทำซ้ำ
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={section !== 'events' || !event}
              onClick={() => event && setPreviewEventId(event.id)}
            >
              ทดลองเหตุการณ์
            </button>
            <button
              type="button"
              className="button button-primary"
              disabled={!dirty || saving}
              onClick={() => saveFile(file)}
            >
              {saving
                ? 'กำลังบันทึก…'
                : `บันทึก${section === 'events' ? 'เหตุการณ์' : section === 'endings' ? 'ตอนจบ' : section === 'speakers' ? 'ผู้พูด' : section === 'backgrounds' ? 'ภาพฉาก' : 'เสียง'}`}
            </button>
          </div>
        </div>
        <nav className="bo-tabs" aria-label="ชนิดเนื้อหา">
          <button
            aria-pressed={section === 'events'}
            type="button"
            onClick={() => selectSection('events')}
          >
            เหตุการณ์ {draft.events.length}
            {dirtyEvents ? ' •' : ''}
          </button>
          <button
            aria-pressed={section === 'endings'}
            type="button"
            onClick={() => selectSection('endings')}
          >
            ตอนจบ {draft.endings.length}
            {dirtyEndings ? ' •' : ''}
          </button>
          <button
            aria-pressed={section === 'speakers'}
            type="button"
            onClick={() => selectSection('speakers')}
          >
            ผู้พูด {draft.characters.length}
            {dirtyCharacters ? ' •' : ''}
          </button>
          <button
            aria-pressed={section === 'backgrounds'}
            type="button"
            onClick={() => selectSection('backgrounds')}
          >
            ภาพฉาก{' '}
            {draft.assets.filter((asset) => asset.kind === 'scene').length}
            {dirtyAssets ? ' •' : ''}
          </button>
          <button
            aria-pressed={section === 'sounds'}
            type="button"
            onClick={() => selectSection('sounds')}
          >
            เสียง{' '}
            {
              draft.assets.filter(
                (asset) => asset.kind === 'bgm' || asset.kind === 'sfx',
              ).length
            }
            {dirtyAssets ? ' •' : ''}
          </button>
        </nav>
        {section === 'events' && (
          <div className="bo-events-tools">
            <div className="bo-view-switch" aria-label="มุมมองเหตุการณ์">
              <button
                type="button"
                className="button button-secondary"
                aria-pressed={eventView === 'editor'}
                onClick={() => setEventView('editor')}
              >
                ฟอร์มแก้ไข
              </button>
              <button
                type="button"
                className="button button-secondary"
                aria-pressed={eventView === 'timeline'}
                onClick={() => setEventView('timeline')}
              >
                Timeline
              </button>
            </div>
            <label className="bo-event-search">
              <span>ค้นหาเหตุการณ์</span>
              <input
                className="field"
                type="search"
                value={eventQuery}
                placeholder="ชื่อ, ID หรือข้อความในเรื่อง"
                onChange={(input) => {
                  const next = input.target.value
                  setEventQuery(next)
                  if (!event || matchesStoryQuery(event, next)) return
                  const first = orderedStoryEntries(draft.events).find(
                    ({ event: item }) => matchesStoryQuery(item, next),
                  )
                  if (first) setEventIndex(first.index)
                }}
              />
            </label>
          </div>
        )}
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
        {section === 'speakers' ||
        section === 'backgrounds' ||
        section === 'sounds' ? (
          <DataEditor
            key={section}
            section={section}
            content={draft}
            onChange={(next) => {
              setDraft(next)
              setNotice('')
              setServerIssues([])
            }}
            onDelete={(title, description, action) =>
              setConfirmation({
                title,
                description,
                confirmLabel: 'ลบจากร่าง',
                action,
              })
            }
          />
        ) : section === 'events' && eventView === 'timeline' ? (
          <TimelineBoard
            events={draft.events}
            query={eventQuery}
            onSelect={(index) => {
              setEventIndex(index)
              setEventView('editor')
            }}
            onMove={moveOnTimeline}
            onPreview={(index) => setPreviewEventId(draft.events[index].id)}
          />
        ) : (
          <div className="bo-layout mt-3">
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
                  ? visibleEventEntries.map(({ event: item, index }) => (
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
                          {item.active === false ? ' · Inactive' : ''}
                        </small>
                      </button>
                    ))
                  : draft.endings.map((item, index) => (
                      <button
                        key={index}
                        type="button"
                        data-selected={index === endingIndex}
                        aria-current={
                          index === endingIndex ? 'true' : undefined
                        }
                        onClick={() => setEndingIndex(index)}
                      >
                        <strong>{item.title || 'ไม่มีชื่อ'}</strong>
                        <small>{item.id}</small>
                      </button>
                    ))}
              </div>
              {section === 'events' && !visibleEventEntries.length && (
                <p className="muted mt-3 text-sm">ไม่พบเหตุการณ์ที่ค้นหา</p>
              )}
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
                        section === 'events'
                          ? neighboringStoryIndex(
                              draft.events,
                              eventIndex,
                              -1,
                            ) < 0
                          : endingIndex === 0
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
                          ? neighboringStoryIndex(draft.events, eventIndex, 1) <
                            0
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
                  <V2EventEditor
                    event={event}
                    assets={draft.assets}
                    characters={draft.characters}
                    eventIds={eventIds}
                    onChange={updateEvent}
                    onDelete={() =>
                      setConfirmation({
                        title: 'ลบเหตุการณ์จากร่าง?',
                        description: `“${event.title}” จะถูกนำออกจากร่าง คุณยังเลิกทำได้ก่อนบันทึก`,
                        confirmLabel: 'ลบเหตุการณ์',
                        action: () => {
                          setDraft({
                            ...draft,
                            events: draft.events.filter(
                              (_, index) => index !== eventIndex,
                            ),
                          })
                          setEventIndex(Math.max(0, eventIndex - 1))
                          setNotice('')
                        },
                      })
                    }
                  />
                ) : (
                  <p className="muted">
                    ยังไม่มีเหตุการณ์ กดเพิ่มเพื่อเริ่มเขียน
                  </p>
                )
              ) : ending ? (
                <V2EndingEditor
                  ending={ending}
                  eventIds={eventIds}
                  onChange={updateEnding}
                  onDelete={() =>
                    setConfirmation({
                      title: 'ลบตอนจบจากร่าง?',
                      description: `“${ending.title}” จะถูกนำออกจากร่าง คุณยังเลิกทำได้ก่อนบันทึก`,
                      confirmLabel: 'ลบตอนจบ',
                      action: () => {
                        setDraft({
                          ...draft,
                          endings: draft.endings.filter(
                            (_, index) => index !== endingIndex,
                          ),
                        })
                        setEndingIndex(Math.max(0, endingIndex - 1))
                        setNotice('')
                      },
                    })
                  }
                />
              ) : (
                <p className="muted">ยังไม่มีตอนจบ กดเพิ่มเพื่อเริ่มเขียน</p>
              )}
            </section>
          </div>
        )}
        {previewEventId && (
          <PreviewDialog
            key={previewEventId}
            content={draft}
            eventId={previewEventId}
            onClose={() => setPreviewEventId(null)}
          />
        )}
        {confirmation && (
          <ConfirmationDialog
            title={confirmation.title}
            description={confirmation.description}
            confirmLabel={confirmation.confirmLabel}
            onCancel={() => setConfirmation(null)}
            onConfirm={() => {
              confirmation.action()
              setConfirmation(null)
            }}
          />
        )}
      </div>
    </main>
  )
}
