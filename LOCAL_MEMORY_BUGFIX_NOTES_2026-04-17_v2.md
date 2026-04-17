# Local memory bugfix notes (2026-04-17 v2)

This package includes the following fixes:

1. Remote memU failures no longer delete queued messages before successful persistence.
2. Remote memU success path no longer removes queued messages twice.
3. Remote provider selection now requires full memU configuration, not only an API key.
4. When remote memorization cannot start, the service falls back to local controlled memory.
5. `doNotRememberThis()` now reuses an existing suppression rule instead of creating duplicates.
6. Conflict notes are deduplicated, and conflict state is recalculated so stale conflict metadata is cleared.
7. The Node engine requirement was relaxed from `>=23.11.1` to `>=22.0.0` to avoid blocking install in common environments.

Files changed:
- `package.json`
- `src/main/services/memorization.service.ts`
- `src/main/services/local-memory-control.service.ts`
- `src/main/services/memory/remote-memu.provider.ts`
- `src/main/services/memory/local-memory.store.ts`
