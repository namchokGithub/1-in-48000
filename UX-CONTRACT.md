# UI behavior contract

The Player and local BO share the controls and colors in `src/shared/styles.css`. BO owns one custom Select for dropdowns and uses native inputs, checkboxes, and a modal dialog for other controls.

## Canonical UI Map

| Capability     | Canonical owner                             | Source of truth                                | Allowed variants                                      | Verification                                    |
| -------------- | ------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------- |
| Select/Listbox | Shared BO `Select` component                | `src/features/bo/Select.tsx` and `DESIGN.md`   | Optional Asset ID, required event type and references | Manual keyboard, popup, and narrow-screen check |
| Form           | BO editor components and shared Zod schemas | `src/features/bo/` and `src/content/schema.ts` | Event, choice, condition, effect, ending              | Focused validation tests and manual form check  |
| Scrollbar      | Global application stylesheet               | `src/shared/styles.css`                        | BO list and preview overflow regions                  | Manual narrow-screen check                      |
| CRUD           | BO draft state and dev-only writer          | `src/features/bo/BoApp.tsx` and `bo-server.ts` | Events and endings                                    | Focused file-write test and manual save check   |
| Timeline       | BO timeline board and event draft           | `src/features/bo/TimelineBoard.tsx`            | Native drag and drop; form and up/down fallback       | Focused move tests and manual width check       |

BO Save writes only after client and server validation. A failed save keeps the draft visible and leaves the content file intact. The author reviews `contentVersion` and save migration before publishing edited content.

The BO toolbar owns Save, Undo, Redo, and Preview. `draftHistory.ts` owns reversible draft snapshots; the shared confirmation dialog owns delete confirmation. Preview focuses the current preview panel until Step 16 replaces it with a modal.
