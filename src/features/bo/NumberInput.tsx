import { useState, type InputHTMLAttributes } from 'react'

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange'
> & {
  value: number
  onValueChange: (value: number) => void
  /** Drop the fraction before sending the value. */
  integer?: boolean
}

/**
 * Number field that keeps the text while it is typed, so "-", an empty
 * field, or "1." do not snap back to 0. It sends a value only when the text
 * reads as a number, and shows the stored value again on blur.
 */
export function NumberInput({
  value,
  onValueChange,
  integer = false,
  onBlur,
  ...props
}: Props) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      {...props}
      type="number"
      value={draft ?? (Number.isFinite(value) ? String(value) : '')}
      onChange={(event) => {
        const text = event.target.value
        setDraft(text)
        if (!text.trim()) return
        const parsed = Number(text)
        if (Number.isFinite(parsed))
          onValueChange(integer ? Math.trunc(parsed) : parsed)
      }}
      onBlur={(event) => {
        setDraft(null)
        onBlur?.(event)
      }}
    />
  )
}
