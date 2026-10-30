import { useRef, type PointerEvent } from 'react'

function onBackdrop(event: PointerEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return false
  const box = event.currentTarget.getBoundingClientRect()
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  )
}

// Closes a modal dialog when a press starts and ends on its backdrop. A press
// while a dropdown list is open only closes that list.
export function useBackdropClose(onClose: () => void) {
  const pressed = useRef(false)
  return {
    onPointerDown(event: PointerEvent<HTMLDialogElement>) {
      pressed.current =
        onBackdrop(event) &&
        !event.currentTarget.querySelector('[role="listbox"]')
    },
    onPointerUp(event: PointerEvent<HTMLDialogElement>) {
      if (pressed.current && onBackdrop(event)) onClose()
      pressed.current = false
    },
  }
}
