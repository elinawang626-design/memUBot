import { beforeEach, describe, expect, it, vi } from 'vitest'

const { loadSettingsMock, searchMemoriesMock } = vi.hoisted(() => ({
  loadSettingsMock: vi.fn(),
  searchMemoriesMock: vi.fn()
}))

vi.mock('../../config/settings.config', () => ({
  loadSettings: loadSettingsMock
}))

vi.mock('../../services/local-memory-control.service', () => ({
  localMemoryControlService: {
    searchMemories: searchMemoriesMock
  }
}))

import { executeMemuMemory } from '../memu.executor'

describe('executeMemuMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
  })

  it('falls back to local memory when remote memU config is incomplete', async () => {
    loadSettingsMock.mockResolvedValue({
      memuBaseUrl: '',
      memuApiKey: 'token-only',
      memuUserId: '',
      memuAgentId: ''
    })
    searchMemoriesMock.mockResolvedValue([{ memory: { id: 'mem_1' } }])

    const result = await executeMemuMemory('trip plans')

    expect(searchMemoriesMock).toHaveBeenCalledWith({
      query: 'trip plans',
      limit: 10,
      include_archived: false,
      exclude_sensitive: true,
      min_confidence: 0.2
    })
    expect(result).toEqual({
      success: true,
      data: {
        source: 'local-controlled-memory',
        query: 'trip plans',
        results: [{ memory: { id: 'mem_1' } }]
      }
    })
  })

  it('falls back to local memory when remote retrieve returns a non-OK response', async () => {
    loadSettingsMock.mockResolvedValue({
      memuBaseUrl: 'https://memu.example',
      memuApiKey: 'token',
      memuUserId: 'user-1',
      memuAgentId: 'agent-1'
    })
    searchMemoriesMock.mockResolvedValue([{ memory: { id: 'mem_2' } }])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: 'service unavailable' })
    }))

    const result = await executeMemuMemory('roadmap')

    expect(result).toEqual({
      success: true,
      data: {
        source: 'local-controlled-memory',
        query: 'roadmap',
        results: [{ memory: { id: 'mem_2' } }],
        fallback_reason: 'service unavailable'
      }
    })
  })
})
