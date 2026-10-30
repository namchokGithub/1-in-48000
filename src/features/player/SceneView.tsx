import { useEffect, useRef, useState } from 'react'
import type { V2Content, V2Event } from '../../content/v2/schema'
import { getV2ChoiceOptions } from '../../engine/v2/game'
import type { V2PlayerSave } from '../../save/v2/schema'
import { formatGameTime } from './labels'
import { StatPanel } from './StatPanel'
import { describeChoiceEffects } from './choicePreview'
import { lockedReason } from './lockedReason'
import { YearTimeline } from './YearTimeline'
import { playerPortraitPath, playerProgram } from './playerIdentity'
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
  loanRatePercent: number
  // Recaps of the last choice, shown with the first line only.
  recaps: string[]
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
  loanRatePercent,
  recaps,
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
  const choices = getV2ChoiceOptions(event, save)
  const catalogs = { faculties, majors, electives }
  const matchingMajors = majors.filter((major) => major.facultyId === facultyId)
  const maxSelections =
    event.selection?.type === 'multiple' ? event.selection.max : 0
  const lastLine = lineIndex === event.lines.length - 1
  const scrollRef = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState({ above: false, below: false })

  // Fade the edges of the choice list while more choices are out of view,
  // because its scrollbar is hidden.
  function updateMore() {
    const list = scrollRef.current
    if (!list) return
    const above = list.scrollTop > 1
    const below = list.scrollTop + list.clientHeight < list.scrollHeight - 1
    setMore((current) =>
      current.above === above && current.below === below
        ? current
        : { above, below },
    )
  }

  useEffect(() => {
    const list = scrollRef.current
    if (!list) return
    updateMore()
    const observer = new ResizeObserver(updateMore)
    observer.observe(list)
    if (list.firstElementChild) observer.observe(list.firstElementChild)
    return () => observer.disconnect()
  }, [lastLine, lineIndex])

  return (
    <div className="player-scene-layout">
      <section
        className="panel player-scene-main overflow-hidden p-3 sm:p-5"
        aria-label="ฉากเหตุการณ์"
      >
        <div className="player-scene-heading">
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
        <YearTimeline
          currentYear={save.currentTime.year}
          programYears={
            majors.find((major) => major.id === save.majorId)?.programYears ?? 4
          }
        />
        <div className="scene-frame">
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
        </div>
        <div
          className="player-dialogue rounded-2xl border border-[var(--color-line)]"
          aria-live="polite"
        >
          <div className="flex items-baseline justify-between gap-3">
            <p className="eyebrow">{speaker?.name ?? 'เรื่องราว'}</p>
            <p className="muted text-xs">
              {lineIndex + 1} / {event.lines.length}
            </p>
          </div>
          {lineIndex === 0 && recaps.length > 0 && (
            <div className="player-recap">
              {recaps.map((recap, index) => (
                <p key={index}>{recap}</p>
              ))}
            </div>
          )}
          {/* Focusable so a long line can be scrolled with the keyboard. */}
          <p
            className="player-dialogue-text mt-2 text-lg leading-relaxed"
            tabIndex={0}
          >
            {line.text}
          </p>
          {!lastLine && (
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="button button-primary"
                onClick={() => setLineIndex((index) => index + 1)}
              >
                อ่านต่อ
              </button>
            </div>
          )}
        </div>
      </section>
      <section className="panel player-choice-panel" aria-label="ตัวเลือก">
        {error && (
          <p className="mb-3 text-sm text-[var(--color-danger)]" role="alert">
            {error}
          </p>
        )}
        <div
          className="player-choice-frame"
          data-more-above={more.above}
          data-more-below={more.below}
        >
          <div
            ref={scrollRef}
            className="player-choice-scroll"
            onScroll={updateMore}
          >
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
                {choices.map(({ choice, unmet }) => (
                  <PlayerCheckbox
                    key={choice.id}
                    checked={selectedIds.includes(choice.id)}
                    disabled={
                      unmet.length > 0 ||
                      (!selectedIds.includes(choice.id) &&
                        selectedIds.length >= maxSelections)
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
                    {unmet.length ? (
                      <span className="player-option-locked">
                        {lockedReason(unmet, catalogs)}
                      </span>
                    ) : (
                      <EffectList
                        lines={describeChoiceEffects(choice, save.stats)}
                      />
                    )}
                  </PlayerCheckbox>
                ))}
              </div>
            ) : choices.length ? (
              <div className="grid gap-3">
                <h2 className="text-lg font-bold">คุณจะทำอย่างไร?</h2>
                {choices.map(({ choice, unmet }) => (
                  <button
                    key={choice.id}
                    type="button"
                    className="player-option"
                    disabled={unmet.length > 0}
                    onClick={() => onChoose(choice.id)}
                  >
                    <span className="player-option-body">
                      <span>{choice.text}</span>
                      {unmet.length ? (
                        <span className="player-option-locked">
                          {lockedReason(unmet, catalogs)}
                        </span>
                      ) : (
                        <EffectList
                          lines={describeChoiceEffects(choice, save.stats)}
                        />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">ยังไม่มีตัวเลือกที่ใช้ได้ในเหตุการณ์นี้</p>
            )}
          </div>
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
          loanRatePercent={loanRatePercent}
          identity={{
            name: save.playerName,
            portraitPath: playerPortrait,
            program: playerProgram(
              faculties,
              majors,
              save.facultyId,
              save.majorId,
            ),
          }}
        />
      </aside>
    </div>
  )
}
