# Decisions

## 2026-10-26 — Development-only BO entry

Use `bo.html` as a second Vite development entry and set the production Rollup input to `index.html`. This lets the author open BO locally while keeping its code and HTML out of the public build. The dev server binds to `127.0.0.1`.
