---
version: alpha
name: '1 ใน 48,000'
description: 'A calm Thai campus field guide for a choice-based student story.'
colors:
  ink: '#173544'
  muted: '#55717d'
  canvas: '#eef5f3'
  surface: '#ffffff'
  primary: '#087f79'
  primary-dark: '#066660'
  accent: '#e8a36b'
  line: '#c8dad8'
  danger: '#a63d42'
typography:
  body:
    fontFamily: 'Noto Sans Thai, Sarabun, Thonburi, Leelawadee UI, system-ui, sans-serif'
  utility:
    fontFamily: 'ui-monospace, SFMono-Regular, monospace'
rounded:
  card: '1.25rem'
  control: '0.8rem'
spacing:
  page-max: '76rem'
  section-gap: '1.5rem'
components:
  button: {}
  card: {}
  stat: {}
---

# 1 ใน 48,000 Design System

## North Star

The Player reads like a personal field guide to one student's years at ม.บารพู: clear chapter markers, a generous scene window, and quiet stat readouts. The audience is Thai players using phones or desktops for a 10–20 minute story. The interface uses Thai throughout. It is a product screen with a restrained editorial accent, not a marketing landing page.

## Runtime ownership

`src/shared/styles.css` owns the CSS variables. The values above mirror those variables; this file records their intent. Tailwind handles layout utilities. Shared `.button`, `.panel`, and `.stat-*` classes consume CSS variables so the screens do not repeat raw colors.

## Layout and type

The scene takes the main column and the stats occupy a side column on desktop; they stack on phones. The content width is at most 76rem. Thai-capable system fallbacks avoid a late web-font shift. Body text has comfortable line height, while small utility labels use spaced Latin numerals sparingly for year and term markers.

BO reuses the same colors, type, controls, and surface treatment. Its working area can grow to 100rem: an item list, editor, and preview sit in three columns on wide screens, then stack into two or one column as space narrows. The event view can switch to a four-year timeline, with one card per event and a column for each period. Columns wrap to two or one across narrower widths. Native drag and drop moves cards within and across periods; selecting a card opens its form. The form's year/period fields and up/down controls remain available for touch and keyboard use.

BO uses one authored Select for event types, condition operators, references, and Asset IDs. Its portal list matches the trigger width, stays inside the viewport, and supports keyboard selection and typeahead. Boolean fields use checkboxes. A sticky toolbar keeps Save, Undo, Redo, and Preview visible; Preview moves focus to the existing panel until the modal preview step. Deleting an event or ending opens a shared confirmation dialog. The long dialogue and ending fields grow with their content. `premium-ui.json` records authored Select ownership for static audit.

## Visual language

Pale teal canvas, white surfaces, dark blue-green ink, and a teal action color evoke campus notebooks without imitating paper texture. The scene placeholder is a geometric campus silhouette until asset IDs point to real art. One warm accent highlights progress. Rounded panels and fine borders carry hierarchy; shadows stay subtle.

## Interaction states

Buttons have visible hover, pressed, disabled, and keyboard focus states. Form errors appear beside the relevant field. Loading and content errors keep a stable panel footprint. Restart requires an explicit second action before replacing a save. Motion is brief and removed when reduced motion is requested. Scrollbars remain visible and inherit the global theme.

BO changes stay in a draft until Save is pressed. The header marks unsaved edits, and validation errors name their content path. The preview is a separate panel and never persists a save. Deleting an item removes it from the draft; cross-file validation blocks broken references when saving.

Undo and Redo keep up to 100 draft snapshots and clear the redo path after a new edit. The toolbar marks unsaved changes relative to the last successful file save. The confirmation dialog uses the browser's modal focus behavior and returns focus to the editing surface when dismissed.
