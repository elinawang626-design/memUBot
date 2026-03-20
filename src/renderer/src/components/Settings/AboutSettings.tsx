import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { appIcon } from '../../assets'

interface LogEntry {
  timestamp: number
  level: 'log' | 'info' | 'warn' | 'error'
  message: string
}

interface AuditLogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  event: string
  traceId?: string
  durationMs?: number
  data?: Record<string, unknown>
  error?: string
}

interface TokenUsage {
  input: number
  output: number
  total: number
}

interface TraceSpan {
  spanId: string
  parentSpanId?: string
  name: string
  startTime: number
  endTime?: number
  durationMs?: number
  status: 'ok' | 'error'
  attributes: Record<string, unknown>
  error?: string
  tokenUsage?: TokenUsage
}

interface TraceEntry {
  traceId: string
  platform: string
  userId?: string
  startTime: number
  endTime?: number
  durationMs?: number
  success?: boolean
  spans: TraceSpan[]
}

interface ToolMetrics {
  callCount: number
  errorCount: number
  totalDurationMs: number
  avgDurationMs: number
}

interface MetricsSummary {
  window: string
  messageCount: number
  successCount: number
  errorCount: number
  avgDurationMs: number
  p95DurationMs: number
  llm: {
    callCount: number
    errorCount: number
    totalInputTokens: number
    totalOutputTokens: number
    avgDurationMs: number
    p95DurationMs: number
  }
  tools: Record<string, ToolMetrics>
  platforms: Record<string, { received: number; processed: number; errors: number }>
}

export function AboutSettings(): JSX.Element {
  const { t } = useTranslation()
  const appName = 'memU bot'
  const [clickCount, setClickCount] = useState(0)
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'console' | 'audit' | 'traces' | 'metrics'>('console')
  const [traces, setTraces] = useState<TraceEntry[]>([])
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set())
  const [metricsSummary, setMetricsSummary] = useState<MetricsSummary | null>(null)
  const [showAgentActivity, setShowAgentActivity] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const logsContainerRef = useRef<HTMLDivElement | null>(null)

  // Load app version from main process
  useEffect(() => {
    window.updater.getVersion().then((result) => {
      if (result.success && result.data) {
        setAppVersion(result.data)
      }
    })
  }, [])

  // Load showAgentActivity setting
  useEffect(() => {
    window.settings.get().then(result => {
      if (result.success && result.data) {
        setShowAgentActivity(result.data.showAgentActivity ?? false)
      }
    })
  }, [])

  const loadTraces = async (date?: string): Promise<void> => {
    const result = await window.settings.getTraces(date)
    if (result.success && result.data) {
      setTraces((result.data as { traces: TraceEntry[] }).traces)
    }
  }

  const loadMetrics = async (): Promise<void> => {
    const result = await window.settings.getMetricsSummary()
    if (result.success && result.data) {
      setMetricsSummary(result.data as MetricsSummary)
    }
  }

  const toggleTrace = (traceId: string): void => {
    setExpandedTraces(prev => {
      const next = new Set(prev)
      if (next.has(traceId)) next.delete(traceId)
      else next.add(traceId)
      return next
    })
  }

  const loadAuditLogs = async (date?: string): Promise<void> => {
    const result = await window.settings.getAuditLogs(date)
    if (result.success && result.data) {
      setAuditLogs(result.data.entries as AuditLogEntry[])
      setAvailableDates(result.data.availableDates as string[])
      if (!selectedDate && result.data.availableDates?.length > 0) {
        setSelectedDate((result.data.availableDates as string[])[0])
      }
    }
  }

  const handleVersionClick = async (): Promise<void> => {
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
    }

    const newCount = clickCount + 1
    setClickCount(newCount)

    if (newCount >= 3) {
      setClickCount(0)
      const result = await window.settings.getLogs()
      if (result.success && result.data) {
        setLogs(result.data.logs)
        setShowLogs(true)
        setTimeout(() => {
          if (logsContainerRef.current) {
            logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
          }
        }, 50)
      }
      await loadAuditLogs()
      await loadTraces()
      await loadMetrics()
    } else {
      clickTimeoutRef.current = setTimeout(() => {
        setClickCount(0)
      }, 1000)
    }
  }

  const refreshLogs = async (): Promise<void> => {
    const result = await window.settings.getLogs()
    if (result.success && result.data) {
      setLogs(result.data.logs)
      setTimeout(() => {
        if (logsContainerRef.current) {
          logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight
        }
      }, 50)
    }
    await loadAuditLogs(selectedDate)
    await loadTraces(selectedDate)
    await loadMetrics()
  }

  const handleDateChange = async (date: string): Promise<void> => {
    setSelectedDate(date)
    await loadAuditLogs(date)
  }

  const handleExportLogs = async (): Promise<void> => {
    const result = await window.settings.exportLogs(selectedDate || undefined)
    if (result.success && result.data) {
      const blob = new Blob([result.data as string], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `memubot-logs-${selectedDate || 'today'}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleToggleAgentActivity = async (): Promise<void> => {
    const newValue = !showAgentActivity
    setShowAgentActivity(newValue)
    await window.settings.save({ showAgentActivity: newValue })
  }

  const clearLogs = async (): Promise<void> => {
    await window.settings.clearLogs()
    setLogs([])
  }

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getLevelColor = (level: LogEntry['level']): string => {
    switch (level) {
      case 'error': return 'text-red-500'
      case 'warn': return 'text-amber-500'
      case 'info': return 'text-blue-500'
      default: return 'text-[var(--text-muted)]'
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{t('settings.about.title')}</h3>
        <p className="text-[12px] text-[var(--text-muted)] mt-0.5">{t('settings.about.description')}</p>
      </div>

      {/* Log Viewer Panel (only shown when activated in production) */}
      {showLogs && (
        <div className="rounded-2xl bg-[#1a1a1a] border border-[var(--border-color)] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#252525] border-b border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <span className="text-[12px] font-medium text-[var(--text-primary)]">Logs</span>
              {/* Tab switcher */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('console')}
                  className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                    activeTab === 'console'
                      ? 'bg-[#333] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Console
                </button>
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                    activeTab === 'audit'
                      ? 'bg-[#333] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Audit
                </button>
                <button
                  onClick={() => setActiveTab('traces')}
                  className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                    activeTab === 'traces'
                      ? 'bg-[#333] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Traces
                </button>
                <button
                  onClick={() => setActiveTab('metrics')}
                  className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                    activeTab === 'metrics'
                      ? 'bg-[#333] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Metrics
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeTab === 'audit' && availableDates.length > 0 && (
                <select
                  value={selectedDate}
                  onChange={e => handleDateChange(e.target.value)}
                  className="px-2 py-0.5 text-[11px] bg-[#333] text-[var(--text-primary)] border border-[var(--border-color)] rounded"
                >
                  {availableDates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              )}
              <button
                onClick={refreshLogs}
                className="px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Refresh
              </button>
              {activeTab === 'console' && (
                <button
                  onClick={clearLogs}
                  className="px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handleExportLogs}
                className="px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Export
              </button>
              <button
                onClick={() => setShowLogs(false)}
                className="px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Close
              </button>
            </div>
          </div>

          {/* Agent Activity Toggle */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#202020] border-b border-[var(--border-color)]">
            <span className="text-[11px] text-[var(--text-muted)]">Show Agent Activity Panel</span>
            <button
              onClick={handleToggleAgentActivity}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                showAgentActivity ? 'bg-emerald-500' : 'bg-[#444]'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  showAgentActivity ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Console Tab */}
          {activeTab === 'console' && (
            <div
              ref={logsContainerRef}
              className="h-64 overflow-y-auto p-2 font-mono text-[11px]"
            >
              {logs.length === 0 ? (
                <div className="text-[var(--text-muted)] text-center py-8">No logs yet</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 py-0.5 hover:bg-[#252525]">
                    <span className="text-[#666] shrink-0">{formatTime(log.timestamp)}</span>
                    <span className={`shrink-0 w-12 ${getLevelColor(log.level)}`}>[{log.level}]</span>
                    <span className="text-[#ccc] whitespace-pre-wrap break-all">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Traces Tab */}
          {activeTab === 'traces' && (
            <div className="h-64 overflow-y-auto p-2 font-mono text-[11px]">
              {traces.length === 0 ? (
                <div className="text-[var(--text-muted)] text-center py-8">No traces for this date</div>
              ) : (
                traces.map((trace) => (
                  <div key={trace.traceId} className="mb-1">
                    <div
                      className="flex gap-2 py-0.5 px-1 hover:bg-[#252525] cursor-pointer rounded"
                      onClick={() => toggleTrace(trace.traceId)}
                    >
                      <span className={trace.success ? 'text-emerald-400' : 'text-red-400'}>{trace.success ? '✓' : '✗'}</span>
                      <span className="text-blue-400 w-14 shrink-0">{trace.platform}</span>
                      <span className="text-[#aaa] w-20 shrink-0">{trace.durationMs}ms</span>
                      <span className="text-[#666]">
                        {new Date(trace.startTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      {trace.spans[0]?.tokenUsage && (
                        <span className="text-amber-400 ml-auto">{trace.spans[0].tokenUsage.total} tokens</span>
                      )}
                      <span className="text-[#555] ml-1">{expandedTraces.has(trace.traceId) ? '▼' : '▶'}</span>
                    </div>
                    {expandedTraces.has(trace.traceId) && (
                      <div className="ml-4 mt-0.5 border-l border-[#333] pl-2 space-y-0.5">
                        {trace.spans.slice(1).map((span) => (
                          <div key={span.spanId} className="flex gap-2 py-0.5">
                            <span className="text-[#444] shrink-0">├─</span>
                            <span className={span.status === 'error' ? 'text-red-400' : 'text-[#888]'} >{span.name}</span>
                            <span className="text-[#555]">{span.durationMs}ms</span>
                            {span.tokenUsage && <span className="text-amber-300">{span.tokenUsage.total}t</span>}
                            {span.error && <span className="text-red-400 truncate">{span.error}</span>}
                          </div>
                        ))}
                        {trace.spans[0]?.tokenUsage && (
                          <div className="text-amber-400 mt-0.5 text-[10px]">
                            Total: {trace.spans[0].tokenUsage.total} tokens (in:{trace.spans[0].tokenUsage.input} out:{trace.spans[0].tokenUsage.output})
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Metrics Tab */}
          {activeTab === 'metrics' && (
            <div className="h-64 overflow-y-auto p-3 font-mono text-[11px]">
              {!metricsSummary ? (
                <div className="text-[var(--text-muted)] text-center py-8">No metrics yet (aggregated every 60s)</div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#252525] rounded p-2">
                      <div className="text-[#666] mb-1">Messages</div>
                      <div className="text-[var(--text-primary)]">{metricsSummary.messageCount} total</div>
                      <div className="text-emerald-400">{metricsSummary.successCount} ok</div>
                      {metricsSummary.errorCount > 0 && <div className="text-red-400">{metricsSummary.errorCount} err</div>}
                    </div>
                    <div className="bg-[#252525] rounded p-2">
                      <div className="text-[#666] mb-1">Latency</div>
                      <div className="text-[var(--text-primary)]">avg {metricsSummary.avgDurationMs}ms</div>
                      <div className="text-amber-400">p95 {metricsSummary.p95DurationMs}ms</div>
                    </div>
                    <div className="bg-[#252525] rounded p-2">
                      <div className="text-[#666] mb-1">LLM</div>
                      <div className="text-[var(--text-primary)]">{metricsSummary.llm.callCount} calls</div>
                      <div className="text-blue-400">{(metricsSummary.llm.totalInputTokens + metricsSummary.llm.totalOutputTokens).toLocaleString()} tokens</div>
                      <div className="text-[#666]">avg {metricsSummary.llm.avgDurationMs}ms</div>
                    </div>
                    <div className="bg-[#252525] rounded p-2">
                      <div className="text-[#666] mb-1">Platforms</div>
                      {Object.entries(metricsSummary.platforms).map(([name, p]) => (
                        <div key={name} className="text-[var(--text-primary)]">
                          {name}: {p.received}↓ {p.processed}↑
                          {p.errors > 0 && <span className="text-red-400"> {p.errors}err</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {Object.keys(metricsSummary.tools).length > 0 && (
                    <div className="bg-[#252525] rounded p-2">
                      <div className="text-[#666] mb-1">Tools</div>
                      {Object.entries(metricsSummary.tools).map(([name, t]) => (
                        <div key={name} className="flex gap-2">
                          <span className="text-[var(--text-primary)]">{name}</span>
                          <span className="text-[#666]">{t.callCount}x</span>
                          <span className="text-[#555]">{t.avgDurationMs}ms</span>
                          {t.errorCount > 0 && <span className="text-red-400">{t.errorCount}err</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Audit Tab */}
          {activeTab === 'audit' && (
            <div className="h-64 overflow-y-auto p-2 font-mono text-[11px]">
              {auditLogs.length === 0 ? (
                <div className="text-[var(--text-muted)] text-center py-8">
                  No audit logs for this date
                </div>
              ) : (
                auditLogs.map((entry, idx) => (
                  <div key={idx} className="flex gap-2 py-0.5 hover:bg-[#252525]">
                    <span className="text-[#666] shrink-0">
                      {new Date(entry.timestamp).toLocaleTimeString('en-US', {
                        hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </span>
                    <span className={`shrink-0 w-12 ${getLevelColor(entry.level as LogEntry['level'])}`}>
                      [{entry.level}]
                    </span>
                    <span className="text-[#aaa] shrink-0">{entry.event}</span>
                    {entry.traceId && (
                      <span className="text-[#555] shrink-0">#{entry.traceId.slice(0, 8)}</span>
                    )}
                    {entry.error && (
                      <span className="text-red-400 whitespace-pre-wrap break-all">{entry.error}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="p-6 rounded-2xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-sm text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-[var(--icon-bg)] flex items-center justify-center shadow-lg">
          <img src={appIcon} alt={appName} className="w-16 h-16 rounded-xl" />
        </div>
        <h4 className="text-lg font-semibold text-[var(--text-primary)]">{appName}</h4>
        <p 
          className="text-[12px] text-[var(--text-muted)] mt-0.5 cursor-pointer select-none"
          onClick={handleVersionClick}
        >
          {t('settings.about.version')} {appVersion}
        </p>
        <div className="mt-4 pt-4 border-t border-[var(--border-color)] text-left space-y-2">
          <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">
            {t('settings.about.memu.tagline')}
          </p>
          <ul className="text-[12px] text-[var(--text-muted)] leading-relaxed space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-[var(--primary)]">•</span>
              <span>{t('settings.about.memu.feature1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--primary)]">•</span>
              <span>{t('settings.about.memu.feature2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--primary)]">•</span>
              <span>{t('settings.about.memu.feature3')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--primary)]">•</span>
              <span>{t('settings.about.memu.feature4')}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-2">
        <div className="p-3.5 rounded-xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[var(--text-muted)]">Electron</span>
            <span className="text-[12px] text-[var(--text-primary)] font-medium tabular-nums">
              {window.electron?.process?.versions?.electron ?? '-'}
            </span>
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[var(--text-muted)]">Node.js</span>
            <span className="text-[12px] text-[var(--text-primary)] font-medium tabular-nums">
              {window.electron?.process?.versions?.node ?? '-'}
            </span>
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[var(--text-muted)]">Chrome</span>
            <span className="text-[12px] text-[var(--text-primary)] font-medium tabular-nums">
              {window.electron?.process?.versions?.chrome ?? '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
