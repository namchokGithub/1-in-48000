# Player dropdown keyboard navigation design

## Intent

Let keyboard players continue from the final dialogue line into program and
elective dropdowns, without changing the existing confirmation step.

## Goals

- Include dropdown triggers in the scene's keyboard choice order.
- Keep `PlayerSelect` responsible for its own Space, Enter, and arrow-key
  behavior once focused.

## Non-goals

- Do not auto-submit program, elective, or multiple-choice selections.
- Do not change mouse or touch interactions, copy, or layout.

## Approach

Extend `SceneView`'s existing focusable-choice query to include
`.player-select-trigger`. This uses the existing focus and scrolling path;
the global key handler already exempts `[role="combobox"]`, so `PlayerSelect`
continues to handle its own keys. Searchable dropdowns move focus into their
search input after opening, so that input must also handle ArrowUp, ArrowDown,
Enter, and Escape; Space remains text input.

## Verification

Add focused regression tests for the choice-element query and option-index
navigation, then lint the touched files.
