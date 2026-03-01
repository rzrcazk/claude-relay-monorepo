/**
 * 请求日志数据访问层
 */

import type { RequestLog, GetRequestLogsQuery } from '../../../../shared/types/admin/request-logs'

const REQUEST_LOGS_KEY = 'request_logs'
const MAX_LOGS = 1000  // 最多保留 1000 条日志（约 3 天量）
const LOG_TTL_SECONDS = 3 * 24 * 60 * 60  // 3 天 TTL

export class RequestLogRepository {
  constructor(private kv: KVNamespace) {}

  /**
   * 添加请求日志
   */
  async addLog(log: RequestLog): Promise<void> {
    const logs = await this.getAllLogs()

    // 添加到列表开头
    logs.unshift(log)

    // 保留最多 MAX_LOGS 条
    const trimmedLogs = logs.slice(0, MAX_LOGS)

    await this.kv.put(REQUEST_LOGS_KEY, JSON.stringify(trimmedLogs), {
      expirationTtl: LOG_TTL_SECONDS
    })
  }

  /**
   * 获取所有日志（内部使用）
   */
  private async getAllLogs(): Promise<RequestLog[]> {
    const data = await this.kv.get(REQUEST_LOGS_KEY)
    if (!data) {
      return []
    }

    try {
      return JSON.parse(data) as RequestLog[]
    } catch {
      return []
    }
  }

  /**
   * 获取日志列表（分页）
   */
  async getLogs(query: GetRequestLogsQuery): Promise<{
    logs: RequestLog[]
    hasMore: boolean
  }> {
    const logs = await this.getAllLogs()

    let filtered = logs

    // 按状态筛选
    if (query.status) {
      filtered = filtered.filter(log => log.status === query.status)
    }

    // 按供应商筛选
    if (query.providerId) {
      filtered = filtered.filter(log => log.selectedProviderId === query.providerId)
    }

    // 游标分页（基于时间戳）
    if (query.cursor) {
      const cursorTime = new Date(query.cursor).getTime()
      filtered = filtered.filter(log => new Date(log.timestamp).getTime() < cursorTime)
    }

    const limit = query.limit || 20
    const result = filtered.slice(0, limit)
    const hasMore = filtered.length > limit

    return { logs: result, hasMore }
  }

  /**
   * 获取日志统计
   */
  async getStats(): Promise<{
    total: number
    successCount: number
    errorCount: number
    providerStats: Record<string, number>
  }> {
    const logs = await this.getAllLogs()

    const successCount = logs.filter(l => l.status === 'success').length
    const errorCount = logs.filter(l => l.status === 'error').length

    const providerStats: Record<string, number> = {}
    for (const log of logs) {
      providerStats[log.selectedProviderName] = (providerStats[log.selectedProviderName] || 0) + 1
    }

    return {
      total: logs.length,
      successCount,
      errorCount,
      providerStats
    }
  }
}
