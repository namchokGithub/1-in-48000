import { useEffect, useState } from 'react'
import { useStore } from 'zustand'
import { loadV2Content } from '../../content/v2/loader'
import type { V2Content } from '../../content/v2/schema'
import { getV2CurrentEvent, summarizeV2Life } from '../../engine/v2/game'
import { createV2GameStore } from '../../save/v2/store'
import {
  createLocalStorageAdapter,
  createSessionStorageAdapter,
} from '../../save/storage'
import { createV2AudioSettingsStore } from '../../save/v2/audioSettings'
import { createPlayerThemeStore } from '../../save/v2/themeSettings'
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

function PlayerShell({
  content,
  themeSettings,
}: {
  content: V2Content
  themeSettings: ReturnType<typeof createPlayerThemeStore>
}) {
  const [store] = useState(() => {
    const created = createV2GameStore(
      content,
      createLocalStorageAdapter(),
      createSessionStorageAdapter(),
    )
    const navigation = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined
    if (navigation?.type === 'reload') created.getState().restoreGame()
    return created
  })
  const [audio] = useState(createAudioController)
  const [audioSettings] = useState(createV2AudioSettingsStore)
  const musicSettings = useStore(audioSettings, (state) => state.settings)
  const theme = useStore(themeSettings, (state) => state.theme)
  const save = useStore(store, (state) => state.save)
  const [view, setView] = useState<View>(() =>
    store.getState().save ? 'play' : 'home',
  )
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    audio.setVolume(musicSettings.musicEnabled ? musicSettings.musicVolume : 0)
  }, [audio, musicSettings])

  useEffect(() => () => audio.stop(), [audio])

  function syncMusic(
    current: V2PlayerSave | null,
    enabled = musicSettings.musicEnabled,
  ) {
    if (!enabled) {
      audio.stop()
      return
    }
    audio.setVolume(musicSettings.musicVolume)
    const event =
      current && !current.endingId ? currentEventOrNull(content, current) : null
    const bgmAssetId =
      event?.bgmAssetId ??
      content.assets.find((asset) => asset.kind === 'bgm')?.id
    audio.sync(bgmAssetId, content.assets)
  }

  function goHome() {
    syncMusic(null)
    setView('home')
  }

  function start(backgroundId: string) {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]
    const action = save
      ? store.getState().restartGame
      : store.getState().startGame
    action(seed, backgroundId)
    const started = store.getState().save
    if (started) syncMusic(started)
    setActionError(null)
    setView('play')
  }

  function resolve(action: () => V2PlayerSave) {
    try {
      const next = action()
      syncMusic(next.endingId ? null : next)
      setActionError(null)
      setView(next.endingId ? 'ending' : 'play')
    } catch {
      setActionError('บันทึกตัวเลือกไม่ได้ โปรดลองอีกครั้ง')
    }
  }

  const choose = (choiceId: string) =>
    resolve(() => store.getState().choose(choiceId))
  const chooseMany = (choiceIds: string[]) =>
    resolve(() => store.getState().chooseMany(choiceIds))
  const chooseProgram = (facultyId: string, majorId: string) =>
    resolve(() => store.getState().chooseProgram(facultyId, majorId))
  const chooseElective = (electiveId: string) =>
    resolve(() => store.getState().chooseElective(electiveId))

  let body
  if (view === 'create') {
    body = (
      <CharacterForm
        backgrounds={content.config.backgrounds}
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
        faculties={content.faculties}
        majors={content.majors}
        electives={content.electives}
        error={actionError}
        onChoose={choose}
        onChooseMany={chooseMany}
        onChooseProgram={chooseProgram}
        onChooseElective={chooseElective}
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
          syncMusic(null)
          setView('create')
        }}
      />
    ) : null
  }

  if (!body) {
    body = (
      <section className="panel overflow-hidden">
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
              <div className="player-save-card mt-6 rounded-xl border border-[var(--color-line)] p-4">
                <p className="font-bold">เซฟของ {save.playerName}</p>
                <p className="muted mt-1 text-sm">
                  {save.endingId
                    ? 'เล่นจบแล้ว'
                    : formatGameTime(save.currentTime)}
                </p>
              </div>
            )}
            {actionError && (
              <p
                className="mt-4 text-sm text-[var(--color-danger)]"
                role="alert"
              >
                {actionError}
              </p>
            )}
            <div className="mt-8 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className={
                  save ? 'button button-secondary' : 'button button-primary'
                }
                onClick={() => {
                  syncMusic(null)
                  setView('create')
                }}
              >
                {save ? 'เริ่มชีวิตใหม่' : 'เริ่มเกม'}
              </button>
            </div>
          </div>
          <div className="player-home-art relative flex min-h-64 items-end overflow-hidden p-7 sm:p-10">
            <p className="relative max-w-xs text-2xl font-extrabold leading-snug">
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
    <div className="app-shell player-shell" data-theme={theme}>
      <div className="app-wrap">
        <header className="player-header mb-6 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-extrabold tracking-wide">
            ม.บารพู <span className="muted font-normal">/ 1 ใน 48,000</span>
          </span>
          <div className="player-header-actions flex flex-wrap gap-2">
            <button
              type="button"
              className="button button-secondary player-header-button"
              aria-pressed={theme === 'dark'}
              aria-label={
                theme === 'dark' ? 'เปลี่ยนเป็นธีมสว่าง' : 'เปลี่ยนเป็นธีมมืด'
              }
              onClick={() => {
                syncMusic(view === 'play' ? save : null)
                themeSettings
                  .getState()
                  .setTheme(theme === 'dark' ? 'light' : 'dark')
              }}
            >
              <span aria-hidden="true">{theme === 'dark' ? '☾' : '☀'}</span>
              ธีม{theme === 'dark' ? 'มืด' : 'สว่าง'}
            </button>
            <AudioControls
              enabled={musicSettings.musicEnabled}
              onToggle={() => {
                const enabled = !musicSettings.musicEnabled
                syncMusic(view === 'play' ? save : null, enabled)
                audioSettings.getState().setMusicEnabled(enabled)
              }}
            />
          </div>
        </header>
        <main id="player-content">{body}</main>
        <footer className="muted mt-8 text-center text-xs">
          เรื่องราวตัวอย่าง · เนื้อหาและภาพเพิ่มเติมจะตามมา
        </footer>
      </div>
    </div>
  )
}

export function PlayerApp() {
  const [themeSettings] = useState(createPlayerThemeStore)
  const theme = useStore(themeSettings, (state) => state.theme)
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
      <main
        className="app-shell player-shell flex items-center justify-center"
        data-theme={theme}
      >
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
      <main
        className="app-shell player-shell flex items-center justify-center"
        data-theme={theme}
      >
        <div className="panel min-w-64 p-8" role="status">
          กำลังเปิดเรื่องราว…
        </div>
      </main>
    )
  }
  return <PlayerShell content={content} themeSettings={themeSettings} />
}
