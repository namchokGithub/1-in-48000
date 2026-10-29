import { useEffect, useRef, useState } from 'react'

export function CopyIdButton({
  value,
  label = 'ID',
}: {
  value: string
  label?: string
}) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setStatus('idle'), 1500)
  }

  return (
    <button
      type="button"
      className="button button-secondary bo-copy-id"
      aria-label={`คัดลอก ${label}`}
      disabled={!value}
      onClick={copy}
    >
      <span aria-live="polite">
        {status === 'copied'
          ? 'คัดลอกแล้ว ✓'
          : status === 'failed'
            ? 'คัดลอกไม่ได้'
            : 'คัดลอก'}
      </span>
    </button>
  )
}
