import { useEffect, useRef } from 'react'

export function PlayerConfirmDialog({
  title,
  description,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string
  description?: string
  cancelLabel: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  return (
    <dialog
      ref={ref}
      className="player-dialog"
      aria-labelledby="player-dialog-title"
      onCancel={(event) => {
        event.preventDefault()
        onCancel()
      }}
    >
      <h2 id="player-dialog-title" className="text-xl font-extrabold">
        {title}
      </h2>
      {description && <p className="muted mt-2">{description}</p>}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          className="button button-primary"
          autoFocus
          onClick={onCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className="button button-secondary"
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  )
}
