import { useState } from 'react'
import type { V2Content, V2Event } from '../../content/v2/schema'
import { chooseV2, getV2AvailableChoices } from '../../engine/v2/game'
import type { V2PlayerSave } from '../../save/v2/schema'
import { createV2PreviewSave } from './preview'
import { v2StatOptions } from './v2StatOptions'

export function PreviewPane({
  content,
  event,
}: {
  content: V2Content
  event: V2Event
}) {
  const [save, setSave] = useState<V2PlayerSave | null>(null)
  const [result, setResult] = useState<V2PlayerSave | null>(null)
  const [error, setError] = useState<string | null>(null)
  const scene = content.assets.find(
    (asset) => asset.id === event.sceneAssetId && asset.kind === 'scene',
  )
  const firstLine = event.lines[0]
  const speaker = content.characters.find(
    (character) => character.id === firstLine?.speakerId,
  )
  const portraitId = firstLine?.portraitAssetId ?? speaker?.portraitAssetId
  const portrait = content.assets.find(
    (asset) => asset.id === portraitId && asset.kind === 'portrait',
  )
  const choices = save ? getV2AvailableChoices(event, save) : []

  function start() {
    try {
      setSave(createV2PreviewSave(content, event.id))
      setResult(null)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เริ่ม Preview ไม่ได้')
    }
  }

  function pick(choiceId: string) {
    if (!save) return
    try {
      setResult(chooseV2(content, save, choiceId))
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ทดลองตัวเลือกไม่ได้')
    }
  }

  return (
    <aside
      id="bo-preview"
      tabIndex={-1}
      className="panel bo-preview"
      aria-label="ทดลองเหตุการณ์"
    >
      <div className="bo-section-heading">
        <div>
          <p className="eyebrow">Preview</p>
          <h2 className="text-xl font-extrabold">ทดลองเหตุการณ์</h2>
        </div>
        <button
          type="button"
          className="button button-secondary"
          onClick={start}
        >
          {save ? 'เริ่มใหม่' : 'เริ่มทดลอง'}
        </button>
      </div>
      <p className="muted text-sm">
        ใช้ค่าสถานะเริ่มต้นของเกม และเปิด Flag ที่เหตุการณ์นี้ต้องใช้
      </p>
      <div className="bo-preview-stage">
        {scene && <img className="bo-preview-art" src={scene.path} alt="" />}
        {portrait && (
          <img
            className="bo-preview-portrait"
            src={portrait.path}
            alt={speaker?.name ?? 'ตัวละคร'}
          />
        )}
      </div>
      <h3 className="mt-4 font-extrabold">{event.title}</h3>
      <div className="bo-preview-lines">
        {event.lines.map((line, index) => {
          const speaker = content.characters.find(
            (character) => character.id === line.speakerId,
          )
          return (
            <p key={index}>
              <strong>{speaker?.name ?? 'เรื่องราว'}:</strong> {line.text}
            </p>
          )
        })}
      </div>
      {save && !result && (
        <div className="bo-stack mt-4">
          {choices.length ? (
            choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="button button-secondary w-full justify-start text-left"
                onClick={() => pick(choice.id)}
              >
                {choice.text}
              </button>
            ))
          ) : (
            <p className="muted text-sm">
              ไม่มีตัวเลือกที่ใช้ได้กับสถานะทดลองนี้
            </p>
          )}
        </div>
      )}
      {result && save && (
        <div className="bo-preview-result" aria-live="polite">
          <h3 className="font-extrabold">ผลจากการเลือก</h3>
          <dl>
            {v2StatOptions.map(({ id, label }) => (
              <div key={id}>
                <dt>{label}</dt>
                <dd>
                  {save.stats[id]} → {result.stats[id]}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm">
            {result.endingId
              ? `ตอนจบ: ${result.endingId}`
              : `เหตุการณ์ถัดไป: ${result.currentEventId ?? 'ไม่มี'}`}
          </p>
          <p className="muted mt-1 text-xs">
            Flag:{' '}
            {Object.entries(result.flags)
              .filter(([, value]) => value)
              .map(([id]) => id)
              .join(', ') || 'ไม่มี'}
          </p>
        </div>
      )}
      {error && (
        <p className="bo-error mt-3" role="alert">
          {error}
        </p>
      )}
    </aside>
  )
}
