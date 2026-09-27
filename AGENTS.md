# Development Environment

## Terminal

Prefer modern CLI tools when available.

- Use `rg` instead of `grep`.

- Use `fd` instead of `find`.

- Use `bat` instead of `cat`.

- Use `eza` instead of `ls`.

- Use `zoxide` for project navigation.

- Use `gh` for GitHub operations.

- Use `uv` instead of `pip` when appropriate.

- Prefer `git` CLI over manual file operations.

- Use `jq` for JSON processing when available.

Always check whether a preferred tool exists before falling back to POSIX equivalents.

## Development

Use Serena for:

- code navigation

- symbol lookup

- finding references

- semantic refactoring

Use Context7 whenever implementing or modifying:

- Three.js

- TypeScript

- external libraries

- APIs

Never rely on potentially outdated remembered documentation when Context7 is available.

For browser projects, use Playwright to verify functionality before declaring work complete.

Prefer the smallest, cleanest implementation over the fastest one.

Avoid unnecessary abstraction.

Preserve existing architecture unless explicitly asked to redesign it.
<!-- cortex-protocol:start -->
## Cortex memory protocol

This repo's Cortex namespace is `steam-tycoon`. Always pass it; never read or write another repo's namespace.

**At task start**
1. `memory_search` with namespace `steam-tycoon` and a targeted query for the task at hand.
2. If that returns nothing useful, call `memory_context` for `steam-tycoon`.
3. If memory has nothing relevant, derive decisions from the current repository — the code is the source of truth, and memory may be stale.

**During work**
- Use `memory_search` / `memory_context` when historical decisions matter.
- Run `contradiction_check` before recording knowledge that could conflict with what is stored.
- Do not write routine session chatter to Cortex.

**At task end**, write (`memory_ingest` / `memory_ingest_batch`) only durable, reusable project knowledge: decisions, invariants, architectural constraints, verified procedures, and important gotchas. Never store generic session summaries, secrets or credentials, unverified guesses, or temporary debugging noise.
<!-- cortex-protocol:end -->
