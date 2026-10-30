import { useEffect, useId, useRef, useState } from 'react'
import type { V2Content } from '../../content/v2/schema'
import {
  chooseV2,
  chooseV2Elective,
  chooseV2Many,
  chooseV2Program,
  getV2LastRecaps,
  summarizeV2Life,
  type V2FlowStep,
} from '../../engine/v2/game'
import type { V2PlayerSave } from '../../save/v2/schema'
import { EndingView } from '../player/EndingView'
import { SceneView } from '../player/SceneView'
import { playerPortraitPath, playerProgram } from '../player/playerIdentity'
import { createV2PreviewSession } from './preview'
import { useBackdropClose } from './useBackdropClose'
import { describeFlowStep, previewErrorMessage, tracedPath } from './flowTrace'

type Session = {
  content: V2Content
  save: V2PlayerSave | null
  error: string | null
  run: number
  placed: boolean
  startNodeId: string | null
  steps: V2FlowStep[]
}

export type PreviewPath = { nodeIds: string[]; edgeIds: string[] }

export function PreviewDialog({
  content,
  eventId,
  onClose,
  onTrace,
}: {
  content: V2Content
  eventId: string
  onClose: () => void
  onTrace?: (path: PreviewPath) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const backdrop = useBackdropClose(onClose)

  function start(run: number): Session {
    try {
      return {
        ...createV2PreviewSession(content, eventId),
        error: null,
        run,
        steps: [],
      }
    } catch (cause) {
      return {
        content,
        save: null,
        error: cause instanceof Error ? cause.message : 'เริ่มทดลองไม่ได้',
        run,
        placed: false,
        startNodeId: null,
        steps: [],
      }
    }
  }

  function restart() {
    const next = start(session.run + 1)
    setSession(next)
    onTrace?.(tracedPath([], next.startNodeId))
  }

  const [session, setSession] = useState<Session>(() => start(0))

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    closeRef.current?.focus()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  function resolve(
    action: (save: V2PlayerSave, trace: V2FlowStep[]) => V2PlayerSave,
  ) {
    if (!session.save) return
    const trace: V2FlowStep[] = []
    try {
      const next = {
        ...session,
        save: action(session.save, trace),
        error: null,
        steps: [...session.steps, ...trace],
      }
      setSession(next)
      onTrace?.(tracedPath(next.steps, next.startNodeId))
    } catch (cause) {
      setSession({
        ...session,
        error:
          cause instanceof Error
            ? previewErrorMessage(cause.message, session.content)
            : 'ทดลองตัวเลือกไม่ได้',
      })
    }
  }
  const choose = (choiceId: string) =>
    resolve((save, trace) => chooseV2(session.content, save, choiceId, trace))
  const chooseMany = (choiceIds: string[]) =>
    resolve((save, trace) =>
      chooseV2Many(session.content, save, choiceIds, trace),
    )
  const chooseProgram = (facultyId: string, majorId: string) =>
    resolve((save, trace) =>
      chooseV2Program(session.content, save, facultyId, majorId, trace),
    )
  const chooseElective = (electiveId: string) =>
    resolve((save, trace) =>
      chooseV2Elective(session.content, save, electiveId, trace),
    )

  const event = session.content.events.find(
    (item) => item.id === session.save?.currentEventId,
  )
  const summary = session.save?.endingId
    ? summarizeV2Life(session.content, session.save)
    : null

  return (
    <dialog
      ref={dialogRef}
      className="bo-preview-dialog"
      {...backdrop}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(cancelEvent) => {
        cancelEvent.preventDefault()
        onClose()
      }}
    >
      <div className="bo-preview-dialog-inner">
        <div className="bo-section-heading bo-preview-dialog-heading">
          <div>
            <p className="eyebrow">Preview · ไม่บันทึกเซฟ</p>
            <h2 id={titleId} className="text-xl font-extrabold">
              ทดลองเหตุการณ์
            </h2>
            <p id={descriptionId} className="muted text-sm">
              อ่านบทสนทนาและเลือกทางในร่างปัจจุบัน
            </p>
          </div>
          <div className="bo-preview-dialog-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={restart}
            >
              เริ่มใหม่
            </button>
            <button
              ref={closeRef}
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              ปิด
            </button>
          </div>
        </div>
        {summary ? (
          <EndingView
            summary={summary}
            portraitPath={playerPortraitPath(
              session.content.names,
              session.content.assets,
              session.save?.nameId ?? '',
            )}
            program={playerProgram(
              session.content.faculties,
              session.content.majors,
              session.save?.facultyId ?? null,
              session.save?.majorId ?? null,
            )}
            onRestart={restart}
          />
        ) : event && session.save ? (
          <SceneView
            key={`${event.id}-${session.run}`}
            event={event}
            save={session.save}
            assets={session.content.assets}
            characters={session.content.characters}
            faculties={session.content.faculties}
            majors={session.content.majors}
            electives={session.content.electives}
            names={session.content.names}
            loanRatePercent={session.content.config.loan.annualRatePercent}
            recaps={getV2LastRecaps(session.content, session.save)}
            error={session.error}
            onChoose={choose}
            onChooseMany={chooseMany}
            onChooseProgram={chooseProgram}
            onChooseElective={chooseElective}
            onHome={onClose}
            homeLabel="ปิด Preview"
          />
        ) : (
          <p className="bo-error panel p-5" role="alert">
            {session.error ?? 'ไม่พบเหตุการณ์สำหรับทดลอง'}
          </p>
        )}
        {session.save && !session.placed && (
          <p className="bo-flow-warning" role="status">
            เหตุการณ์นี้ยังไม่ได้วางบนกระดาน Flow ทดลองได้เฉพาะเหตุการณ์นี้
          </p>
        )}
        <section className="bo-trace" aria-label="เส้นทางที่ผ่าน">
          <h3 className="font-extrabold">เส้นทางที่ผ่าน</h3>
          {session.save && (
            <p className="muted text-sm">
              Flag ตอนนี้:{' '}
              {Object.entries(session.save.flags)
                .map(([flag, value]) => `${flag} = ${value ? 'จริง' : 'เท็จ'}`)
                .join(', ') || 'ยังไม่มี'}
            </p>
          )}
          {session.steps.length ? (
            <ol>
              {session.steps.map((step, index) => {
                const line = describeFlowStep(step, session.content)
                return (
                  <li
                    key={index}
                    data-passed={
                      line.passed === undefined ? undefined : line.passed
                    }
                  >
                    <span>{line.text}</span>
                    {line.detail && <small>{line.detail}</small>}
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="muted text-sm">
              เลือกคำตอบแล้วเส้นทาง เงื่อนไข และการสุ่มจะแสดงที่นี่
              พร้อมไฮไลต์บนกระดาน Flow
            </p>
          )}
        </section>
      </div>
    </dialog>
  )
}
