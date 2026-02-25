/**
 * 使用统计服务
 * 记录 API 请求的使用情况
 */

export interface UsageStats {
  date: string  // YYYY-MM-DD
  providerId: string
  model: string
  requestCount: number
  inputTokens: number
  outputTokens: number
  errorCount: number
  totalLatency: number  // 毫秒
}

export interface DailyStats {
  date: string
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  totalErrors: number
  avgLatency: number
  providers: {
    [providerId: string]: {
      requestCount: number
      inputTokens: number
      outputTokens: number
      errorCount: number
      models: {
        [model: string]: {
          requestCount: number
          inputTokens: number
          outputTokens: number
        }
      }
    }
  }
}

export class UsageStatsService {
  private kv: KVNamespace
  private readonly STATS_PREFIX = 'usage_stats'

  constructor(kv: KVNamespace) {
    this.kv = kv
  }

  /**
   * 记录一次 API 请求
   */
  async recordRequest(
    providerId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    latency: number,
    isError: boolean = false
  ): Promise<void> {
    const date = this.getDateString()
    const key = `${this.STATS_PREFIX}:${date}:${providerId}`

    // 获取现有统计
    const existingData = await this.kv.get(key)
    const stats: UsageStats = existingData
      ? JSON.parse(existingData)
      : {
          date,
          providerId,
          model,
          requestCount: 0,
          inputTokens: 0,
          outputTokens: 0,
          errorCount: 0,
          totalLatency: 0
        }

    // 更新统计
    stats.requestCount += 1
    stats.inputTokens += inputTokens
    stats.outputTokens += outputTokens
    stats.totalLatency += latency
    if (isError) {
      stats.errorCount += 1
    }

    // 保存统计
    await this.kv.put(key, JSON.stringify(stats))

    // 更新总统计
    await this.updateTotalStats(date, providerId, model, inputTokens, outputTokens, latency, isError)
  }

  /**
   * 获取指定日期的统计
   */
  async getStatsByDate(date: string, providerId?: string): Promise<UsageStats | DailyStats | null> {
    const key = providerId
      ? `${this.STATS_PREFIX}:${date}:${providerId}`
      : `${this.STATS_PREFIX}:${date}`

    const data = await this.kv.get(key)
    if (!data) {
      return null
    }

    return JSON.parse(data)
  }

  /**
   * 获取今日统计摘要
   */
  async getTodaySummary(): Promise<{
    totalRequests: number
    totalInputTokens: number
    totalOutputTokens: number
    totalErrors: number
    avgLatency: number
  }> {
    const date = this.getDateString()
    const list = await this.kv.list({ prefix: `${this.STATS_PREFIX}:${date}` })

    let totalRequests = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalErrors = 0
    let totalLatency = 0

    for (const key of list.keys) {
      const data = await this.kv.get(key.name)
      if (data) {
        const stats: UsageStats = JSON.parse(data)
        totalRequests += stats.requestCount
        totalInputTokens += stats.inputTokens
        totalOutputTokens += stats.outputTokens
        totalErrors += stats.errorCount
        totalLatency += stats.totalLatency
      }
    }

    return {
      totalRequests,
      totalInputTokens,
      totalOutputTokens,
      totalErrors,
      avgLatency: totalRequests > 0 ? totalLatency / totalRequests : 0
    }
  }

  /**
   * 更新总统计
   */
  private async updateTotalStats(
    date: string,
    providerId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    latency: number,
    isError: boolean
  ): Promise<void> {
    const key = `${this.STATS_PREFIX}:${date}:total`

    const existingData = await this.kv.get(key)
    const stats: DailyStats = existingData
      ? JSON.parse(existingData)
      : {
          date,
          totalRequests: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalErrors: 0,
          avgLatency: 0,
          providers: {}
        }

    // 更新总数
    stats.totalRequests += 1
    stats.totalInputTokens += inputTokens
    stats.totalOutputTokens += outputTokens
    stats.totalErrors += isError ? 1 : 0
    stats.avgLatency = stats.totalRequests > 0
      ? (stats.avgLatency * (stats.totalRequests - 1) + latency) / stats.totalRequests
      : latency

    // 更新供应商统计
    if (!stats.providers[providerId]) {
      stats.providers[providerId] = {
        requestCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        errorCount: 0,
        models: {}
      }
    }

    stats.providers[providerId].requestCount += 1
    stats.providers[providerId].inputTokens += inputTokens
    stats.providers[providerId].outputTokens += outputTokens
    stats.providers[providerId].errorCount += isError ? 1 : 0

    // 更新模型统计
    if (!stats.providers[providerId].models[model]) {
      stats.providers[providerId].models[model] = {
        requestCount: 0,
        inputTokens: 0,
        outputTokens: 0
      }
    }

    stats.providers[providerId].models[model].requestCount += 1
    stats.providers[providerId].models[model].inputTokens += inputTokens
    stats.providers[providerId].models[model].outputTokens += outputTokens

    await this.kv.put(key, JSON.stringify(stats))
  }

  /**
   * 获取日期字符串
   */
  private getDateString(): string {
    return new Date().toISOString().split('T')[0]
  }
}
