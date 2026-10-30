import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { filterOptionIndexes, isSearchable } from './dropdownFilter'

type OptionProps = { value: string; children: ReactNode; disabled?: boolean }
type Position = { top: number; left: number; width: number; maxHeight: number }

export function BoDropdown({
  value,
  onChange,
  children,
  className = 'field',
  disabled = false,
  label,
}: {
  value: string
  onChange: (event: { target: { value: string } }) => void
  children: ReactNode
  className?: string
  disabled?: boolean
  label?: string
}) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const typeaheadRef = useRef('')
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState<Position | null>(null)
  const [layer, setLayer] = useState<HTMLElement | null>(null)
  const positioned = position !== null
  const [inferredLabel, setInferredLabel] = useState('')
  const options = useMemo(
    () =>
      Children.toArray(children)
        .filter(
          (child) =>
            isValidElement<OptionProps>(child) && child.type === 'option',
        )
        .map((child) => {
          const option = child as React.ReactElement<OptionProps>
          return {
            value: option.props.value,
            label: Children.toArray(option.props.children).join(''),
            disabled: option.props.disabled ?? false,
          }
        }),
    [children],
  )
  const selected = options.findIndex((option) => option.value === value)
  const searchable = isSearchable(options.length)
  const visible = searchable
    ? filterOptionIndexes(options, query)
    : options.map((_, index) => index)
  const selectedLabel = options[selected]?.label ?? value ?? 'เลือก…'

  useLayoutEffect(() => {
    const visibleLabel = triggerRef.current
      ?.closest('label')
      ?.querySelector('span')
      ?.textContent?.trim()
    setInferredLabel(visibleLabel ?? '')
  }, [])

  useEffect(() => {
    return () => {
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current)
    }
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    setLayer(triggerRef.current?.closest('dialog') ?? document.body)
    const update = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const below = window.innerHeight - rect.bottom - 8
      const above = rect.top - 8
      const useAbove = below < 180 && above > below
      const available = useAbove ? above : below
      const maxHeight = Math.min(280, Math.max(80, available - 4))
      setPosition({
        top: useAbove ? rect.top - maxHeight - 4 : rect.bottom + 4,
        left: Math.max(
          8,
          Math.min(rect.left, window.innerWidth - rect.width - 8),
        ),
        width: Math.min(rect.width, window.innerWidth - 16),
        maxHeight,
      })
    }
    update()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        !triggerRef.current?.contains(target) &&
        !listRef.current?.contains(target)
      ) {
        setOpen(false)
      }
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
    if (open && positioned && searchable) searchRef.current?.focus()
  }, [open, positioned, searchable])

  useEffect(() => {
    if (!open || !positioned || active < 0) return
    const list = listRef.current
    const option = list?.querySelector<HTMLElement>(
      `[data-option-index="${active}"]`,
    )
    if (!list || !option) return
    const listRect = list.getBoundingClientRect()
    const optionRect = option.getBoundingClientRect()
    if (optionRect.top < listRect.top)
      list.scrollTop -= listRect.top - optionRect.top
    else if (optionRect.bottom > listRect.bottom) {
      list.scrollTop += optionRect.bottom - listRect.bottom
    }
  }, [open, active, positioned])

  // Next enabled visible option after `from`; -1 when none is left.
  function nextEnabled(from: number, direction: -1 | 1, pool = visible) {
    const enabled = pool.filter((index) => !options[index].disabled)
    if (!enabled.length) return -1
    const at = enabled.indexOf(from)
    if (at < 0) return direction === 1 ? enabled[0] : enabled.at(-1)!
    return enabled[(at + direction + enabled.length) % enabled.length]
  }

  function openList(query = '') {
    setQuery(query)
    const pool = filterOptionIndexes(options, query)
    setActive(!query && selected >= 0 ? selected : nextEnabled(-1, 1, pool))
    setOpen(true)
  }

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  function commit(index: number) {
    const option = options[index]
    if (!option || option.disabled) return
    if (option.value !== value) onChange({ target: { value: option.value } })
    close()
  }

  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(nextEnabled(active, event.key === 'ArrowDown' ? 1 : -1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (visible.includes(active)) commit(active)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      if (open) setActive(nextEnabled(active, direction))
      else openList()
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setQuery('')
      setActive(
        nextEnabled(
          -1,
          event.key === 'Home' ? 1 : -1,
          options.map((_, i) => i),
        ),
      )
      setOpen(true)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (open) commit(active)
      else openList()
    } else if (event.key === 'Escape') {
      if (open) event.preventDefault()
      setOpen(false)
    } else if (event.key === 'Tab') {
      setOpen(false)
    } else if (
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      if (searchable) {
        event.preventDefault()
        openList(event.key)
        return
      }
      typeaheadRef.current += event.key.toLocaleLowerCase('th-TH')
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current)
      typeaheadTimer.current = setTimeout(() => {
        typeaheadRef.current = ''
      }, 600)
      const found = options.findIndex(
        (option) =>
          !option.disabled &&
          option.label
            .toLocaleLowerCase('th-TH')
            .startsWith(typeaheadRef.current),
      )
      if (found >= 0) {
        setActive(found)
        setOpen(true)
      }
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-label={label || inferredLabel || 'เลือกค่า'}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-activedescendant={
          open && active >= 0 ? `${id}-option-${active}` : undefined
        }
        className={`${className} bo-select-trigger`}
        disabled={disabled}
        onClick={() => {
          if (open) setOpen(false)
          else openList()
        }}
        onKeyDown={onKeyDown}
      >
        <span className="bo-select-value">{selectedLabel}</span>
        <span className="bo-select-chevron" aria-hidden="true">
          ⌄
        </span>
      </button>
      {open &&
        position &&
        layer &&
        createPortal(
          <div ref={listRef} className="bo-select-list" style={position}>
            {searchable && (
              <input
                ref={searchRef}
                className="field bo-select-search"
                type="search"
                value={query}
                placeholder="ค้นหา…"
                aria-label={`ค้นหา${label || inferredLabel || 'ตัวเลือก'}`}
                aria-controls={`${id}-list`}
                aria-activedescendant={
                  active >= 0 ? `${id}-option-${active}` : undefined
                }
                onChange={(event) => {
                  const next = event.target.value
                  setQuery(next)
                  setActive(
                    nextEnabled(-1, 1, filterOptionIndexes(options, next)),
                  )
                }}
                onKeyDown={onSearchKeyDown}
              />
            )}
            <div
              id={`${id}-list`}
              role="listbox"
              aria-label={label || inferredLabel || 'ตัวเลือก'}
            >
              {visible.length ? (
                visible.map((index) => {
                  const option = options[index]
                  return (
                    <div
                      key={`${option.value}-${index}`}
                      id={`${id}-option-${index}`}
                      role="option"
                      aria-selected={option.value === value}
                      aria-disabled={option.disabled || undefined}
                      data-active={index === active}
                      data-option-index={index}
                      className="bo-select-option"
                      onMouseEnter={() => setActive(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => commit(index)}
                    >
                      {option.label}
                    </div>
                  )
                })
              ) : (
                <p className="bo-select-empty">
                  {options.length ? 'ไม่พบตัวเลือก' : 'ไม่มีตัวเลือก'}
                </p>
              )}
            </div>
          </div>,
          layer,
        )}
    </>
  )
}
