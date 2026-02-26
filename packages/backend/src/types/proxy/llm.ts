/**
 * LLM 代理相关类型定义
 */

/**
 * LLM 提供商配置
 */
export interface LLMProvider {
  name: string
  apiUrl: string
  model: string
  transformer: any // 对应的转换器实例
  type: 'openai' | 'anthropic' | 'gemini'
}

/**
 * 代理请求配置
 */
export interface ProxyRequestConfig {
  provider: LLMProvider
  apiKey?: string
  headers?: Record<string, string>
  timeout?: number
}

/**
 * 代理响应元数据
 */
export interface ProxyResponseMetadata {
  provider: string
  model: string
  latency: number
  tokensUsed?: {
    input: number
    output: number
    total: number
  }
}