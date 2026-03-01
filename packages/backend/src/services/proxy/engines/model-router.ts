/**
 * 模型路由服务 - 新架构版本
 * 根据请求特征和路由配置选择最合适的模型
 */

import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages'
import type { RouteConfig, ModelTarget } from './types'
import type { RouteRuleType } from '../../../../../../shared/types/admin/request-logs'
import { estimateTokens } from './optimized-token-estimator'

/**
 * 模型选择结果，包含路由原因
 */
export interface ModelSelectionResult {
  target: ModelTarget
  rule: RouteRuleType
  reason: string
}

export class ModelRouterService {

  /**
   * 根据请求特征和路由配置选择模型
   */
  async selectModel(request: MessageCreateParamsBase, routeConfig: RouteConfig): Promise<ModelSelectionResult> {
    const { rules, config } = routeConfig

    // 如果请求中包含逗号分隔的模型列表，使用第一个模型
    if (request.model?.includes(',')) {
      const firstModel = request.model.split(',')[0].trim()
      // 尝试在路由规则中查找匹配的模型
      const matched = this.findModelInRules(firstModel, rules)
      if (matched) {
        return matched
      }
    }

    // 1. 长上下文模型选择
    if (rules.longContext) {
      // 直接估算整个请求的 token 数
      const requestText = JSON.stringify(request)
      const tokenCount = estimateTokens(requestText)
      const threshold = config?.longContextThreshold || 60000

      if (tokenCount > threshold) {
        console.log(`🔄 使用长上下文模型，token 数: ${tokenCount.toLocaleString()}，阈值: ${threshold.toLocaleString()}`)
        return {
          target: rules.longContext,
          rule: 'longContext',
          reason: `token数 ${tokenCount.toLocaleString()} > 阈值 ${threshold.toLocaleString()}`
        }
      }
    }

    // 2. 后台/轻量级模型选择（如 claude-3-5-haiku）
    if (request.model?.includes('haiku') && rules.background) {
      console.log(`🔄 使用后台模型处理: ${request.model}`)
      return {
        target: rules.background,
        rule: 'background',
        reason: `请求模型包含 haiku`
      }
    }

    // 3. 思考/推理模型选择
    if (request.thinking && rules.think) {
      console.log('🔄 使用思考模型处理包含思考过程的请求')
      return {
        target: rules.think,
        rule: 'think',
        reason: '请求包含 thinking 参数'
      }
    }

    // 4. 网络搜索模型选择
    if (request.tools && Array.isArray(request.tools)) {
      const hasWebSearch = request.tools.some((tool: any) =>
        tool.type?.startsWith('web_search')
      )
      if (hasWebSearch && rules.webSearch) {
        console.log('🔄 使用网络搜索优化模型')
        return {
          target: rules.webSearch,
          rule: 'webSearch',
          reason: '请求包含 web_search 工具'
        }
      }
    }

    // 5. 默认模型
    console.log('🔄 使用默认模型')
    return {
      target: rules.default,
      rule: 'default',
      reason: '默认路由'
    }
  }

  /**
   * 在路由规则中查找指定的模型
   */
  private findModelInRules(modelName: string, rules: RouteConfig['rules']): ModelSelectionResult | null {
    // 遍历所有规则，查找匹配的模型
    const allTargets: { rule: RouteRuleType; target: ModelTarget }[] = [
      { rule: 'default', target: rules.default },
      { rule: 'longContext', target: rules.longContext! },
      { rule: 'background', target: rules.background! },
      { rule: 'think', target: rules.think! },
      { rule: 'webSearch', target: rules.webSearch! }
    ].filter(Boolean) as { rule: RouteRuleType; target: ModelTarget }[]

    for (const { rule, target } of allTargets) {
      if (target.model === modelName) {
        return {
          target,
          rule,
          reason: `显式指定模型 ${modelName}，匹配 ${rule} 规则`
        }
      }
    }

    return null
  }
}