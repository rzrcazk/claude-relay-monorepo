/**
 * 模型供应商相关类型定义
 */

export interface ModelProvider {
  id: string
  name: string
  type: 'openai' | 'gemini' | 'minimax'
  endpoint: string
  models: string[]  // 支持的模型列表
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
  description?: string  // 可选的备注描述
  transformer?: 'claude-to-openai' | 'claude-to-gemini' | 'claude-to-minimax'  // 可选，默认 'claude-to-openai'
}

export interface AddProviderRequest {
  name: string
  type: 'openai' | 'gemini' | 'minimax'
  endpoint: string
  models: string[]  // 支持的模型列表
  transformer?: 'claude-to-openai' | 'claude-to-gemini' | 'claude-to-minimax'
  description?: string  // 可选的备注描述字段
}

export interface EditProviderRequest {
  name: string
  endpoint: string
  models: string[]  // 支持的模型列表
  transformer?: 'claude-to-openai' | 'claude-to-gemini' | 'claude-to-minimax'
  description?: string  // 可选的备注描述字段，不做校验
}

// 预设供应商配置
export interface ProviderConfig {
  name: string
  description: string
  icon: string
  type: 'openai' | 'gemini' | 'minimax'
  endpoint: string
  models: string[]
  helpText: string
  transformer: 'claude-to-openai' | 'claude-to-gemini' | 'claude-to-minimax'
  isPreset: boolean  // 是否为预定义供应商
}

// 模型测试相关类型
export interface TestConnectionRequest {
  model: string
}

export interface TestConnectionResponse {
  success: boolean
  latency: number  // 毫秒
  message: string
  error?: string
}

export interface TestVisionRequest {
  model: string
}

export interface TestVisionResponse {
  success: boolean
  latency: number
  message: string
  visionSupported: boolean
  error?: string
}