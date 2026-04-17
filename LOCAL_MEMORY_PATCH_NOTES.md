# Local memory patch notes

This package is based on `memUBot-main-local-memory-explainability` and includes a focused follow-up patch to make the local memory path more usable.

## What was patched

- Switched memorization to **auto-select local provider** when no remote memU API key is configured.
- Fixed the **duplicate local write / queue retention bug** by clearing queued messages after successful local memorization.
- Added a **local fallback** for `memu_memory` retrieval, so memory retrieval can work without cloud memU.
- Added **delete by source platform** through service, IPC, preload, and renderer hook.
- Expanded local list/search filters with:
  - `created_after`, `created_before`
  - `updated_after`, `updated_before`
  - `min_confidence`, `min_importance`
- Added basic retention enforcement in local listing by excluding expired memories.
- Added lightweight duplicate avoidance in local memorization.

## Still not fully finished

- Conflict detection is still not fully implemented.
- Time decay is not yet applied as a scoring factor.
- Sensitivity-specific retrieval policy is still basic.
- The local retrieval scoring is heuristic, not embedding-based.
- I did not run a full project build inside this environment, so treat this as a strong code patch rather than a fully validated release build.

## Main files changed

- `src/main/services/memorization.service.ts`
- `src/main/tools/memu.executor.ts`
- `src/main/services/memory/local-memory.store.ts`
- `src/main/services/memory/local-controlled-memory.provider.ts`
- `src/main/services/local-memory-control.service.ts`
- `src/main/ipc/memory.handlers.ts`
- `src/preload/index.ts`
- `src/preload/index.d.ts`
- `src/renderer/src/hooks/useLocalMemoryControls.ts`
