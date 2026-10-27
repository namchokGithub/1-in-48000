import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { loadV2Content } from '../../content/v2/loader'
import type { V2Content } from '../../content/v2/schema'
import { getV2CurrentEvent, summarizeV2Life } from '../../engine/v2/game'
import { createV2GameStore } from '../../save/v2/store'
import { createLocalStorageAdapter } from '../../save/storage'
import { createAudioSettingsStore } from '../../save/audioSettings'
import type { V2PlayerSave } from '../../save/v2/schema'
import { createAudioController } from '../../shared/audio'
import { AudioControls } from './AudioControls'
import { CharacterForm } from './CharacterForm'
import { EndingView } from './EndingView'
import { formatGameTime } from './labels'
import { SceneView } from './SceneView'

type View = 'home' | 'create' | 'play' | 'ending'

function currentEventOrNull(content: V2Content, save: V2PlayerSave) {
  try {
    return getV2CurrentEvent(content, save)
  } catch {
    return null
  }
}

function summaryOrNull(content: V2Content, save: V2PlayerSave) {
  try {
    return summarizeV2Life(content, save)
  } catch {
    return null
  }
}

function downloadSave(text: string) {
  let extension = 'json'
  try {
    JSON.parse(text)
  } catch {
    extension = 'txt'
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `1-in-48000-save.${extension}`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function PlayerShell({ content }: { content: V2Content }) {
  const [session] = useState(() => {
    const store = createV2GameStore(content, createLocalStorageAdapter())
    let loadFailed = false
    try {
      store.getState().continueGame()
    } catch {
      loadFailed = true
    }
    return { store, loadFailed }
  })
  const { store } = session
  const [audio] = useState(createAudioController)
  const [audioSettings] = useState(createAudioSettingsStore)
  const volumes = useStore(audioSettings, (state) => state.volumes)
  const save = useStore(store, (state) => state.save)
  const [view, setView] = useState<View>('home')
  const [saveError, setSaveError] = useState(session.loadFailed)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    audio.setVolumes(volumes)
  }, [audio, volumes])

  useEffect(() => () => audio.stop(), [audio])

  function playEvent(current: V2PlayerSave) {
    const event = currentEventOrNull(content, current)
    if (event) audio.sync(event, content.assets)
    else audio.stop()
  }

  function goHome() {
    audio.stop()
    setView('home')
  }

  function start(name: string, backgroundId: string) {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]
    const action = save
      ? store.getState().restartGame
      : store.getState().startGame
    action(name, seed, backgroundId)
    const started = store.getState().save
    if (started) playEvent(started)
    setSaveError(false)
    setActionError(null)
    setView('play')
  }

  function choose(choiceId: string) {
    try {
      const next = store.getState().choose(choiceId)
      if (next.endingId) audio.stop()
      else playEvent(next)
      setActionError(null)
      setView(next.endingId ? 'ending' : 'play')
    } catch {
      setActionError('บันทึกตัวเลือกไม่ได้ โปรดลองอีกครั้ง')
    }
  }

  function exportBackup() {
    try {
      const raw = store.getState().exportSave()
      if (raw) downloadSave(raw)
    } catch {
      setActionError('ดาวน์โหลดเซฟไม่ได้ โปรดลองอีกครั้ง')
    }
  }

  function hasStoredSave() {
    try {
      return Boolean(store.getState().exportSave())
    } catch {
      return false
    }
  }

  let body
  if (view === 'create') {
    body = (
      <CharacterForm
        backgrounds={content.config.backgrounds}
        hasPreviousSave={hasStoredSave()}
        onStart={start}
        onCancel={() => setView('home')}
      />
    )
  } else if (view === 'play' && save) {
    const event = currentEventOrNull(content, save)
    body = event ? (
      <SceneView
        key={event.id}
        event={event}
        save={save}
        assets={content.assets}
        characters={content.characters}
        error={actionError}
        onChoose={choose}
        onHome={goHome}
      />
    ) : null
  } else if (view === 'ending' && save?.endingId) {
    const summary = summaryOrNull(content, save)
    body = summary ? (
      <EndingView
        summary={summary}
        onHome={goHome}
        onRestart={() => {
          audio.stop()
          setView('create')
        }}
        onExport={exportBackup}
      />
    ) : null
  }

  if (!body) {
    body = (
      <section className="panel mx-auto max-w-4xl overflow-hidden">
        <div className="grid md:grid-cols-[1.1fr_.9fr]">
          <div className="p-7 sm:p-10">
            <p className="eyebrow">ชีวิตมหาวิทยาลัยหนึ่งครั้ง</p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
              1 ใน 48,000
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed">
              จากวันแรกที่ ม.บารพู ไปจนถึงวันที่ต้องเลือกทางของตัวเอง
              ทุกคำตอบจะกลายเป็นเรื่องราวของคุณ
            </p>
            {save && (
              <div className="mt-6 rounded-xl border border-[var(--color-line)] bg-[#f4faf8] p-4">
                <p className="font-bold">เซฟของ {save.playerName}</p>
                <p className="muted mt-1 text-sm">
                  {save.endingId
                    ? 'เล่นจบแล้ว'
                    : formatGameTime(save.currentTime)}
                </p>
              </div>
            )}
            {saveError && (
              <p
                className="mt-5 rounded-xl border border-[#e1b5b7] bg-[#fff4f2] p-4 text-sm"
                role="alert"
              >
                โหลดเซฟไม่ได้ ข้อมูลเดิมยังอยู่
                คุณสามารถดาวน์โหลดไว้สำรองก่อนเริ่มใหม่
              </p>
            )}
            {actionError && (
              <p
                className="mt-4 text-sm text-[var(--color-danger)]"
                role="alert"
              >
                {actionError}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              {save && (
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => {
                    if (!save.endingId) playEvent(save)
                    setView(save.endingId ? 'ending' : 'play')
                  }}
                >
                  เล่นต่อ
                </button>
              )}
              <button
                type="button"
                className={
                  save ? 'button button-secondary' : 'button button-primary'
                }
                onClick={() => setView('create')}
              >
                {save ? 'เริ่มชีวิตใหม่' : 'เริ่มเกม'}
              </button>
              {hasStoredSave() && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={exportBackup}
                >
                  ดาวน์โหลดเซฟ
                </button>
              )}
            </div>
          </div>
          <div className="relative flex min-h-64 items-end overflow-hidden bg-[#a8d2ce] p-7 sm:p-10">
            <div
              className="absolute inset-0 opacity-60"
              style={{
                background:
                  'linear-gradient(160deg, transparent 50%, #6eaaa7 50% 64%, #3b8184 64% 80%, #215f69 80%)',
              }}
              aria-hidden="true"
            />
            <p className="relative max-w-xs text-2xl font-extrabold leading-snug text-white drop-shadow-sm">
              หนึ่งชีวิต
              <br />
              หลายทางเลือก
              <br />
              เรื่องราวของเรา
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="app-shell">
      <div className="app-wrap">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-extrabold tracking-wide">
            ม.บารพู <span className="muted font-normal">/ 1 ใน 48,000</span>
          </span>
          <AudioControls
            volumes={volumes}
            onChange={(channel, volume) =>
              audioSettings.getState().setVolume(channel, volume)
            }
          />
        </header>
        {body}
        <footer className="muted mt-8 text-center text-xs">
          เรื่องราวตัวอย่าง · เนื้อหาและภาพเพิ่มเติมจะตามมา
        </footer>
      </div>
    </div>
  )
}

export function PlayerApp() {
  const [content, setContent] = useState<V2Content | null>(null)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    let active = true
    loadV2Content()
      .then((loaded) => {
        if (active) {
          setContent(loaded)
          setError(false)
        }
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [retry])

  if (error) {
    return (
      <main className="app-shell flex items-center justify-center">
        <div className="panel max-w-lg p-8" role="alert">
          <p className="eyebrow">1 ใน 48,000</p>
          <h1 className="mt-3 text-2xl font-extrabold">โหลดเนื้อหาเกมไม่ได้</h1>
          <p className="muted mt-2">ตรวจการเชื่อมต่อแล้วลองอีกครั้ง</p>
          <button
            type="button"
            className="button button-primary mt-6"
            onClick={() => setRetry((value) => value + 1)}
          >
            ลองอีกครั้ง
          </button>
        </div>
      </main>
    )
  }
  if (!content) {
    return (
      <main className="app-shell flex items-center justify-center">
        <div className="panel min-w-64 p-8" role="status">
          กำลังเปิดเรื่องราว…
        </div>
      </main>
    )
  }
  return <PlayerShell content={content} />
}
