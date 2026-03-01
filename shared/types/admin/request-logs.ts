/**
 * 请求日志相关类型定义
 */

import type { ModelTarget } from './routes'

/**
 * 路由规则类型
 */
export type RouteRuleType = 'default' | 'longContext' | 'background' | 'think' | 'webSearch'

/**
 * 请求日志
 */
export interface RequestLog {
  id: string                    // 请求 ID (uuid)
  timestamp: string              // ISO 8601 时间字符串
  // 请求信息
  requestedModel: string         // 原始请求的 model
  // 路由决策
  selectedProviderId: string     // 实际路由到的供应商 ID
  selectedProviderName: string   // 实际路由到的供应商名称
  selectedModel: string         // 实际路由到的模型
  routeReason: string           // 路由原因描述
  routeRule: RouteRuleType      // 匹配的路由规则
  // 请求结果
  status: 'success' | 'error'   // 请求状态
  errorMessage?: string         // 错误信息（如果失败）
  duration: number              // 请求耗时 (ms)
}

/**
 * 请求日志列表响应
 */
export interface RequestLogListResponse {
  logs: RequestLog[]
  total: number
  hasMore: boolean
}

/**
 * 获取请求日志列表查询参数
 */
export interface GetRequestLogsQuery {
  limit?: number                // 限制返回数量，默认 20
  cursor?: string               // 分页游标（时间戳）
  status?: 'success' | 'error'  // 按状态筛选
  providerId?: string           // 按供应商筛选
}
