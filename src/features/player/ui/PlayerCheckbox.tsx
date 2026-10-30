import type { ReactNode } from 'react'

export function PlayerCheckbox({
  checked,
  disabled = false,
  onChange,
  children,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="player-option player-checkbox" data-checked={checked}>
      <input
        className="sr-only"
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(change) => onChange(change.target.checked)}
      />
      <span className="player-checkbox-box" aria-hidden="true">
        {checked ? '✓' : ''}
      </span>
      <span className="player-option-body">{children}</span>
    </label>
  )
}
