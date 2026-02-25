/**
 * Claude to OpenAI 转换器
 * 将 Claude API 格式转换为 OpenAI 兼容格式，支持官方和第三方 OpenAI 兼容 API
 * 使用官方 OpenAI SDK 实现，提供类型安全、错误处理和流式支持
 */

import type { Transformer } from './base-transformer'
import type { 
  MessageCreateParamsBase,
  Message,
  MessageParam,
  TextBlockParam,
  ImageBlockParam,
  ToolUseBlockParam,
  ToolResultBlockParam,
  Tool as ClaudeTool,
  StopReason
} from '@anthropic-ai/sdk/resources/messages'
import OpenAI from 'openai'
import type { 
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
  ChatCompletion
} from 'openai/resources/chat/completions'

export class ClaudeToOpenAITransformer implements Transformer {
  private client: OpenAI | null = null
  private baseURL: string = ''

  /**
   * 初始化 OpenAI 客户端
   * 支持官方 OpenAI API 和第三方兼容 API（如 Azure OpenAI、Ollama、vLLM、LocalAI 等）
   */
  public initializeClient(apiKey: string, options?: { 
    baseUrl?: string
  }): void {
    if (!options?.baseUrl) {
      throw new Error('baseUrl is required for OpenAI-compatible providers')
    }
    
    this.baseURL = options.baseUrl
    this.client = new OpenAI({
      apiKey,
      baseURL: this.baseURL,
      // 添加更详细的错误处理配置
      maxRetries: 2,
      timeout: 60000, // 60秒超时
      // 添加默认 headers 以确保兼容性
      defaultHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
  }

  /**
   * 获取客户端实例
   */
  private getClient(): OpenAI {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Call initializeClient() first.')
    }
    return this.client
  }

  /**
   * 主要转换方法 - 直接调用 OpenAI SDK 并转换响应
   */
  async processRequest(claudeRequest: MessageCreateParamsBase, model: string): Promise<Message | ReadableStream> {
    const client = this.getClient()
    
    // 记录原始 Claude 请求
    // logClaudeRequest(claudeRequest)

    if (claudeRequest.stream) {
      // 流式响应
      const streamParams = this.buildStreamingParams(claudeRequest, model)
      
      const stream = await client.chat.completions.create(streamParams)
      
      return await this.transformStreamResponse(stream)
    } else {
      // 非流式响应
      const params = this.buildNonStreamingParams(claudeRequest, model)

      // Cloudflare Workers 优化日志 - 结构化输出
    console.log(`=== OpenAI API 请求开始 [${new Date().toISOString()}] ===`)
    console.log('📤 请求详情:', JSON.stringify({
      url: `${this.baseURL}/chat/completions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer [REDACTED]',
        'User-Agent': 'OpenAI/NodeJS'
      },
      body: {
        model: params.model,
        messages: params.messages ? {
          count: params.messages.length,
          preview: params.messages.map((msg: any, i: number) => ({
            index: i,
            role: msg.role,
            contentLength: typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length,
            contentPreview: typeof msg.content === 'string' ? msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : '') : `[${typeof msg.content}]`
          }))
        } : null,
        max_tokens: params.max_tokens,
        temperature: params.temperature,
        top_p: params.top_p,
        stop: params.stop,
        tools: params.tools ? {
          count: params.tools.length,
          tools: params.tools.map((tool: any) => ({
            type: tool.type,
            functionName: tool.function.name,
            descriptionLength: tool.function.description?.length || 0
          }))
        } : null,
        tool_choice: params.tool_choice,
        stream: false
      }
    }, null, 2))
    console.log('=== 请求发送 ===')

      try {
        const response = await client.chat.completions.create(params)

        // Cloudflare Workers 优化响应日志
        console.log(`=== OpenAI API 响应接收 [${new Date().toISOString()}] ===`)
        console.log('📥 响应元数据:', JSON.stringify({
          id: response?.id || 'MISSING',
          object: response?.object || 'MISSING',
          created: response?.created || 'MISSING',
          model: response?.model || 'MISSING',
          system_fingerprint: response?.system_fingerprint || null
        }, null, 2))

        console.log('📋 Choices 结构分析:', JSON.stringify({
          choicesExists: !!response?.choices,
          choicesType: Array.isArray(response?.choices) ? 'array' : typeof response?.choices,
          choicesLength: response?.choices?.length || 0,
          firstChoiceExists: !!(response?.choices?.[0]),
          firstChoiceStructure: response?.choices?.[0] ? {
            index: response.choices[0].index,
            finish_reason: response.choices[0].finish_reason,
            hasMessage: !!response.choices[0].message,
            messageRole: response.choices[0].message?.role,
            hasContent: !!response.choices[0].message?.content,
            contentType: typeof response.choices[0].message?.content,
            contentLength: response.choices[0].message?.content ?
              (typeof response.choices[0].message.content === 'string' ?
                response.choices[0].message.content.length :
                JSON.stringify(response.choices[0].message.content).length) : 0,
            hasToolCalls: !!response.choices[0].message?.tool_calls,
            toolCallsCount: response.choices[0].message?.tool_calls?.length || 0
          } : null
        }, null, 2))

        console.log('📊 Usage 信息:', JSON.stringify({
          usageExists: !!response?.usage,
          prompt_tokens: response?.usage?.prompt_tokens || 0,
          completion_tokens: response?.usage?.completion_tokens || 0,
          total_tokens: response?.usage?.total_tokens || 0
        }, null, 2))

        console.log('🔍 完整响应对象 (前500字符):', JSON.stringify(response).substring(0, 500))
        console.log('=== 响应分析完成 ===')

        // 检查第三方 API 非标准响应格式
        if (response && typeof response === 'object' &&
            ('status' in response) && ('msg' in response)) {
          // 使用更安全的类型断言
          const errorResponse = response as Record<string, unknown>
          console.error('=== 第三方 API 错误响应 ===')
          console.error('🚨 错误响应:', JSON.stringify({
            status: errorResponse.status,
            message: errorResponse.msg,
            body: errorResponse.body,
            model: model,
            provider: this.baseURL
          }, null, 2))

          // 根据常见的错误状态码提供友好错误
          const status = String(errorResponse.status)
          const errorMsg = String(errorResponse.msg)
          if (status === '435' || errorMsg === 'Model not support') {
            throw new Error(`模型 ${model} 不被当前供应商支持。请检查模型名称或更换供应商/模型。 [供应商: ${new URL(this.baseURL).hostname}]`)
          }

          throw new Error(`供应商 API 错误: ${errorMsg} (状态码: ${status})`)
        }

        // 如果响应为空或格式不正确，抛出详细错误
        if (!response || typeof response !== 'object') {
          throw new Error(`API 响应格式错误: 期望对象，收到 ${typeof response}`)
        }

        // 检查 choices 数组 - Cloudflare Workers 优化错误日志
        if (!response.choices) {
          console.error('=== CRITICAL ERROR: Choices 属性缺失 ===')
          console.error('🚨 错误详情:', JSON.stringify({
            error: 'CHOICES_PROPERTY_MISSING',
            timestamp: new Date().toISOString(),
            responseKeys: Object.keys(response),
            responseType: typeof response,
            responsePreview: JSON.stringify(response).substring(0, 1000),
            fullResponse: response
          }, null, 2))
          throw new Error(`API 响应无效: 缺少 choices 属性 [${new Date().toISOString()}]`)
        }

        if (!Array.isArray(response.choices)) {
          console.error('=== CRITICAL ERROR: Choices 不是数组 ===')
          console.error('🚨 错误详情:', JSON.stringify({
            error: 'CHOICES_NOT_ARRAY',
            timestamp: new Date().toISOString(),
            choicesValue: response.choices,
            choicesType: typeof response.choices,
            isArray: Array.isArray(response.choices),
            responseKeys: Object.keys(response)
          }, null, 2))
          throw new Error(`API 响应无效: choices 不是数组，类型: ${typeof response.choices} [${new Date().toISOString()}]`)
        }

        if (response.choices.length === 0) {
          console.error('=== CRITICAL ERROR: Choices 数组为空 ===')
          console.error('🚨 错误详情:', JSON.stringify({
            error: 'CHOICES_ARRAY_EMPTY',
            timestamp: new Date().toISOString(),
            choicesLength: 0,
            choices: response.choices,
            responseId: response.id,
            responseModel: response.model,
            hasUsage: !!response.usage,
            fullResponse: response
          }, null, 2))
          throw new Error(`API 响应无效: choices 数组为空 [${new Date().toISOString()}]`)
        }

        // 转换成功 - 记录转换结果
        console.log(`=== Claude 格式转换成功 [${new Date().toISOString()}] ===`)
        const claudeResponse = this.transformResponse(response)

        console.log('📤 转换后的 Claude 响应:', JSON.stringify({
          id: claudeResponse.id,
          type: claudeResponse.type,
          role: claudeResponse.role,
          model: claudeResponse.model,
          contentCount: claudeResponse.content?.length || 0,
          hasTextContent: claudeResponse.content?.some((c: any) => c.type === 'text') || false,
          hasToolUse: claudeResponse.content?.some((c: any) => c.type === 'tool_use') || false,
          stopReason: claudeResponse.stop_reason,
          usage: claudeResponse.usage
        }, null, 2))
        console.log('=== 转换完成，返回响应 ===')

        return claudeResponse
      } catch (error: unknown) {
        // Cloudflare Workers 优化错误日志
        console.error(`=== OpenAI API 请求异常 [${new Date().toISOString()}] ===`)
        console.error('🚨 异常详情:', JSON.stringify({
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          request: {
            url: `${this.baseURL}/chat/completions`,
            model: model,
            paramSummary: {
              hasMessages: !!params.messages,
              messagesCount: params.messages?.length || 0,
              maxTokens: params.max_tokens,
              temperature: params.temperature,
              hasTools: !!params.tools,
              toolsCount: params.tools?.length || 0
            }
          },
          errorClassification: this.classifyError(error)
        }, null, 2))
        console.error('=== 异常处理完成 ===')
        throw error
      }
    }
  }

  /**
   * 构建非流式请求参数
   */
  private buildNonStreamingParams(claudeRequest: MessageCreateParamsBase, model: string): ChatCompletionCreateParamsNonStreaming {
    const baseParams = this.buildBaseParams(claudeRequest, model)
    return {
      ...baseParams,
      stream: false
    }
  }

  /**
   * 构建流式请求参数
   */
  private buildStreamingParams(claudeRequest: MessageCreateParamsBase, model: string): ChatCompletionCreateParamsStreaming {
    const baseParams = this.buildBaseParams(claudeRequest, model)
    return {
      ...baseParams,
      stream: true
    }
  }

  /**
   * 构建基础请求参数
   */
  private buildBaseParams(claudeRequest: MessageCreateParamsBase, model: string) {
    const params: Omit<ChatCompletionCreateParamsNonStreaming, 'stream'> = {
      model,
      messages: this.transformMessages(claudeRequest.messages || [], claudeRequest.system)
    }

    // 基础参数转换
    if (claudeRequest.max_tokens) params.max_tokens = claudeRequest.max_tokens
    if (claudeRequest.temperature !== undefined) params.temperature = claudeRequest.temperature
    if (claudeRequest.top_p !== undefined) params.top_p = claudeRequest.top_p
    if (claudeRequest.stop_sequences) {
      params.stop = claudeRequest.stop_sequences.length === 1 
        ? claudeRequest.stop_sequences[0] 
        : claudeRequest.stop_sequences
    }

    // 工具转换
    if (claudeRequest.tools?.length) {
      params.tools = this.transformTools(claudeRequest.tools as ClaudeTool[])
      if (claudeRequest.tool_choice) {
        params.tool_choice = this.transformToolChoice(claudeRequest.tool_choice)
      }
    }

    return params
  }

  /**
   * 转换消息数组
   */
  private transformMessages(messages: MessageParam[], system?: string | Array<any>): ChatCompletionMessageParam[] {
    const openaiMessages: ChatCompletionMessageParam[] = []

    // 添加系统消息
    if (system) {
      const systemContent = typeof system === 'string' 
        ? system 
        : this.extractTextFromContent(system)
      
      openaiMessages.push({
        role: 'system',
        content: systemContent
      })
    }

    // 转换用户和助手消息
    for (const message of messages) {
      const openaiMessage = this.transformMessage(message)
      if (openaiMessage) {
        openaiMessages.push(openaiMessage)
      }
    }

    return openaiMessages
  }

  /**
   * 转换单个消息
   */
  private transformMessage(message: MessageParam): ChatCompletionMessageParam | null {
    const role = message.role === 'assistant' ? 'assistant' : 'user'
    
    if (typeof message.content === 'string') {
      return {
        role: role as 'user' | 'assistant',
        content: message.content
      }
    }

    if (Array.isArray(message.content)) {
      const content: Array<any> = []
      const toolCalls: Array<any> = []

      for (const item of message.content) {
        switch (item.type) {
          case 'text':
            const textBlock = item as TextBlockParam
            content.push({
              type: 'text',
              text: textBlock.text
            })
            break

          case 'image':
            const imageBlock = item as ImageBlockParam
            if (imageBlock.source.type === 'base64') {
              content.push({
                type: 'image_url',
                image_url: {
                  url: `data:${imageBlock.source.media_type};base64,${imageBlock.source.data}`,
                  detail: 'auto' as const
                }
              })
            }
            break

          case 'tool_use':
            const toolUseBlock = item as ToolUseBlockParam
            
            toolCalls.push({
              id: toolUseBlock.id, // 直接使用 Claude ID
              type: 'function' as const,
              function: {
                name: toolUseBlock.name,
                arguments: JSON.stringify(toolUseBlock.input || {})
              }
            })
            break

          case 'tool_result':
            const toolResultBlock = item as ToolResultBlockParam
            
            return {
              role: 'tool',
              content: typeof toolResultBlock.content === 'string' 
                ? toolResultBlock.content 
                : JSON.stringify(toolResultBlock.content),
              tool_call_id: toolResultBlock.tool_use_id // 直接使用 Claude ID
            }
        }
      }

      const openaiMessage: ChatCompletionMessageParam = {
        role: role as 'user' | 'assistant',
        content: content.length > 0 ? content : ''
      }

      if (toolCalls.length > 0 && role === 'assistant') {
        (openaiMessage as any).tool_calls = toolCalls
      }

      return openaiMessage
    }

    return null
  }

  /**
   * 转换工具定义
   */
  private transformTools(tools: ClaudeTool[]): ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: this.cleanupParameters(tool.input_schema)
      }
    }))
  }

  /**
   * 转换工具选择策略
   */
  private transformToolChoice(toolChoice: MessageCreateParamsBase['tool_choice']): ChatCompletionToolChoiceOption {
    if (typeof toolChoice === 'string') {
      return toolChoice === 'none' ? 'none' : 'auto'
    }
    
    if (toolChoice && typeof toolChoice === 'object') {
      if (toolChoice.type === 'tool' && 'name' in toolChoice) {
        return {
          type: 'function',
          function: { name: toolChoice.name }
        }
      }
      return toolChoice.type === 'auto' ? 'auto' : 'none'
    }
    
    return 'auto'
  }

  /**
   * 转换 OpenAI 响应为 Claude 格式
   */
  private transformResponse(response: ChatCompletion): Message {
    // 验证响应结构
    if (!response.choices || response.choices.length === 0) {
      console.error('❌ OpenAI API 响应缺少 choices 数组:', {
        id: response.id,
        object: response.object,
        created: response.created,
        model: response.model,
        choices: response.choices,
        usage: response.usage
      })
      throw new Error(`API 响应无效: choices 数组为空。模型: ${response.model}, 响应 ID: ${response.id}`)
    }

    const choice = response.choices[0]
    if (!choice) {
      console.error('❌ OpenAI API choices[0] 为空:', {
        choices: response.choices,
        response
      })
      throw new Error('API 响应无效: choice 对象为空')
    }

    const content: any[] = []

    // 验证 message 对象
    if (!choice.message) {
      console.error('❌ OpenAI API choice.message 为空:', {
        choice,
        response
      })
      throw new Error('API 响应无效: choice.message 对象为空')
    }

    // 处理文本内容
    if (choice.message.content) {
      content.push({
        type: 'text',
        text: choice.message.content
      })
    }

    // 处理工具调用
    if (choice.message.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        if (!toolCall.function) {
          console.warn('⚠️ 工具调用缺少 function 对象:', toolCall)
          continue
        }

        content.push({
          type: 'tool_use',
          id: toolCall.id, // 直接使用 OpenAI ID
          name: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments || '{}')
        })
      }
    }

    return {
      id: `msg_${Date.now()}`,
      type: 'message',
      role: 'assistant',
      model: response.model || 'unknown',
      content,
      stop_reason: this.mapFinishReason(choice.finish_reason),
      stop_sequence: null,
      usage: {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
        server_tool_use: null,
        service_tier: null
      }
    }
  }

  /**
   * 转换流式响应为 Claude 格式
   */
  private async transformStreamResponse(openaiStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>): Promise<ReadableStream> {
    const encoder = new TextEncoder()
    const self = this
    let messageStarted = false
    let contentIndex = 0
    let currentToolCalls: Map<number, any> = new Map()
    
    return new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of openaiStream) {
            // 发送 message_start 事件
            if (!messageStarted) {
              controller.enqueue(encoder.encode(self.createSSEEvent('message_start', {
                type: 'message_start',
                message: {
                  id: `msg_${Date.now()}`,
                  type: 'message',
                  role: 'assistant',
                  model: chunk.model,
                  content: [],
                  stop_reason: null,
                  stop_sequence: null,
                  usage: { input_tokens: 0, output_tokens: 0 }
                }
              })))
              messageStarted = true
            }

            if (!chunk.choices || chunk.choices.length === 0) {
              console.warn('⚠️ 流式响应缺少 choices 数组:', { chunk })
              continue
            }

            const choice = chunk.choices[0]
            if (!choice) {
              console.warn('⚠️ 流式响应 choices[0] 为空:', { choices: chunk.choices })
              continue
            }

            // 处理文本内容
            if (choice.delta.content) {
              // 如果是第一次收到内容，发送 content_block_start
              if (contentIndex === 0) {
                controller.enqueue(encoder.encode(self.createSSEEvent('content_block_start', {
                  type: 'content_block_start',
                  index: contentIndex,
                  content_block: { type: 'text', text: '' }
                })))
              }

              // 发送内容增量
              controller.enqueue(encoder.encode(self.createSSEEvent('content_block_delta', {
                type: 'content_block_delta',
                index: contentIndex,
                delta: { type: 'text_delta', text: choice.delta.content }
              })))
            }

            // 处理工具调用
            if (choice.delta.tool_calls) {
              for (const toolCall of choice.delta.tool_calls) {
                const index = toolCall.index || 0
                
                if (!currentToolCalls.has(index)) {
                  // 开始新的工具调用
                  currentToolCalls.set(index, {
                    id: toolCall.id || `tool_${index}`,
                    name: '',
                    arguments: ''
                  })
                  
                  controller.enqueue(encoder.encode(self.createSSEEvent('content_block_start', {
                    type: 'content_block_start',
                    index: contentIndex + 1 + index,
                    content_block: {
                      type: 'tool_use',
                      id: toolCall.id || `tool_${index}`,
                      name: '',
                      input: {}
                    }
                  })))
                }

                const currentToolCall = currentToolCalls.get(index)!
                
                if (toolCall.function?.name) {
                  currentToolCall.name = toolCall.function.name
                }
                
                if (toolCall.function?.arguments) {
                  currentToolCall.arguments += toolCall.function.arguments
                  
                  controller.enqueue(encoder.encode(self.createSSEEvent('content_block_delta', {
                    type: 'content_block_delta',
                    index: contentIndex + 1 + index,
                    delta: {
                      type: 'input_json_delta',
                      partial_json: toolCall.function.arguments
                    }
                  })))
                }
              }
            }

            // 处理完成
            if (choice.finish_reason) {
              // 结束所有内容块
              if (choice.delta.content) {
                controller.enqueue(encoder.encode(self.createSSEEvent('content_block_stop', {
                  type: 'content_block_stop',
                  index: contentIndex
                })))
              }

              // 结束工具调用
              for (const [index] of currentToolCalls) {
                controller.enqueue(encoder.encode(self.createSSEEvent('content_block_stop', {
                  type: 'content_block_stop',
                  index: contentIndex + 1 + index
                })))
              }

              // 发送消息完成
              controller.enqueue(encoder.encode(self.createSSEEvent('message_delta', {
                type: 'message_delta',
                delta: {
                  stop_reason: self.mapFinishReason(choice.finish_reason),
                  stop_sequence: null
                }
              })))
            }
          }

          // 发送结束事件
          controller.enqueue(encoder.encode(self.createSSEEvent('message_stop', {
            type: 'message_stop'
          })))
        } catch (error) {
          controller.error(error)
        } finally {
          controller.close()
          currentToolCalls.clear()
        }
      }
    })
  }

  /**
   * 映射完成原因
   */
  private mapFinishReason(reason: string | null): StopReason {
    if (!reason) return 'end_turn'
    
    const mapping: Record<string, StopReason> = {
      'stop': 'end_turn',
      'length': 'max_tokens',
      'tool_calls': 'tool_use',
      'content_filter': 'end_turn'
    }
    
    return mapping[reason] || 'end_turn'
  }


  /**
   * 清理参数定义
   */
  private cleanupParameters(params: any): any {
    if (!params || typeof params !== 'object') return params
    
    const cleaned = JSON.parse(JSON.stringify(params))
    this.removeUnsupportedProperties(cleaned)
    return cleaned
  }

  /**
   * 递归移除不支持的属性
   */
  private removeUnsupportedProperties(obj: any): void {
    if (!obj || typeof obj !== 'object') return
    
    if (Array.isArray(obj)) {
      obj.forEach(item => this.removeUnsupportedProperties(item))
      return
    }

    // 移除 OpenAI 不支持但 Claude 可能包含的属性
    delete obj.$schema
    delete obj.const

    // 递归处理子属性
    Object.values(obj).forEach(value => this.removeUnsupportedProperties(value))
  }

  /**
   * 从复合内容中提取文本
   */
  private extractTextFromContent(content: Array<TextBlockParam | ImageBlockParam>): string {
    return content
      .filter((item): item is TextBlockParam => item.type === 'text')
      .map(item => item.text)
      .join('\n')
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    // 无需清理，因为不再维护映射
  }

  /**
   * 创建 SSE 事件格式
   */
  private createSSEEvent(event: string, data: Record<string, any>): string {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  }

  /**
   * 错误分类 - Cloudflare Workers 优化
   */
  private classifyError(error: any): Record<string, any> {
    const message = error instanceof Error ? error.message : String(error)
    const lowerMessage = message.toLowerCase()

    // 网络相关错误
    if (lowerMessage.includes('timeout') || lowerMessage.includes('etimedout')) {
      return {
        category: 'NETWORK',
        type: 'TIMEOUT',
        severity: 'HIGH',
        description: '请求超时'
      }
    }

    if (lowerMessage.includes('enotfound') || lowerMessage.includes('fetch')) {
      return {
        category: 'NETWORK',
        type: 'CONNECTION',
        severity: 'HIGH',
        description: '网络连接失败'
      }
    }

    // 认证相关错误
    if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401') || lowerMessage.includes('authentication')) {
      return {
        category: 'AUTH',
        type: 'INVALID_KEY',
        severity: 'HIGH',
        description: 'API 密钥无效或过期'
      }
    }

    if (lowerMessage.includes('forbidden') || lowerMessage.includes('403') || lowerMessage.includes('permission')) {
      return {
        category: 'AUTH',
        type: 'PERMISSION',
        severity: 'HIGH',
        description: '权限不足'
      }
    }

    // 配额相关错误
    if (lowerMessage.includes('quota') || lowerMessage.includes('rate') || lowerMessage.includes('429')) {
      return {
        category: 'QUOTA',
        type: 'RATE_LIMIT',
        severity: 'MEDIUM',
        description: '请求频率超限或配额不足'
      }
    }

    if (lowerMessage.includes('insufficient') || lowerMessage.includes('balance')) {
      return {
        category: 'QUOTA',
        type: 'BALANCE',
        severity: 'MEDIUM',
        description: '账户余额不足'
      }
    }

    // 模型相关错误
    if (lowerMessage.includes('model') || lowerMessage.includes('not found') || lowerMessage.includes('404')) {
      return {
        category: 'MODEL',
        type: 'NOT_FOUND',
        severity: 'MEDIUM',
        description: '模型不存在或不可用'
      }
    }

    // 特殊的第三方 API 格式错误
    if (lowerMessage.includes('model not support') || lowerMessage.includes('不支持') || lowerMessage.includes('435')) {
      return {
        category: 'MODEL',
        type: 'NOT_SUPPORTED',
        severity: 'HIGH',
        description: '模型不被当前供应商支持'
      }
    }

    // 参数相关错误
    if (lowerMessage.includes('parameter') || lowerMessage.includes('validation') || lowerMessage.includes('400')) {
      return {
        category: 'PARAMETER',
        type: 'INVALID',
        severity: 'MEDIUM',
        description: '请求参数无效'
      }
    }

    // 服务器错误
    if (lowerMessage.includes('server') || lowerMessage.includes('500') || lowerMessage.includes('502') || lowerMessage.includes('503')) {
      return {
        category: 'SERVER',
        type: 'INTERNAL',
        severity: 'HIGH',
        description: '服务器内部错误'
      }
    }

    // 默认分类
    return {
      category: 'UNKNOWN',
      type: 'UNCLASSIFIED',
      severity: 'MEDIUM',
      description: '未知错误类型'
    }
  }
}