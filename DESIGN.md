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
playerLight:
  canvas: '#FFFDF7'
  card: '#FFF9EE'
  border: '#E7DDBD'
  primary: '#D9B85F'
  primarySoft: '#F4E6B0'
  text: '#4A4436'
  textSecondary: '#756C58'
playerDark:
  canvas: '#1D1C1A'
  card: '#2B2925'
  border: '#4A4438'
  primary: '#D2B15C'
  primarySoft: '#4B4128'
  text: '#F3EBD7'
  textSecondary: '#D1C5A8'
typography:
  body:
    fontFamily: 'Noto Sans Thai, sans-serif'
    fontWeight: 300
  utility:
    fontFamily: 'Noto Sans Thai, sans-serif'
    fontWeight: 300
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

`src/shared/styles.css` owns the CSS variables. The flat `colors` values above remain the BO/base palette. `playerLight` and `playerDark` map to `.player-shell` and `.player-shell[data-theme='dark']` overrides in that stylesheet; this file records their intent. Tailwind handles layout utilities. Shared `.button`, `.panel`, and `.stat-*` classes consume CSS variables so the screens do not repeat raw colors.

## Layout and type

The scene takes the main column and the stats occupy a side column on desktop; they stack on phones. Player content and header share the same width of at most 76rem, including the start form and home card. Actions align right where space allows. The scene name appears in the title above the image. Both Player and BO load Noto Sans Thai Light 300 from Google Fonts; all text uses that weight, including headings, buttons, and utility labels. Body text has comfortable line height, while small utility labels use spaced Latin numerals sparingly for year and term markers.

BO reuses the same colors, type, controls, and surface treatment. Its working area can grow to 100rem: an item list and editor sit in two columns on wide screens and stack on phones. The event view can switch to an eight-year timeline, with one card per event and a column for each period. Columns wrap to two or one across narrower widths. Native drag and drop moves cards within and across periods; selecting a card opens its form. The form's year/period fields and up/down controls remain available for touch and keyboard use.

BO uses one authored Select for event types, condition operators, references, and Asset IDs. Its portal list matches the trigger width, stays inside the viewport, and supports keyboard selection and typeahead. Boolean fields use checkboxes. A sticky toolbar keeps Save, Undo, Redo, and Preview visible; Preview opens a modal with the Player scene. Deleting an event or ending opens a shared confirmation dialog. The long dialogue and ending fields grow with their content. `premium-ui.json` records authored Select ownership for static audit.

The BO data tabs reuse the list and editor layout for speakers, scene images, and BGM/SFX. Tabs scroll horizontally on narrow screens. Asset paths are entered as manifest paths and checked against local files on Save; scene images have a preview. ID generators sit beside the corresponding fields, while Event and Choice IDs show `snake_case` feedback in place.

The V2 story form uses compact ordered cards for dialogue and choices. Speaker portraits and names lead each line; IDs and unused portrait overrides sit in Advanced details. Choices show effect summary badges while their editing controls stay collapsed until selected. Sentence-style conditions and nested delayed/chance editors keep complex rules readable without placing every input on screen at once. Drag handles indicate reordering, with adjacent up/down buttons for keyboard and touch use.

## Visual language

The Player uses a Cozy campus palette: ivory canvas and cream cards in light mode, charcoal canvas and gray cards in dark mode. Soft gold marks primary actions, selected states, and study progress; large neutral areas keep both themes calm. The scene placeholder keeps its geometric campus silhouette in theme-aware tones until asset IDs point to real art. The BO retains its teal palette. Rounded panels and fine borders carry hierarchy; shadows stay subtle.

## Interaction states

Buttons have visible hover, pressed, disabled, and keyboard focus states. Form errors appear beside the relevant field. Loading and content errors keep a stable panel footprint. New life submission replaces the single save slot without a second confirmation. The background randomizer hides the selected card in the creation form. During a scene, a compact study timeline marks the current year and extends to six or eight years when necessary. Choice information includes stat changes and chance; the ending lists saved decisions in chronological order. The theme switch persists separately from the save. A single music button switches BGM on or off; browser playback begins after an interaction and continues across Player pages. Motion is brief and removed when reduced motion is requested. Scrollbars remain visible and inherit the active Player palette.

BO changes stay in a draft until Save is pressed. The header marks unsaved edits, and validation errors name their content path. The preview is a modal and never persists a save. Deleting an item removes it from the draft; cross-file validation blocks broken references when saving.

Undo and Redo keep up to 100 draft snapshots and clear the redo path after a new edit. The toolbar marks unsaved changes relative to the last successful file save. The confirmation dialog uses the browser's modal focus behavior and returns focus to the editing surface when dismissed.
