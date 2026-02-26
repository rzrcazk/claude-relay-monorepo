/**
 * 模型供应商管理服务
 */

import { ModelProvider, AddProviderRequest, EditProviderRequest, TestConnectionRequest, TestConnectionResponse, TestVisionRequest, TestVisionResponse, ChatRequest, ChatResponse } from '../../../../../shared/types/admin/providers'
import { HTTPException } from 'hono/http-exception'
import { KeyPoolManager } from '../key-pool'
import { ProviderRepository, ModelRepository, RouteConfigRepository } from '../../repositories'
import { transformerRegistry } from '../proxy/transformers'

export class ProviderService {
  private keyPoolManager: KeyPoolManager
  private providerRepo: ProviderRepository
  private modelRepo: ModelRepository  // 保留以备将来使用
  private routeConfigRepo: RouteConfigRepository

  constructor(private adminKv: KVNamespace) {
    this.keyPoolManager = new KeyPoolManager(adminKv)
    this.providerRepo = new ProviderRepository(adminKv)
    this.modelRepo = new ModelRepository(adminKv)
    this.routeConfigRepo = new RouteConfigRepository(adminKv)
  }

  // 获取所有模型供应商
  async getProviders(): Promise<ModelProvider[]> {
    return await this.providerRepo.getAll()
  }

  // 根据 ID 获取供应商
  async getProviderById(id: string): Promise<ModelProvider | null> {
    return await this.providerRepo.getById(id)
  }

  // 添加模型供应商
  async addProvider(request: AddProviderRequest): Promise<ModelProvider> {
    // 检查是否已存在
    const exists = await this.providerRepo.exists(request.name, request.baseUrl)
    if (exists) {
      throw new HTTPException(400, { message: '供应商名称或端点已存在' })
    }

    const now = new Date().toISOString()
    const newProvider: ModelProvider = {
      id: Date.now().toString(),
      name: request.name,
      type: request.type,
      baseUrl: request.baseUrl,
      models: request.models,
      transformer: request.transformer,
      description: request.description,  // 可选的描述字段
      status: 'active',
      createdAt: now,
      updatedAt: now
    }

    await this.providerRepo.add(newProvider)
    
    // 初始化 Key Pool（密钥通过 Key Pool API 单独管理）
    await this.keyPoolManager.initializeFromProvider(newProvider)
    
    return newProvider
  }

  // 编辑模型供应商
  async editProvider(id: string, request: EditProviderRequest): Promise<ModelProvider> {
    const existingProvider = await this.providerRepo.getById(id)
    
    if (!existingProvider) {
      throw new HTTPException(400, { message: '供应商不存在' })
    }

    // 更新供应商信息，保持原有的 id、type、status 和 createdAt
    const updatedProvider: ModelProvider = {
      ...existingProvider,
      name: request.name,
      baseUrl: request.baseUrl,
      models: request.models,
      transformer: request.transformer || 'claude-to-openai',
      // 如果提供了 description，则更新；否则保持原值
      description: request.description !== undefined ? request.description : existingProvider.description,
      updatedAt: new Date().toISOString()
    }

    const success = await this.providerRepo.update(id, updatedProvider)
    if (!success) {
      throw new HTTPException(400, { message: '更新供应商失败' })
    }
    
    return updatedProvider
  }

  // 删除模型供应商
  async deleteProvider(id: string): Promise<void> {
    // 检查供应商是否存在
    const provider = await this.providerRepo.getById(id)
    if (!provider) {
      throw new HTTPException(400, { message: '供应商不存在' })
    }

    // 检查路由配置中是否使用了该供应商
    const usedInRoutes = await this.checkProviderUsedInRouteConfigs(id)
    if (usedInRoutes.length > 0) {
      throw new HTTPException(400, { 
        message: `无法删除供应商"${provider.name}"，以下路由配置正在使用该供应商：${usedInRoutes.join('、')}。请先修改或删除相关路由配置后再试。`
      })
    }

    const success = await this.providerRepo.delete(id)
    if (!success) {
      throw new HTTPException(500, { message: '删除供应商失败' })
    }
    
    // 删除关联的 Key Pool
    await this.keyPoolManager.removePool(id)
  }

  // 获取 Key Pool 管理器实例
  getKeyPoolManager(): KeyPoolManager {
    return this.keyPoolManager
  }

  /**
   * 检查路由配置中是否使用了指定的供应商
   */
  private async checkProviderUsedInRouteConfigs(providerId: string): Promise<string[]> {
    const routeConfigs = await this.routeConfigRepo.getAllConfigs()
    const usedRoutes: string[] = []

    for (const config of routeConfigs) {
      const { rules } = config

      // 检查所有可能的路由规则
      const targets = [
        rules.default,
        rules.longContext,
        rules.background,
        rules.think,
        rules.webSearch
      ].filter((target): target is NonNullable<typeof target> => target != null)

      // 检查是否有任何目标使用了该供应商
      if (targets.some(target => target.providerId === providerId)) {
        usedRoutes.push(config.name)
      }
    }

    return usedRoutes
  }

  /**
   * 测试供应商连通性
   */
  async testConnection(providerId: string, request: TestConnectionRequest): Promise<TestConnectionResponse> {
    const provider = await this.providerRepo.getById(providerId)
    if (!provider) {
      throw new HTTPException(404, { message: '供应商不存在' })
    }

    // 获取 Key Pool
    const pool = await this.keyPoolManager.getOrCreatePool(providerId, provider.type)
    const keys = await pool.getKeys()
    const activeKeys = keys.filter(k => k.status === 'active')

    if (activeKeys.length === 0) {
      return {
        success: false,
        latency: 0,
        message: '没有可用的 API Key',
        error: 'NO_KEYS'
      }
    }

    // 使用第一个活跃的 key
    const apiKey = activeKeys[0]
    const startTime = Date.now()

    try {
      // 构建简单的测试请求
      const testMessages = [{ role: 'user' as const, content: 'Hi' }]

      // 根据供应商类型调用不同的 API
      let response: Response
      if (provider.type === 'gemini') {
        // Gemini 使用 Google Generative AI SDK
        response = await this.callGeminiApi(provider, apiKey.key, request.model, testMessages)
      } else if (provider.type === 'modelscope' || provider.type === 'minimax') {
        // ModelScope 和 MiniMax 使用 Anthropic 兼容 API
        response = await this.callAnthropicApi(provider, apiKey.key, request.model, testMessages)
      } else {
        // OpenAI 兼容的 API
        response = await this.callOpenAIApi(provider, apiKey.key, request.model, testMessages)
      }

      const latency = Date.now() - startTime

      if (response.ok) {
        return {
          success: true,
          latency,
          message: '连接成功'
        }
      } else {
        const errorText = await response.text()
        return {
          success: false,
          latency,
          message: `请求失败: ${response.status}`,
          error: errorText.substring(0, 200)
        }
      }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        success: false,
        latency,
        message: `请求异常: ${error instanceof Error ? error.message : '未知错误'}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 测试供应商图片识别能力
   */
  async testVision(providerId: string, request: TestVisionRequest): Promise<TestVisionResponse> {
    const provider = await this.providerRepo.getById(providerId)
    if (!provider) {
      throw new HTTPException(404, { message: '供应商不存在' })
    }

    // 获取 Key Pool
    const pool = await this.keyPoolManager.getOrCreatePool(providerId, provider.type)
    const keys = await pool.getKeys()
    const activeKeys = keys.filter(k => k.status === 'active')

    if (activeKeys.length === 0) {
      return {
        success: false,
        latency: 0,
        message: '没有可用的 API Key',
        visionSupported: false,
        error: 'NO_KEYS'
      }
    }

    const apiKey = activeKeys[0]
    const startTime = Date.now()

    try {
      // 构建带图片的测试请求
      // 使用一个简单的 base64 编码的 1x1 透明 PNG 图片
      const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

      const testMessages = [
        {
          role: 'user' as const,
          content: [
            { type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/png' as const, data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' } },
            { type: 'text' as const, text: 'What do you see?' }
          ]
        }
      ]

      let response: Response
      if (provider.type === 'gemini') {
        response = await this.callGeminiApi(provider, apiKey.key, request.model, testMessages, true)
      } else if (provider.type === 'modelscope' || provider.type === 'minimax') {
        // ModelScope 和 MiniMax 使用 Anthropic 兼容 API
        response = await this.callAnthropicApi(provider, apiKey.key, request.model, testMessages, true)
      } else {
        response = await this.callOpenAIApi(provider, apiKey.key, request.model, testMessages, true)
      }

      const latency = Date.now() - startTime

      if (response.ok) {
        const responseText = await response.text()
        // 检查响应是否包含有效内容（而非错误信息）
        const visionSupported = responseText.length > 10 && !responseText.toLowerCase().includes('error')
        return {
          success: true,
          latency,
          message: visionSupported ? '图片识别能力正常' : 'API 返回异常响应',
          visionSupported
        }
      } else {
        const errorText = await response.text()
        // 检查是否是模型不支持图片的错误
        const visionSupported = false
        const isModelNotSupport = errorText.toLowerCase().includes('not support') ||
                                   errorText.toLowerCase().includes('vision') ||
                                   errorText.toLowerCase().includes('image')
        return {
          success: false,
          latency,
          message: isModelNotSupport ? '模型不支持图片识别' : `请求失败: ${response.status}`,
          visionSupported,
          error: errorText.substring(0, 200)
        }
      }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        success: false,
        latency,
        message: `请求异常: ${error instanceof Error ? error.message : '未知错误'}`,
        visionSupported: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 聊天测试 - 发送自定义消息并获取回复
   */
  async chat(providerId: string, request: ChatRequest): Promise<ChatResponse> {
    const provider = await this.providerRepo.getById(providerId)
    if (!provider) {
      throw new HTTPException(404, { message: '供应商不存在' })
    }

    // 获取 Key Pool
    const pool = await this.keyPoolManager.getOrCreatePool(providerId, provider.type)
    const keys = await pool.getKeys()
    const activeKeys = keys.filter(k => k.status === 'active')

    if (activeKeys.length === 0) {
      return {
        success: false,
        response: '',
        latency: 0,
        error: '没有可用的 API Key'
      }
    }

    const apiKey = activeKeys[0]
    const startTime = Date.now()

    try {
      // 构建消息
      let testMessages: any[]

      if (request.image) {
        // 带图片的消息
        testMessages = [
          {
            role: 'user' as const,
            content: [
              { type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/png' as const, data: request.image } },
              { type: 'text' as const, text: request.message }
            ]
          }
        ]
      } else {
        // 纯文本消息
        testMessages = [{ role: 'user' as const, content: request.message }]
      }

      let response: Response
      const isVision = !!request.image

      if (provider.type === 'gemini') {
        response = await this.callGeminiApi(provider, apiKey.key, request.model, testMessages, isVision)
      } else if (provider.type === 'modelscope' || provider.type === 'minimax') {
        response = await this.callAnthropicApi(provider, apiKey.key, request.model, testMessages, isVision)
      } else {
        response = await this.callOpenAIApi(provider, apiKey.key, request.model, testMessages, isVision)
      }

      const latency = Date.now() - startTime

      if (response.ok) {
        // 解析响应内容
        const responseText = await this.parseChatResponse(response, provider.type)
        return {
          success: true,
          response: responseText,
          latency
        }
      } else {
        const errorText = await response.text()
        return {
          success: false,
          response: '',
          latency,
          error: errorText.substring(0, 500)
        }
      }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        success: false,
        response: '',
        latency,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  }

  /**
   * 解析聊天响应
   */
  private async parseChatResponse(response: Response, providerType: string): Promise<string> {
    const data: any = await response.json()

    if (providerType === 'gemini') {
      // Gemini 格式
      if (data.candidates && data.candidates[0]?.content?.parts) {
        return data.candidates[0].content.parts.map((p: any) => p.text).join('')
      }
      return JSON.stringify(data)
    } else if (providerType === 'modelscope' || providerType === 'minimax') {
      // Anthropic 兼容格式
      if (data.content && data.content[0]?.text) {
        return data.content[0].text
      }
      return JSON.stringify(data)
    } else {
      // OpenAI 兼容格式
      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content
      }
      return JSON.stringify(data)
    }
  }

  /**
   * 调用 OpenAI 兼容 API
   */
  private async callOpenAIApi(
    provider: ModelProvider,
    apiKey: string,
    model: string,
    messages: any[],
    isVision: boolean = false
  ): Promise<Response> {
    // 构建请求体
    const body: any = {
      model,
      messages
    }

    // 如果是 vision 请求且需要设置 max_tokens
    if (isVision) {
      body.max_tokens = 300
    }

    // 根据 provider.type 自动添加正确的后缀
    const baseUrl = provider.baseUrl.replace(/\/$/, '')
    const url = `${baseUrl}/v1/chat/completions`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    })

    return response
  }

  /**
   * 调用 Anthropic 兼容 API (ModelScope / MiniMax)
   */
  private async callAnthropicApi(
    provider: ModelProvider,
    apiKey: string,
    model: string,
    messages: any[],
    isVision: boolean = false
  ): Promise<Response> {
    // 构建 Anthropic 格式的请求体
    const body: any = {
      model,
      messages: messages.map(msg => {
        // 将 OpenAI 格式的消息转换为 Anthropic 格式
        if (Array.isArray(msg.content)) {
          return {
            role: msg.role,
            content: msg.content.map((c: { type: string; text?: string; source?: any }) => {
              if (c.type === 'text') {
                return { type: 'text', text: c.text }
              } else if (c.type === 'image') {
                return {
                  type: 'image',
                  source: {
                    type: c.source?.type || 'base64',
                    media_type: c.source?.media_type || 'image/png',
                    data: c.source?.data
                  }
                }
              }
              return c
            })
          }
        }
        return msg
      }),
      max_tokens: isVision ? 300 : 1024
    }

    // 根据 provider.type 自动添加正确的后缀
    const baseUrl = provider.baseUrl.replace(/\/$/, '')
    const url = provider.type === 'minimax'
      ? `${baseUrl}/v1/text/chatcompletion_v2`
      : `${baseUrl}/v1/messages`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    return response
  }

  /**
   * 调用 Gemini API
   */
  private async callGeminiApi(
    provider: ModelProvider,
    apiKey: string,
    model: string,
    messages: any[],
    isVision: boolean = false
  ): Promise<Response> {
    // Gemini API 格式不同于 OpenAI
    // 构建 contents 格式
    const contents: any[] = []

    for (const msg of messages) {
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        for (const content of msg.content) {
          if (content.type === 'text') {
            contents.push({
              role: 'user',
              parts: [{ text: content.text }]
            })
          } else if (content.type === 'image' && content.source?.type === 'base64') {
            contents.push({
              role: 'user',
              parts: [{
                inlineData: {
                  mimeType: content.source.media_type,
                  data: content.source.data
                }
              }]
            })
          }
        }
      } else if (msg.role === 'user' && typeof msg.content === 'string') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.content }]
        })
      }
    }

    // 使用 v1beta 接口
    const geminiModel = model.startsWith('gemini-') ? model : `models/${model}`
    const url = `${provider.baseUrl.replace(/\/$/, '')}/${geminiModel}:generateContent?key=${apiKey}`

    const body = {
      contents,
      generationConfig: {
        maxOutputTokens: isVision ? 300 : 50,
        temperature: 0.7
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    return response
  }
}