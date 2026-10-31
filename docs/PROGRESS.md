# Progress

Detailed implementation status. `README.md` holds the high-level roadmap; keep both aligned when a status changes materially.

Status values: `Todo`, `In progress`, `Blocked`, `Done`.

## Open work index

Every item not `Done`. Update this section whenever an item's status changes.

V4 (Steps 27–36) was accepted by the author on 2026-10-29.

Steps 37–41 were accepted by the author on 2026-10-30.

| #   | Step                    | Status      | Depends on |
| --- | ----------------------- | ----------- | ---------- |
| 42  | Play keyboard shortcuts | In progress | —          |

The production release is still deferred while the author makes further adjustments; Years 5–8 story content remains future work (see `README.md`).

## Open decisions

No open decisions. The loan rules for 40.3 are recorded in `docs/DECISIONS.md` ("Automatic loans as negative money").

V4 decisions 1–9 were resolved on 2026-10-29 and are recorded in `docs/DECISIONS.md` ("Graph-driven story flow").

## Future

- Share a life result (not scheduled).
- Privacy policy and terms pages (not scheduled). The game keeps its save, theme, and music settings only in the browser's localStorage, has no accounts, and sends nothing to a server, so the author deferred these pages.

Resolved choices are recorded in `docs/DECISIONS.md`.

Implementation details for completed steps are recorded in [`COMPLETE-LOG.md`](COMPLETE-LOG.md).

## 42. Play keyboard shortcuts

**Status:** In progress

Source: `docs/LOCAL.md` (`docs/image/LOCAL/1793375039054.png`).

- Space or Enter reads the next line; on the last line it picks the highlighted choice, which starts at the first choice that can be picked.
- ↑ and ↓ move the highlight between choices and skip locked ones. In a multi-select event, Space ticks the highlighted choice and Enter confirms.
- Shortcuts stay off while typing, inside the program and elective dropdowns, in a dialog, and on the year summary.
- A key guide under the dialogue box, hidden on devices without a keyboard.
- The dialogue box overlaps the bottom of the scene a little, like a visual novel.

**Done when:** the author can play an event with the keyboard alone and accepts the layout by eye.

2026-10-31: Implemented, waiting for the author's check. `nextEnabledIndex` moves the highlight past locked choices (focused test); the highlight is real focus, so a focused button or checkbox keeps its own Space and Enter. Reading the last line with the keyboard focuses the first choice that can be picked. Shortcuts are off in the BO preview because it runs inside a dialog. The desktop play screen stops growing at 1110px tall, or sooner when the width already limits the 16:9 scene, and the scene frame is never taller than the scene; the content stays at the top, the dialogue box always overlaps the picture, and spare space falls below the footer. Checked in the browser at 1280×1300, 1366×768, 1600×1400, 1920×1080, and 2400×1600.
