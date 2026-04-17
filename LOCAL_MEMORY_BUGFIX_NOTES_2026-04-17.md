# Local memory bugfix notes

Patched issues:
- allow explicit `retention_until: null` during memory updates
- tighten `sensitivity_level` typing across service/preload/renderer hook
- add minimal IPC validation for local memory create/update/search/list operations
- finalize remote memorization task state after success/failure/error
- treat non-2xx memU retrieve responses as failures instead of successes
- default manual remember action to `memory_type: manual_note` in renderer hook

Files changed:
- src/main/services/memory/local-memory.store.ts
- src/main/services/local-memory-control.service.ts
- src/main/services/memorization.service.ts
- src/main/tools/memu.executor.ts
- src/main/ipc/memory.handlers.ts
- src/preload/index.d.ts
- src/renderer/src/hooks/useLocalMemoryControls.ts
