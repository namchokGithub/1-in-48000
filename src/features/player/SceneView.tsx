import { useState } from 'react'
import type { V2Content, V2Event } from '../../content/v2/schema'
import { getV2AvailableChoices } from '../../engine/v2/game'
import type { V2PlayerSave } from '../../save/v2/schema'
import { formatGameTime } from './labels'
import { StatPanel } from './StatPanel'
import { describeChoiceEffects } from './choicePreview'
import { YearTimeline } from './YearTimeline'

type Props = {
  event: V2Event
  save: V2PlayerSave
  assets: V2Content['assets']
  characters: V2Content['characters']
  error: string | null
  onChoose: (choiceId: string) => void
  onHome: () => void
  homeLabel?: string
}

export function SceneView({
  event,
  save,
  assets,
  characters,
  error,
  onChoose,
  onHome,
  homeLabel = 'หน้าแรก',
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
  const choices = getV2AvailableChoices(event, save)
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
            {homeLabel}
          </button>
        </div>
        <YearTimeline currentYear={save.currentTime.year} />
        <div className="scene-stage">
          {sceneAsset && (
            <img className="scene-image" src={sceneAsset.path} alt="" />
          )}
          {portraitAsset && (
            <img
              className="portrait-image"
              src={portraitAsset.path}
              alt={speaker?.name ?? 'ตัวละคร'}
            />
          )}
        </div>
        <div
          className="player-dialogue mt-4 rounded-2xl border border-[var(--color-line)] p-5 sm:p-6"
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
        <div className="mt-5 flex flex-col items-end gap-3">
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
              <p className="w-full font-bold">คุณจะทำอย่างไร?</p>
              {choices.map((choice) => {
                const effects = describeChoiceEffects(choice, save.stats)
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className="button button-secondary w-full flex-col items-start text-left sm:max-w-[38rem]"
                    onClick={() => onChoose(choice.id)}
                  >
                    <span>{choice.text}</span>
                    {effects.length > 0 && (
                      <span className="muted mt-1 grid gap-0.5 text-xs font-normal">
                        {effects.map((effect, index) => (
                          <span key={`${choice.id}-${index}`}>{effect}</span>
                        ))}
                      </span>
                    )}
                  </button>
                )
              })}
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
