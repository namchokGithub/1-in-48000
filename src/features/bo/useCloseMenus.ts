import { useEffect } from 'react'

const OPEN_MENUS = 'details.bo-more[open], details.bo-flow-menu[open]'

// `···` and toolbar menus are <details>; close them after an action, on a
// press outside, and on Escape.
export function useCloseMenus() {
  useEffect(() => {
    const openMenus = () => [
      ...document.querySelectorAll<HTMLDetailsElement>(OPEN_MENUS),
    ]
    function onPointerDown(event: PointerEvent) {
      for (const menu of openMenus())
        if (!menu.contains(event.target as Node)) menu.open = false
    }
    function onClick(event: MouseEvent) {
      const action = (event.target as Element).closest('button')
      const menu = action?.closest<HTMLDetailsElement>('details')
      if (menu?.matches(OPEN_MENUS)) menu.open = false
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      const menus = openMenus()
      if (!menus.length) return
      event.preventDefault()
      for (const menu of menus) menu.open = false
      menus[0].querySelector('summary')?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('click', onClick)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('click', onClick)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [])
}
