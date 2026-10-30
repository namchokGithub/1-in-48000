import { useState } from 'react'
import type { V2Content, V2Event } from '../../content/v2/schema'
import { getV2AvailableChoices } from '../../engine/v2/game'
import type { V2PlayerSave } from '../../save/v2/schema'
import { formatGameTime } from './labels'
import { StatPanel } from './StatPanel'
import { describeChoiceEffects } from './choicePreview'
import { YearTimeline } from './YearTimeline'
import { playerPortraitPath } from './playerIdentity'
import { lineSpeaker } from '../../content/v2/lineSpeaker'
import { EffectList } from './ui/EffectList'
import { PlayerCheckbox } from './ui/PlayerCheckbox'
import { PlayerSelect } from './ui/PlayerSelect'

type Props = {
  event: V2Event
  save: V2PlayerSave
  assets: V2Content['assets']
  characters: V2Content['characters']
  faculties: V2Content['faculties']
  majors: V2Content['majors']
  electives: V2Content['electives']
  names: V2Content['names']
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
  names,
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
  const speaker = lineSpeaker(line, characters)
  const sceneAsset = assets.find(
    (asset) => asset.id === event.sceneAssetId && asset.kind === 'scene',
  )
  const portraitId = line.portraitAssetId ?? speaker?.portraitAssetId
  const portraitAsset = assets.find(
    (asset) => asset.id === portraitId && asset.kind === 'portrait',
  )
  const playerPortrait = playerPortraitPath(
    names,
    assets,
    save.nameId,
    event.outfit,
  )
  const choices = getV2AvailableChoices(event, save)
  const matchingMajors = majors.filter((major) => major.facultyId === facultyId)
  const maxSelections =
    event.selection?.type === 'multiple' ? event.selection.max : 0
  const lastLine = lineIndex === event.lines.length - 1

  return (
    <div className="player-scene-layout">
      <section
        className="panel player-scene-main overflow-hidden p-3 sm:p-5"
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
          <p className="player-dialogue-text mt-3 text-lg leading-relaxed">
            {line.text}
          </p>
          <div className="mt-3 flex min-h-10 items-center justify-between gap-3">
            <p className="muted text-xs">
              {lineIndex + 1} / {event.lines.length}
            </p>
            {!lastLine && (
              <button
                type="button"
                className="button button-primary"
                onClick={() => setLineIndex((index) => index + 1)}
              >
                อ่านต่อ
              </button>
            )}
          </div>
        </div>
      </section>
      <section className="panel player-choice-panel" aria-label="ตัวเลือก">
        {error && (
          <p className="mb-3 text-sm text-[var(--color-danger)]" role="alert">
            {error}
          </p>
        )}
        <div className="player-choice-scroll">
          {!lastLine ? (
            <p className="muted text-sm" role="status">
              อ่านบทสนทนาให้จบก่อนเลือกทางต่อ
            </p>
          ) : event.selection?.type === 'program' ? (
            <div className="grid gap-4">
              <PlayerSelect
                label="คณะ"
                value={facultyId}
                options={availableFaculties.map((faculty) => ({
                  value: faculty.id,
                  label: faculty.name,
                }))}
                onChange={(nextId) => {
                  setFacultyId(nextId)
                  setMajorId(
                    majors.find((major) => major.facultyId === nextId)?.id ??
                      '',
                  )
                }}
              />
              <PlayerSelect
                label="สาขา"
                value={majorId}
                options={matchingMajors.map((major) => ({
                  value: major.id,
                  label: `${major.name} · ${major.programYears} ปี`,
                }))}
                onChange={setMajorId}
              />
            </div>
          ) : event.selection?.type === 'elective' ? (
            <PlayerSelect
              label="วิชาเสรี"
              value={electiveId}
              options={electives.map((elective) => ({
                value: elective.id,
                label: elective.name,
              }))}
              onChange={setElectiveId}
            />
          ) : event.selection?.type === 'multiple' ? (
            <div className="grid gap-3">
              <h2 className="text-lg font-bold">
                เลือก {event.selection.min}–{event.selection.max} ข้อ
                <span className="muted text-sm font-normal">
                  {' '}
                  (เลือกแล้ว {selectedIds.length} ข้อ)
                </span>
              </h2>
              {choices.map((choice) => (
                <PlayerCheckbox
                  key={choice.id}
                  checked={selectedIds.includes(choice.id)}
                  disabled={
                    !selectedIds.includes(choice.id) &&
                    selectedIds.length >= maxSelections
                  }
                  onChange={(checked) =>
                    setSelectedIds((current) =>
                      checked
                        ? [...current, choice.id]
                        : current.filter((id) => id !== choice.id),
                    )
                  }
                >
                  <span>{choice.text}</span>
                  <EffectList
                    lines={describeChoiceEffects(choice, save.stats)}
                  />
                </PlayerCheckbox>
              ))}
            </div>
          ) : choices.length ? (
            <div className="grid gap-3">
              <h2 className="text-lg font-bold">คุณจะทำอย่างไร?</h2>
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="player-option"
                  onClick={() => onChoose(choice.id)}
                >
                  <span className="player-option-body">
                    <span>{choice.text}</span>
                    <EffectList
                      lines={describeChoiceEffects(choice, save.stats)}
                    />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">ยังไม่มีตัวเลือกที่ใช้ได้ในเหตุการณ์นี้</p>
          )}
        </div>
        {lastLine && event.selection?.type === 'program' && (
          <div className="player-choice-footer">
            <button
              type="button"
              className="button button-primary w-full"
              disabled={!facultyId || !majorId}
              onClick={() => onChooseProgram(facultyId, majorId)}
            >
              ยืนยันคณะและสาขา
            </button>
          </div>
        )}
        {lastLine && event.selection?.type === 'elective' && (
          <div className="player-choice-footer">
            <button
              type="button"
              className="button button-primary w-full"
              disabled={!electiveId}
              onClick={() => onChooseElective(electiveId)}
            >
              ยืนยันวิชาเสรี
            </button>
          </div>
        )}
        {lastLine && event.selection?.type === 'multiple' && (
          <div className="player-choice-footer">
            <button
              type="button"
              className="button button-primary w-full"
              disabled={
                selectedIds.length < event.selection.min ||
                selectedIds.length > event.selection.max
              }
              onClick={() => onChooseMany(selectedIds)}
            >
              ยืนยันตัวเลือก
            </button>
          </div>
        )}
      </section>
      <aside className="player-scene-stats">
        <StatPanel
          stats={save.stats}
          identity={{ name: save.playerName, portraitPath: playerPortrait }}
        />
      </aside>
    </div>
  )
}
