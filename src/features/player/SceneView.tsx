import { useState } from 'react'
import type { Asset, Character, Event } from '../../content/schema'
import { getAvailableChoices } from '../../engine/game'
import type { PlayerSave } from '../../save/schema'
import { formatGameTime } from './labels'
import { StatPanel } from './StatPanel'

type Props = {
  event: Event
  save: PlayerSave
  assets: Asset[]
  characters: Character[]
  error: string | null
  onChoose: (choiceId: string) => void
  onHome: () => void
}

export function SceneView({
  event,
  save,
  assets,
  characters,
  error,
  onChoose,
  onHome,
}: Props) {
  const [lineIndex, setLineIndex] = useState(0)
  const line = event.lines[lineIndex]
  const speaker = characters.find(
    (character) => character.id === line.speakerId,
  )
  const sceneAsset = assets.find(
    (asset) => asset.id === event.sceneAssetId && asset.kind === 'scene',
  )
  const portraitId = line.portraitAssetId ?? speaker?.portraitAssetId
  const portraitAsset = assets.find(
    (asset) => asset.id === portraitId && asset.kind === 'portrait',
  )
  const choices = getAvailableChoices(event, save)
  const lastLine = lineIndex === event.lines.length - 1

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section
        className="panel overflow-hidden p-3 sm:p-5"
        aria-label="ฉากเหตุการณ์"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <p className="eyebrow">{formatGameTime(save.currentTime)}</p>
            <h1 className="mt-1 text-2xl font-extrabold">{event.title}</h1>
          </div>
          <button
            type="button"
            className="button button-secondary"
            onClick={onHome}
          >
            หน้าแรก
          </button>
        </div>
        <div className="scene-stage">
          {sceneAsset && (
            <img className="scene-image" src={sceneAsset.path} alt="" />
          )}
          <span className="scene-caption">
            {sceneAsset ? event.title : 'ม.บารพู · ฉากตัวอย่าง'}
          </span>
          {portraitAsset && (
            <img
              className="portrait-image"
              src={portraitAsset.path}
              alt={speaker?.name ?? 'ตัวละคร'}
            />
          )}
        </div>
        <div
          className="mt-4 rounded-2xl border border-[var(--color-line)] bg-[#f8fbfa] p-5 sm:p-6"
          aria-live="polite"
        >
          <p className="eyebrow">{speaker?.name ?? 'เรื่องราว'}</p>
          <p className="mt-3 min-h-20 text-lg leading-relaxed">{line.text}</p>
          <p className="muted mt-3 text-xs">
            {lineIndex + 1} / {event.lines.length}
          </p>
        </div>
        {error && (
          <p className="mt-4 text-sm text-[var(--color-danger)]" role="alert">
            {error}
          </p>
        )}
        <div className="mt-5 space-y-3">
          {!lastLine ? (
            <button
              type="button"
              className="button button-primary w-full sm:w-auto"
              onClick={() => setLineIndex((index) => index + 1)}
            >
              อ่านต่อ
            </button>
          ) : choices.length ? (
            <>
              <p className="font-bold">คุณจะทำอย่างไร?</p>
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="button button-secondary w-full justify-between text-left"
                  onClick={() => onChoose(choice.id)}
                >
                  <span>{choice.text}</span>
                  <span aria-hidden="true">→</span>
                </button>
              ))}
            </>
          ) : (
            <p className="muted">ยังไม่มีตัวเลือกที่ใช้ได้ในเหตุการณ์นี้</p>
          )}
        </div>
      </section>
      <StatPanel stats={save.stats} />
    </div>
  )
}
