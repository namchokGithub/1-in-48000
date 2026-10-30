import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'

type Option = { value: string; label: string }
type Position = { top: number; left: number; width: number; maxHeight: number }

export function PlayerSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState<Position | null>(null)
  const [layer, setLayer] = useState<HTMLElement | null>(null)
  const selected = options.findIndex((option) => option.value === value)

  useLayoutEffect(() => {
    if (!open) return
    // Inside the Player shell so the list keeps the Player theme colors.
    setLayer(
      triggerRef.current?.closest<HTMLElement>('.player-shell, dialog') ??
        document.body,
    )
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const below = window.innerHeight - rect.bottom - 8
      const above = rect.top - 8
      const useAbove = below < 160 && above > below
      const maxHeight = Math.min(
        288,
        Math.max(96, (useAbove ? above : below) - 4),
      )
      setPosition({
        top: useAbove ? rect.top - maxHeight - 4 : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight,
      })
    }
    update()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        !triggerRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      )
        setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

  useEffect(() => {
    if (!open || !position) return
    listRef.current
      ?.querySelector<HTMLElement>(`[data-option-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, active, position])

  function openList() {
    setActive(Math.max(0, selected))
    setOpen(true)
  }

  function commit(index: number) {
    const option = options[index]
    if (option && option.value !== value) onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!options.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) return openList()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((active + step + options.length) % options.length)
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setActive(event.key === 'Home' ? 0 : options.length - 1)
      setOpen(true)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) commit(active)
      else openList()
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="player-select">
      <span id={`${id}-label`} className="player-select-label">
        {label}
      </span>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        className="player-select-trigger"
        aria-labelledby={`${id}-label`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        disabled={!options.length}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="player-select-value">
          {options[selected]?.label ?? 'เลือก…'}
        </span>
        <span className="player-select-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
      {open &&
        position &&
        layer &&
        createPortal(
          <div
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="player-select-list"
            style={position}
          >
            {options.map((option, index) => (
              <div
                key={option.value}
                id={`${id}-option-${index}`}
                role="option"
                aria-selected={option.value === value}
                data-active={index === active}
                data-option-index={index}
                className="player-select-option"
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(index)}
              >
                {option.label}
              </div>
            ))}
          </div>,
          layer,
        )}
    </div>
  )
}
