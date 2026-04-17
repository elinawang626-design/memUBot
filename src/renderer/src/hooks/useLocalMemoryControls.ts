import { useCallback, useEffect, useState } from 'react'

export interface LocalMemoryDraftInput {
  content: string
  memory_type?: string
  source_platform?: string | null
  source_excerpt?: string | null
  confidence?: number
  importance?: number
  sensitivity_level?: 'normal' | 'work' | 'sensitive'
  retention_until?: number | null
  why_stored?: string | null
}

/**
 * Minimal renderer hook for local controlled-memory actions.
 * This is intentionally thin so UI components can adopt it later
 * without needing a dedicated memory page yet.
 */
export function useLocalMemoryControls() {
  const [capturePaused, setCapturePaused] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const refreshStatus = useCallback(async () => {
    setLoadingStatus(true)
    try {
      const result = await window.memory.getStatus()
      if (result.success && result.data) {
        setCapturePaused(result.data.paused)
      }
    } finally {
      setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    void refreshStatus()
  }, [refreshStatus])

  const rememberThis = useCallback(async (input: LocalMemoryDraftInput) => {
    const { memory_type, ...rest } = input
    return window.memory.rememberThis({
      memory_type: memory_type ?? 'manual_note',
      status: 'active',
      user_control: 'remember',
      ...rest,
    })
  }, [])

  const doNotRememberThis = useCallback(async (input: { content: string; source_platform?: string | null; source_excerpt?: string | null; reason?: string | null }) => {
    return window.memory.doNotRememberThis(input)
  }, [])

  const updateMemory = useCallback(async (id: string, updates: Record<string, unknown>) => {
    return window.memory.update(id, updates)
  }, [])

  const getExplainedMemory = useCallback(async (id: string) => {
    return window.memory.getExplained(id)
  }, [])

  const getMemoryProvenance = useCallback(async (id: string) => {
    return window.memory.getProvenance(id)
  }, [])

  const searchMemories = useCallback(async (query: string, filters: Record<string, unknown> = {}) => {
    return window.memory.search({ query, ...filters })
  }, [])

  const listExplainedMemories = useCallback(async (filters: Record<string, unknown> = {}) => {
    return window.memory.listExplained(filters)
  }, [])

  const deleteMemory = useCallback(async (id: string) => {
    return window.memory.delete(id)
  }, [])

  const deleteMemoriesBySource = useCallback(async (sourcePlatform: string) => {
    return window.memory.deleteBySource(sourcePlatform)
  }, [])

  const pauseCapture = useCallback(async (reason?: string) => {
    const result = await window.memory.pauseCapture(reason)
    if (result.success && result.data) {
      setCapturePaused(result.data.paused)
    }
    return result
  }, [])

  const resumeCapture = useCallback(async (reason?: string) => {
    const result = await window.memory.resumeCapture(reason)
    if (result.success && result.data) {
      setCapturePaused(result.data.paused)
    }
    return result
  }, [])

  return {
    capturePaused,
    loadingStatus,
    refreshStatus,
    rememberThis,
    doNotRememberThis,
    updateMemory,
    getExplainedMemory,
    getMemoryProvenance,
    searchMemories,
    listExplainedMemories,
    deleteMemory,
    deleteMemoriesBySource,
    pauseCapture,
    resumeCapture,
  }
}
