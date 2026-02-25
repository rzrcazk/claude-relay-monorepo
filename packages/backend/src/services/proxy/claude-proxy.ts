/**
 * Claude API 代理服务 - Engine 架构版本
 */

import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages'
import type { SelectedConfig } from './engines/types'
import { ClaudeEngine, ProviderEngine } from './engines'
import { RouteConfigRepository } from '../../repositories'
import { ValidationError } from '../../utils/errors'
import { UsageStatsService } from '../admin/usage-stats'

export class ClaudeProxyService {
  private claudeEngine: ClaudeEngine
  private providerEngine: ProviderEngine
  private routeConfigRepo: RouteConfigRepository
  private usageStatsService: UsageStatsService

  constructor(private kv: KVNamespace) {
    this.claudeEngine = new ClaudeEngine(kv)
    this.providerEngine = new ProviderEngine(kv)
    this.routeConfigRepo = new RouteConfigRepository(kv)
    this.usageStatsService = new UsageStatsService(kv)
  }

  /**
   * 代理请求到适当的 API 端点
   */
  async proxyRequest(request: Request): Promise<Response> {
    const startTime = Date.now()
    const providerId = 'claude' // 默认使用 Claude 官方

    // 解析请求
    const claudeRequest = await request.json() as MessageCreateParamsBase
    const model = claudeRequest.model || 'unknown'

    try {
      // 获取选择的配置
      const selectedConfig = await this.routeConfigRepo.getSelectedConfig()

      let response: Response

      if (!selectedConfig) {
        // 默认使用 Claude
        response = await this.claudeEngine.processRequest(claudeRequest)
      } else if (selectedConfig.type === 'claude') {
        response = await this.claudeEngine.processRequest(claudeRequest)
      } else if (selectedConfig.type === 'route') {
        response = await this.providerEngine.processRequest(claudeRequest)
        // 从 routeConfig 中获取 providerId（这里简化处理）
      } else {
        throw new ValidationError(`Unknown configuration type: ${selectedConfig.type}`)
      }

      // 记录使用统计（非流式请求）
      const latency = Date.now() - startTime
      if (!claudeRequest.stream) {
        // 简化：记录请求成功，实际的 token 统计需要从响应中提取
        await this.usageStatsService.recordRequest(
          providerId,
          model,
          0, // inputTokens - 需要从请求中估算
          0, // outputTokens - 需要从响应中获取
          latency,
          false
        )
      }

      return response
    } catch (error) {
      // 记录错误
      const latency = Date.now() - startTime
      await this.usageStatsService.recordRequest(
        providerId,
        model,
        0,
        0,
        latency,
        true
      )
      throw error
    }
  }
}