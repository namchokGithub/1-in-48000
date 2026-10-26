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

## Visual language

Pale teal canvas, white surfaces, dark blue-green ink, and a teal action color evoke campus notebooks without imitating paper texture. The scene placeholder is a geometric campus silhouette until asset IDs point to real art. One warm accent highlights progress. Rounded panels and fine borders carry hierarchy; shadows stay subtle.

## Interaction states

Buttons have visible hover, pressed, disabled, and keyboard focus states. Form errors appear beside the relevant field. Loading and content errors keep a stable panel footprint. Restart requires an explicit second action before replacing a save. Motion is brief and removed when reduced motion is requested. Scrollbars remain visible and inherit the global theme.
