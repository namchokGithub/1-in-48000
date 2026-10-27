# UI behavior contract

The Player and local BO share the controls and base colors in `src/shared/styles.css`. Both HTML entries load Noto Sans Thai Light 300; shared CSS holds that weight across headings, buttons, and form fields. BO owns one custom Select for dropdowns and uses native inputs, checkboxes, and a modal dialog for other controls.

## Canonical UI Map

| Capability     | Canonical owner                           | Source of truth                                   | Allowed variants                                      | Verification                                    |
| -------------- | ----------------------------------------- | ------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| Select/Listbox | Shared BO `Select` component              | `src/features/bo/Select.tsx` and `DESIGN.md`      | Optional Asset ID, required event type and references | Manual keyboard, popup, and narrow-screen check |
| Form           | BO editor components and shared V2 schema | `src/features/bo/` and `src/content/v2/schema.ts` | Story, speaker, scene, and sound fields               | Focused validation tests and manual form check  |
| Scrollbar      | Global application stylesheet             | `src/shared/styles.css`                           | BO list and preview overflow regions                  | Manual narrow-screen check                      |
| CRUD           | BO draft state and dev-only writer        | `src/features/bo/BoApp.tsx` and `bo-server.ts`    | Events, endings, speakers, and assets                 | Focused file-write test and manual save check   |
| Timeline       | BO timeline board and event draft         | `src/features/bo/TimelineBoard.tsx`               | Native drag and drop; form and up/down fallback       | Focused move tests and manual width check       |

BO Save writes only after client and server validation. A failed save keeps the draft visible and leaves the content file intact. The author reviews `contentVersion` and save migration before publishing edited content.

BO and Player use `public/content-v2`. The story editor keeps line and choice order in the JSON arrays; drag and up/down actions produce the same order. Inactive events remain editable but are skipped by the V2 engine. A chance effect stores its percentage, display mode, and separate success/failure state effects. Preview uses the Player scene and shared V2 engine in a modal without writing a save.

Speakers write `characters.json`; scene images and BGM/SFX write `assets.json`. Deletion is confirmed and remains reversible in the draft. Broken references or missing files block Save. Story IDs use `snake_case`; the editor gives field-level feedback and can generate unique IDs.

The BO toolbar owns Save, Undo, Redo, and Preview. `draftHistory.ts` owns reversible draft snapshots; the shared confirmation dialog owns delete confirmation. Preview opens the modal from the toolbar or a timeline card.

The Player picks an editable starting name from `names.json`. Selecting a random background hides which card was chosen in the creation form; manually choosing a card restores the visible selection. Choice buttons show stat effects and the engine's effective chance percentage, respecting each chance effect's display mode. The scene's study timeline extends from four to six or eight years according to the current year. The ending lists saved event choices, times, and chance outcomes. Submitting a new life replaces the single save slot without a second overwrite prompt.

Player content uses the same width as its header; the start form and home card are no longer narrower. Action groups align right, and the scene title appears only above the image. The Player owns light and dark Cozy campus theme tokens scoped to its shell, while BO keeps the base teal tokens. Theme choice persists outside the game save and applies to loading and error states. The music control is a single pressed-state on/off button, with a 20% default for new settings and preserved prior BGM volume on migration. Music starts after a user action, follows event BGM when available, and continues on home, creation, and ending pages while enabled.

The selected BO tab is reflected in the `/content-manage` URL so a development reload after saving content returns the author to the same tab.
