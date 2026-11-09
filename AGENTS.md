# AGENTS.md

Instructions for AI agents (Codex and others). Start with `README.md`,
`docs/ENGINE.md` (territory rules) and `docs/API.md`.

## Code Review Rules

- Flag any migration that drops, renames or rewrites existing data. The
  deploy applies migrations before the new code and a rollback leaves them
  in place, so only adding tables and columns is safe.
- Flag renamed or removed fields in API responses from `worker/`. Older
  iPhone app versions keep calling the old shape; add fields instead.
- Flag changes to capture rules in `src/lib/engine/` without tests. The
  engine must stay deterministic.
- Flag new routes without an auth check, and GPS tracks or personal data
  written to logs.
