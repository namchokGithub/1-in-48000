import { useEffect, useState, type SetStateAction } from 'react'
import { loadV2Content } from '../../content/v2/loader'
import {
  v2ContentSchema,
  type V2Content,
  type V2Event,
} from '../../content/v2/schema'
import { V2EndingEditor } from './V2EndingEditor'
import { V2EventEditor } from './V2EventEditor'
import { PreviewDialog, type PreviewPath } from './PreviewDialog'
import { FlowBoard } from './FlowBoard'
import { EventEditorDialog } from './EventEditorDialog'
import { ConfirmationDialog } from './ConfirmationDialog'
import {
  commitHistory,
  createHistory,
  redoHistory,
  undoHistory,
  type DraftHistory,
} from './draftHistory'
import {
  filesToSave,
  placeEvent,
  removeEventFromFlow,
  syncEventChange,
} from './flowEditing'
import { neighboringStoryIndex, orderedStoryEntries } from './storyVisibility'
import { matchesStoryQuery } from './timelineFilters'
import { DataEditor, type DataSection } from './DataEditor'
import { CatalogEditor, type CatalogSection } from './CatalogEditor'

type Section = 'events' | 'flow' | 'endings' | DataSection | CatalogSection
type EditableFile =
  'events' | 'flow' | 'endings' | 'characters' | 'assets' | CatalogSection
type ValidationIssue = { path: string; message: string }

function sectionFromUrl(): Section {
  const tab = new URLSearchParams(window.location.search).get('tab')
  if (
    tab === 'flow' ||
    tab === 'endings' ||
    tab === 'speakers' ||
    tab === 'backgrounds' ||
    tab === 'portraits' ||
    tab === 'sounds' ||
    tab === 'faculties' ||
    tab === 'majors' ||
    tab === 'electives' ||
    tab === 'names'
  ) {
    return tab
  }
  return 'events'
}

function sectionFile(section: Section): EditableFile {
  if (section === 'speakers') return 'characters'
  if (
    section === 'backgrounds' ||
    section === 'portraits' ||
    section === 'sounds'
  )
    return 'assets'
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
  const [flowEventId, setFlowEventId] = useState<string | null>(null)
  const [editEventId, setEditEventId] = useState<string | null>(null)
  const [previewPath, setPreviewPath] = useState<PreviewPath | null>(null)
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || saving) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]'))
        return
      const redo =
        (event.code === 'KeyZ' && event.shiftKey) ||
        (event.code === 'KeyY' && event.ctrlKey && !event.shiftKey)
      if (redo) {
        event.preventDefault()
        redoDraft()
      } else if (event.code === 'KeyZ') {
        event.preventDefault()
        undoDraft()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

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
  const dirtyFlow = JSON.stringify(draft.flow) !== JSON.stringify(saved.flow)
  const dirtyCharacters =
    JSON.stringify(draft.characters) !== JSON.stringify(saved.characters)
  const dirtyAssets =
    JSON.stringify(draft.assets) !== JSON.stringify(saved.assets)
  const dirtyFaculties =
    JSON.stringify(draft.faculties) !== JSON.stringify(saved.faculties)
  const dirtyMajors =
    JSON.stringify(draft.majors) !== JSON.stringify(saved.majors)
  const dirtyElectives =
    JSON.stringify(draft.electives) !== JSON.stringify(saved.electives)
  const dirtyNames = JSON.stringify(draft.names) !== JSON.stringify(saved.names)
  const dirtyFiles: Record<EditableFile, boolean> = {
    events: dirtyEvents,
    flow: dirtyFlow,
    endings: dirtyEndings,
    characters: dirtyCharacters,
    assets: dirtyAssets,
    faculties: dirtyFaculties,
    majors: dirtyMajors,
    electives: dirtyElectives,
    names: dirtyNames,
  }
  const file = sectionFile(section)
  const dirty = section === 'flow' ? dirtyEvents || dirtyFlow : dirtyFiles[file]
  const dirtyAny = Object.values(dirtyFiles).some(Boolean)
  const sectionLabels: Record<Section, string> = {
    events: 'เหตุการณ์',
    flow: 'Flow เรื่อง',
    endings: 'ตอนจบ',
    backgrounds: 'ภาพฉาก',
    speakers: 'ผู้พูด',
    names: 'ชื่อผู้เล่น',
    portraits: 'ภาพตัวละคร',
    sounds: 'เสียง',
    faculties: 'คณะ',
    majors: 'สาขา',
    electives: 'วิชาเสรี',
  }
  const event = draft.events[eventIndex]
  const ending = draft.endings[endingIndex]
  const eventIds = draft.events.map((item) => item.id)
  const visibleEventEntries = orderedStoryEntries(draft.events).filter(
    ({ event: item }) => matchesStoryQuery(item, eventQuery),
  )

  function updateEventAt(target: number, next: V2Event) {
    setDraft(
      (current) =>
        current && {
          ...current,
          events: current.events.map((item, index) =>
            index === target ? next : item,
          ),
          flow: syncEventChange(current.flow, current.events[target], next),
        },
    )
    setNotice('')
    setServerIssues([])
  }

  function updateEvent(next: V2Event) {
    updateEventAt(eventIndex, next)
  }

  function confirmDeleteEvent(target: V2Event, afterDelete: () => void) {
    setConfirmation({
      title: 'ลบเหตุการณ์จากร่าง?',
      description: `“${target.title}” จะถูกนำออกจากร่างและจากกระดาน Flow คุณยังเลิกทำได้ก่อนบันทึก`,
      confirmLabel: 'ลบเหตุการณ์',
      action: () => {
        setDraft({
          ...currentDraft,
          events: currentDraft.events.filter((item) => item.id !== target.id),
          flow: removeEventFromFlow(currentDraft.flow, target.id),
        })
        afterDelete()
        setNotice('')
      },
    })
  }

  function newEventDraft(): V2Event {
    return {
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
  }

  function addEventToFlow(position: { x: number; y: number }) {
    const newEvent = newEventDraft()
    const events = [...currentDraft.events, newEvent]
    const flow = placeEvent(currentDraft.flow, events, newEvent.id, position)
    if (typeof flow === 'string') return
    setDraft({ ...currentDraft, events, flow })
    setEditEventId(newEvent.id)
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
    const newEvent = newEventDraft()
    setEventIndex(currentDraft.events.length)
    setDraft({ ...currentDraft, events: [...currentDraft.events, newEvent] })
    selectSection('events')
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

  async function saveFile(target: EditableFile) {
    setShowIssues(true)
    setServerIssues([])
    setNotice('')
    if (issues.length) return
    setSaving(true)
    try {
      const files = filesToSave(target, dirtyFiles)
      for (const file of files) {
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
      }
      setShowIssues(false)
      const names = {
        events: 'เหตุการณ์',
        flow: 'Flow เรื่อง',
        endings: 'ตอนจบ',
        characters: 'ผู้พูด',
        assets: 'Asset',
        faculties: 'คณะ',
        majors: 'สาขา',
        electives: 'วิชาเสรี',
        names: 'ชื่อผู้เล่น',
      }
      setNotice(`บันทึก${files.map((file) => names[file]).join(' และ ')}แล้ว`)
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
            {dirtyAny ? 'มีร่างที่ยังไม่บันทึก' : 'บันทึกแล้ว'}
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
              disabled={
                section === 'flow'
                  ? !flowEventId
                  : section !== 'events' || !event
              }
              onClick={() =>
                section === 'flow'
                  ? flowEventId && setPreviewEventId(flowEventId)
                  : event && setPreviewEventId(event.id)
              }
            >
              ทดลองเหตุการณ์
            </button>
            <button
              type="button"
              className="button button-primary"
              disabled={!dirty || saving}
              onClick={() => saveFile(file)}
            >
              {saving ? 'กำลังบันทึก…' : `บันทึก ${sectionLabels[section]}`}
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
            aria-pressed={section === 'flow'}
            type="button"
            onClick={() => selectSection('flow')}
          >
            Flow เรื่อง {draft.flow.nodes.length}
            {dirtyFlow ? ' •' : ''}
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
          <button
            aria-pressed={section === 'portraits'}
            type="button"
            onClick={() => selectSection('portraits')}
          >
            ภาพตัวละคร{' '}
            {draft.assets.filter((asset) => asset.kind === 'portrait').length}
            {dirtyAssets ? ' •' : ''}
          </button>
          {(['faculties', 'majors', 'electives', 'names'] as const).map(
            (catalog) => (
              <button
                key={catalog}
                aria-pressed={section === catalog}
                type="button"
                onClick={() => selectSection(catalog)}
              >
                {sectionLabels[catalog]} {draft[catalog].length}
                {dirtyFiles[catalog] ? ' •' : ''}
              </button>
            ),
          )}
        </nav>
        {section === 'events' && (
          <div className="bo-events-tools">
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
        section === 'portraits' ||
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
        ) : section === 'faculties' ||
          section === 'majors' ||
          section === 'electives' ||
          section === 'names' ? (
          <CatalogEditor
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
        ) : section === 'flow' ? (
          <FlowBoard
            content={draft}
            schemaIssues={
              checked.success
                ? []
                : checked.error.issues
                    .filter((issue) => issue.path[0] === 'flow')
                    .map((issue) => ({
                      path: issue.path.slice(1) as (string | number)[],
                      message: issue.message,
                    }))
            }
            onChange={(flow) => {
              setDraft({ ...currentDraft, flow })
              setNotice('')
              setServerIssues([])
            }}
            onSelectEvent={setFlowEventId}
            onEditEvent={setEditEventId}
            onCreateEvent={addEventToFlow}
            onPreview={setPreviewEventId}
            highlight={previewPath}
            onClearHighlight={() => setPreviewPath(null)}
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
                    ลำดับในไฟล์ใช้จัดรายการ เส้นทางเรื่องกำหนดในแท็บ Flow เรื่อง
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
                    catalogs={draft}
                    eventIds={eventIds}
                    onChange={updateEvent}
                    onDelete={() =>
                      confirmDeleteEvent(event, () =>
                        setEventIndex(Math.max(0, eventIndex - 1)),
                      )
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
        {editEventId &&
          (() => {
            const target = draft.events.findIndex(
              (item) => item.id === editEventId,
            )
            const editing = draft.events[target]
            if (!editing) return null
            return (
              <EventEditorDialog
                event={editing}
                assets={draft.assets}
                characters={draft.characters}
                catalogs={draft}
                eventIds={eventIds}
                onChange={(next) => {
                  updateEventAt(target, next)
                  if (next.id !== editing.id) setEditEventId(next.id)
                }}
                onDelete={() =>
                  confirmDeleteEvent(editing, () => setEditEventId(null))
                }
                onPreview={() => setPreviewEventId(editing.id)}
                onClose={() => setEditEventId(null)}
              />
            )
          })()}
        {previewEventId && (
          <PreviewDialog
            key={previewEventId}
            content={draft}
            eventId={previewEventId}
            onClose={() => setPreviewEventId(null)}
            onTrace={setPreviewPath}
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
