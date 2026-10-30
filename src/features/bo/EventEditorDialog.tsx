import { useEffect, useId, useRef, type ComponentProps } from 'react'
import { V2EventEditor } from './V2EventEditor'
import { useBackdropClose } from './useBackdropClose'

export function EventEditorDialog({
  onClose,
  onPreview,
  ...editor
}: ComponentProps<typeof V2EventEditor> & {
  onClose: () => void
  onPreview: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const backdrop = useBackdropClose(onClose)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    closeRef.current?.focus()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="bo-preview-dialog"
      aria-labelledby={titleId}
      {...backdrop}
      onCancel={(cancelEvent) => {
        cancelEvent.preventDefault()
        onClose()
      }}
    >
      <div className="bo-preview-dialog-inner">
        <div className="bo-section-heading bo-preview-dialog-heading">
          <div>
            <p className="eyebrow">Flow เรื่อง · แก้ในร่าง</p>
            <h2 id={titleId} className="text-xl font-extrabold">
              แก้เหตุการณ์
            </h2>
            <p className="muted text-sm">
              การ์ดบนกระดานอัปเดตทันที กดบันทึก Flow เรื่องเพื่อเขียนไฟล์
            </p>
          </div>
          <div className="bo-preview-dialog-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onPreview}
            >
              ทดลองเหตุการณ์
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
        <V2EventEditor {...editor} />
      </div>
    </dialog>
  )
}
