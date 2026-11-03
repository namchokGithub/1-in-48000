# Player Dropdown Keyboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make program and elective dropdowns reachable by the Player keyboard navigation flow.

**Architecture:** Expand the existing `SceneView` choice selector so it returns dropdown triggers in addition to choice buttons and checkbox inputs. The already-existing combobox exclusion leaves focused dropdown key handling to `PlayerSelect`.

**Tech Stack:** React, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-03-player-dropdown-keyboard-design.md`

## Global Constraints

- Preserve the existing confirmation buttons and their explicit submission behavior.
- Do not change visual UI or touch behavior.
- Do not add dependencies.

## Review Focus

- A program or elective dropdown must be the first keyboard focus target when it is the only choice control.
- A focused dropdown must keep its existing Space, Enter, and arrow-key behavior.
- Checkbox and ordinary choice navigation must remain unchanged.

### Task 1: Scene keyboard choice discovery

**Files:**

- Modify: `src/features/player/SceneView.tsx`
- Test: `src/features/player/SceneView.test.tsx`

**Interfaces:**

- Produces: `choiceElements()` returns choice buttons, checkbox inputs, and `.player-select-trigger` buttons in DOM order.

- [x] Write a regression test for the choice selector, including `.player-select-trigger`.
- [x] Run `pnpm exec vitest run src/features/player/choiceNavigation.test.ts` and verify it fails because the trigger is absent from the choice selector.
- [x] Extend `choiceElements()` in `SceneView.tsx` to include `.player-select-trigger`.
- [x] Re-run `pnpm exec vitest run src/features/player/choiceNavigation.test.ts` and verify it passes.
- [x] Run Prettier and ESLint on the touched source and test files.

### Task 2: Searchable dropdown keyboard selection

**Files:**

- Modify: `src/features/player/ui/PlayerSelect.tsx`
- Create: `src/features/player/ui/playerSelectNavigation.ts`
- Test: `src/features/player/ui/playerSelectNavigation.test.ts`

**Interfaces:**

- Produces: `nextPlayerSelectIndex(active, count, key)` wraps the active
  option index for ArrowUp and ArrowDown.

- [x] Write a regression test for arrow navigation in the option list.
- [x] Run `pnpm exec vitest run src/features/player/ui/playerSelectNavigation.test.ts` and verify it fails because the helper is absent.
- [x] Add the helper and use it in the dropdown trigger and searchable input; Enter commits the active option and Escape returns focus to the trigger.
- [x] Re-run the focused Player Select and scene-navigation tests; they pass.
- [x] Run Prettier and ESLint on the touched source and test files.
