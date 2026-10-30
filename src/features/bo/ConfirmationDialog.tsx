import { useEffect, useId, useRef } from 'react'
import { useBackdropClose } from './useBackdropClose'

export function ConfirmationDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const backdrop = useBackdropClose(onCancel)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    cancelRef.current?.focus()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className="bo-confirm-dialog panel"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      {...backdrop}
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <h2 id={titleId}>{title}</h2>
      <p id={descriptionId} className="muted">
        {description}
      </p>
      <div className="bo-confirm-actions">
        <button
          ref={cancelRef}
          type="button"
          className="button button-secondary"
          onClick={onCancel}
        >
          ยกเลิก
        </button>
        <button
          type="button"
          className="button button-danger"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
