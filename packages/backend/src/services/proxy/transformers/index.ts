/**
 * 转换器模块入口
 * 统一导出所有转换器相关功能
 */

// 简化后的转换器接口
export type { Transformer } from './base-transformer'
export { ClaudeToGeminiTransformer } from './claude-to-gemini'
export { ClaudeToOpenAITransformer } from './claude-to-openai'
export { ClaudeToModelScopeTransformer } from './claude-to-anthropic'

// 注册表 - 这是主要的导出，proxy 服务使用
export { transformerRegistry } from './transformer-registry'