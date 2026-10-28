import { useEffect, useId, useRef, useState } from 'react'
import type { V2Content } from '../../content/v2/schema'
import {
  chooseV2,
  chooseV2Elective,
  chooseV2Many,
  chooseV2Program,
  summarizeV2Life,
} from '../../engine/v2/game'
import type { V2PlayerSave } from '../../save/v2/schema'
import { EndingView } from '../player/EndingView'
import { SceneView } from '../player/SceneView'
import { createV2PreviewSession } from './preview'

type Session = {
  content: V2Content
  save: V2PlayerSave | null
  error: string | null
  run: number
}

export function PreviewDialog({
  content,
  eventId,
  onClose,
}: {
  content: V2Content
  eventId: string
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  function start(run: number): Session {
    try {
      return { ...createV2PreviewSession(content, eventId), error: null, run }
    } catch (cause) {
      return {
        content,
        save: null,
        error: cause instanceof Error ? cause.message : 'เริ่มทดลองไม่ได้',
        run,
      }
    }
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

  function resolve(action: (current: Session) => V2PlayerSave) {
    setSession((current) => {
      if (!current.save) return current
      try {
        return {
          ...current,
          save: action(current),
          error: null,
        }
      } catch (cause) {
        return {
          ...current,
          error: cause instanceof Error ? cause.message : 'ทดลองตัวเลือกไม่ได้',
        }
      }
    })
  }
  const choose = (choiceId: string) =>
    resolve((current) => chooseV2(current.content, current.save!, choiceId))
  const chooseMany = (choiceIds: string[]) =>
    resolve((current) =>
      chooseV2Many(current.content, current.save!, choiceIds),
    )
  const chooseProgram = (facultyId: string, majorId: string) =>
    resolve((current) =>
      chooseV2Program(current.content, current.save!, facultyId, majorId),
    )
  const chooseElective = (electiveId: string) =>
    resolve((current) =>
      chooseV2Elective(current.content, current.save!, electiveId),
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
              onClick={() => setSession((current) => start(current.run + 1))}
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
            onHome={onClose}
            onRestart={() => setSession((current) => start(current.run + 1))}
            homeLabel="ปิด Preview"
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
      </div>
    </dialog>
  )
}
