## 29. Flow validator

**Status:** Done

- Errors: broken edges, missing targets, unconnected choices, Condition nodes without an output, Random nodes without a fallback.
- Warnings: unreachable events and loops that may never exit.
- Shared by BO validation and the local writer before save.

**Done when:** focused tests cover each error and warning.

Completed 2026-10-29. `src/content/v2/flowValidator.ts` exports `validateV2Flow(flow, events)`, which returns errors and warnings. Errors: an unconnected choice or selection event, a Condition node without a pass or fail edge, a Random node without an after or fallback edge, and a Next Period node with no edge. Broken edges and missing targets were already rejected by the flow schema and reference checks from Step 27. Warnings: a port whose edges are all conditional, a Next Period node without `next` or with only one of `graduate`/`extend`, nodes unreachable from Start, and loops with no unconditional exit and no Next Period node inside. The content schema includes the errors, so both the BO draft check and the local writer reject them; warnings are for the BO board in Step 31. The converted live flow has no errors or warnings. Focused tests cover each error and warning.
