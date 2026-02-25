/**
 * 转换器注册表
 * 统一管理所有的简化转换器，均使用 processRequest 模式
 */

import type { Transformer } from './base-transformer'
import { ClaudeToOpenAITransformer } from './claude-to-openai'
import { ClaudeToGeminiTransformer } from './claude-to-gemini'
import { ClaudeToModelScopeTransformer } from './claude-to-modelscope'

export class TransformerRegistry {
  private static instance: TransformerRegistry
  private transformers: Map<string, Transformer>

  private constructor() {
    this.transformers = new Map()
    this.registerDefaultTransformers()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): TransformerRegistry {
    if (!TransformerRegistry.instance) {
      TransformerRegistry.instance = new TransformerRegistry()
    }
    return TransformerRegistry.instance
  }

  /**
   * 注册默认转换器
   */
  private registerDefaultTransformers(): void {
    // 使用基于官方 SDK 的 OpenAI 转换器
    this.register('claude-to-openai', new ClaudeToOpenAITransformer())
    this.register('claude-to-gemini', new ClaudeToGeminiTransformer())
    this.register('claude-to-modelscope', new ClaudeToModelScopeTransformer())
  }

  /**
   * 注册转换器
   */
  register(type: string, transformer: Transformer): void {
    this.transformers.set(type, transformer)
  }

  /**
   * 获取转换器
   */
  get(type: string): Transformer {
    const transformer = this.transformers.get(type)
    if (!transformer) {
      // 默认返回 Gemini 转换器
      return this.transformers.get('claude-to-gemini')!
    }
    return transformer
  }


  /**
   * 检查转换器是否存在
   */
  has(type: string): boolean {
    return this.transformers.has(type)
  }

  /**
   * 获取所有已注册的转换器类型
   */
  getTypes(): string[] {
    return Array.from(this.transformers.keys())
  }
}

// 导出单例实例
export const transformerRegistry = TransformerRegistry.getInstance()