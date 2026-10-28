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
  faculties: V2Content['faculties']
  majors: V2Content['majors']
  electives: V2Content['electives']
  error: string | null
  onChoose: (choiceId: string) => void
  onChooseMany: (choiceIds: string[]) => void
  onChooseProgram: (facultyId: string, majorId: string) => void
  onChooseElective: (electiveId: string) => void
  onHome: () => void
  homeLabel?: string
}

export function SceneView({
  event,
  save,
  assets,
  characters,
  faculties,
  majors,
  electives,
  error,
  onChoose,
  onChooseMany,
  onChooseProgram,
  onChooseElective,
  onHome,
  homeLabel = 'หน้าแรก',
}: Props) {
  const [lineIndex, setLineIndex] = useState(0)
  const availableFaculties = faculties.filter((faculty) =>
    majors.some((major) => major.facultyId === faculty.id),
  )
  const [facultyId, setFacultyId] = useState(availableFaculties[0]?.id ?? '')
  const [majorId, setMajorId] = useState(
    majors.find((major) => major.facultyId === availableFaculties[0]?.id)?.id ??
      '',
  )
  const [electiveId, setElectiveId] = useState(electives[0]?.id ?? '')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
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
  const matchingMajors = majors.filter((major) => major.facultyId === facultyId)
  const maxSelections =
    event.selection?.type === 'multiple' ? event.selection.max : 0
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
          ) : event.selection?.type === 'program' ? (
            <div className="grid w-full gap-3">
              <label className="grid gap-1">
                <span>คณะ</span>
                <select
                  className="field"
                  value={facultyId}
                  onChange={(change) => {
                    const nextId = change.target.value
                    setFacultyId(nextId)
                    setMajorId(
                      majors.find((major) => major.facultyId === nextId)?.id ??
                        '',
                    )
                  }}
                >
                  {availableFaculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span>สาขา</span>
                <select
                  className="field"
                  value={majorId}
                  onChange={(change) => setMajorId(change.target.value)}
                >
                  {matchingMajors.map((major) => (
                    <option key={major.id} value={major.id}>
                      {major.name} · {major.programYears} ปี
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button-primary"
                disabled={!facultyId || !majorId}
                onClick={() => onChooseProgram(facultyId, majorId)}
              >
                ยืนยันคณะและสาขา
              </button>
            </div>
          ) : event.selection?.type === 'elective' ? (
            <div className="grid w-full gap-3">
              <label className="grid gap-1">
                <span>วิชาเสรี</span>
                <select
                  className="field"
                  value={electiveId}
                  onChange={(change) => setElectiveId(change.target.value)}
                >
                  {electives.map((elective) => (
                    <option key={elective.id} value={elective.id}>
                      {elective.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button-primary"
                disabled={!electiveId}
                onClick={() => onChooseElective(electiveId)}
              >
                ยืนยันวิชาเสรี
              </button>
            </div>
          ) : event.selection?.type === 'multiple' ? (
            <div className="grid w-full gap-3">
              <p className="font-bold">
                เลือก {event.selection.min}–{event.selection.max} ข้อ (
                {selectedIds.length} ข้อแล้ว)
              </p>
              {choices.map((choice) => (
                <label
                  key={choice.id}
                  className="button button-secondary flex items-center gap-3 text-left"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(choice.id)}
                    disabled={
                      !selectedIds.includes(choice.id) &&
                      selectedIds.length >= maxSelections
                    }
                    onChange={(change) =>
                      setSelectedIds((current) =>
                        change.target.checked
                          ? [...current, choice.id]
                          : current.filter((id) => id !== choice.id),
                      )
                    }
                  />
                  <span>{choice.text}</span>
                </label>
              ))}
              <button
                type="button"
                className="button button-primary"
                disabled={
                  selectedIds.length < event.selection.min ||
                  selectedIds.length > event.selection.max
                }
                onClick={() => onChooseMany(selectedIds)}
              >
                ยืนยันตัวเลือก
              </button>
            </div>
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
