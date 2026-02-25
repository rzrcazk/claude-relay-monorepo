/**
 * Claude to ModelScope 转换器
 * 使用原生 fetch 调用 ModelScope 的 Claude 兼容 API
 * ModelScope 支持 Claude API 格式请求
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

export class ClaudeToModelScopeTransformer implements Transformer {
  private apiKey: string = ''
  private baseURL: string = ''

  /**
   * 初始化客户端
   * 使用 ModelScope 的 Claude 兼容端点
   */
  public initializeClient(apiKey: string, options?: {
    baseUrl?: string
  }): void {
    if (!options?.baseUrl) {
      throw new Error('baseUrl is required for ModelScope Claude-compatible provider')
    }

    this.apiKey = apiKey
    // 移除 trailing slash
    this.baseURL = options.baseUrl.replace(/\/$/, '')
  }

  /**
   * 主要转换方法 - 使用原生 fetch 调用 ModelScope
   */
  async processRequest(claudeRequest: MessageCreateParamsBase, model: string): Promise<Message | ReadableStream> {
    if (!this.apiKey || !this.baseURL) {
      throw new Error('ModelScope client not initialized. Call initializeClient() first.')
    }

    // 构建请求参数
    const params = this.buildParams(claudeRequest, model)

    // Cloudflare Workers 优化日志
    console.log(`=== ModelScope Claude API 请求开始 [${new Date().toISOString()}] ===`)
    console.log('📤 请求详情:', JSON.stringify({
      url: `${this.baseURL}/v1/messages`,
      method: 'POST',
      body: {
        model: params.model,
        max_tokens: params.max_tokens,
        stream: params.stream
      }
    }, null, 2))

    if (claudeRequest.stream) {
      // 流式响应
      return await this.makeStreamingRequest(params)
    } else {
      // 非流式响应
      const response = await this.makeRequest(params)
      return this.transformResponse(response, model)
    }
  }

  /**
   * 构建请求参数
   */
  private buildParams(claudeRequest: MessageCreateParamsBase, model: string): Record<string, unknown> {
    const params: Record<string, unknown> = {
      model,
      max_tokens: claudeRequest.max_tokens || 1024,
      messages: this.transformMessages(claudeRequest.messages || [])
    }

    // 系统消息
    if (claudeRequest.system) {
      const systemContent = typeof claudeRequest.system === 'string'
        ? claudeRequest.system
        : this.extractTextFromContent(claudeRequest.system as any)
      params.system = systemContent
    }

    // 其他可选参数
    if (claudeRequest.temperature !== undefined) params.temperature = claudeRequest.temperature
    if (claudeRequest.top_p !== undefined) params.top_p = claudeRequest.top_p
    if (claudeRequest.stop_sequences) params.stop_sequences = claudeRequest.stop_sequences

    // 工具
    if (claudeRequest.tools?.length) {
      params.tools = this.transformTools(claudeRequest.tools as ClaudeTool[])
      if (claudeRequest.tool_choice) {
        params.tool_choice = claudeRequest.tool_choice
      }
    }

    // 流式标记
    if (claudeRequest.stream) {
      params.stream = true
    }

    return params
  }

  /**
   * 转换消息数组
   */
  private transformMessages(messages: MessageParam[]): Record<string, unknown>[] {
    return messages.map(message => this.transformMessage(message))
  }

  /**
   * 转换单个消息
   */
  private transformMessage(message: MessageParam): Record<string, unknown> {
    if (typeof message.content === 'string') {
      return {
        role: message.role,
        content: message.content
      }
    }

    if (Array.isArray(message.content)) {
      const content: Record<string, unknown>[] = []

      for (const item of message.content) {
        switch (item.type) {
          case 'text': {
            const textBlock = item as TextBlockParam
            content.push({
              type: 'text',
              text: textBlock.text
            })
            break
          }

          case 'image': {
            const imageBlock = item as ImageBlockParam
            if (imageBlock.source.type === 'base64') {
              content.push({
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageBlock.source.media_type,
                  data: imageBlock.source.data
                }
              })
            }
            break
          }

          case 'tool_use': {
            const toolUseBlock = item as ToolUseBlockParam
            content.push({
              type: 'tool_use',
              id: toolUseBlock.id,
              name: toolUseBlock.name,
              input: toolUseBlock.input || {}
            })
            break
          }

          case 'tool_result': {
            const toolResultBlock = item as ToolResultBlockParam
            content.push({
              type: 'tool_result',
              tool_use_id: toolResultBlock.tool_use_id,
              content: typeof toolResultBlock.content === 'string'
                ? toolResultBlock.content
                : JSON.stringify(toolResultBlock.content)
            })
            break
          }
        }
      }

      return {
        role: message.role,
        content
      }
    }

    return {
      role: message.role,
      content: ''
    }
  }

  /**
   * 转换工具定义
   */
  private transformTools(tools: ClaudeTool[]): Record<string, unknown>[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema
    }))
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
   * 发送非流式请求
   */
  private async makeRequest(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('=== ModelScope API 错误 ===')
      console.error('状态码:', response.status)
      console.error('响应:', errorText)
      throw new Error(`ModelScope API 错误: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as Record<string, unknown>

    console.log(`=== ModelScope Claude API 响应接收 [${new Date().toISOString()}] ===`)
    console.log('📥 响应元数据:', JSON.stringify({
      id: data.id,
      type: data.type,
      model: data.model
    }, null, 2))

    return data
  }

  /**
   * 发送流式请求
   */
  private async makeStreamingRequest(params: Record<string, unknown>): Promise<ReadableStream> {
    const response = await fetch(`${this.baseURL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(params)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('=== ModelScope API 错误 ===')
      console.error('状态码:', response.status)
      console.error('响应:', errorText)
      throw new Error(`ModelScope API 错误: ${response.status} - ${errorText}`)
    }

    if (!response.body) {
      throw new Error('ModelScope API 响应体为空')
    }

    return this.transformStreamResponse(response.body)
  }

  /**
   * 转换响应为 Claude 格式
   */
  private transformResponse(data: Record<string, unknown>, model: string): Message {
    const messageData = data.message as Record<string, unknown> | undefined
    if (!messageData) {
      throw new Error('ModelScope API 响应格式错误: 缺少 message 字段')
    }

    const content = messageData.content as Array<Record<string, unknown>> | undefined
    if (!content) {
      throw new Error('ModelScope API 响应格式错误: 缺少 content 字段')
    }

    // 转换 content
    const transformedContent: Array<Record<string, unknown>> = content.map(block => {
      if (block.type === 'text') {
        return {
          type: 'text',
          text: block.text
        }
      }
      if (block.type === 'tool_use') {
        return {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input
        }
      }
      return block
    })

    return {
      id: messageData.id as string || `msg_${Date.now()}`,
      type: 'message',
      role: (messageData.role as 'assistant') || 'assistant',
      model: model,
      content: transformedContent as any,
      stop_reason: this.mapStopReason(messageData.stop_reason as string | null),
      stop_sequence: null,
      usage: {
        input_tokens: (messageData.usage as Record<string, number> | undefined)?.input_tokens || 0,
        output_tokens: (messageData.usage as Record<string, number> | undefined)?.output_tokens || 0,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
        server_tool_use: null,
        service_tier: null
      }
    }
  }

  /**
   * 转换流式响应
   */
  private transformStreamResponse(body: ReadableStream<Uint8Array>): ReadableStream {
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    return new ReadableStream({
      async start(controller) {
        const reader = body.getReader()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()

            if (done) {
              break
            }

            buffer += decoder.decode(value, { stream: true })

            // 处理 SSE 事件
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)

                // 跳过 [DONE] 消息
                if (data === '[DONE]') {
                  controller.enqueue(encoder.encode('event: message_stop\ndata: {"type":"message_stop"}\n\n'))
                  controller.close()
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  // 转换事件名称
                  const eventType = parsed.type === 'message_delta' ? 'content_block_delta'
                    : parsed.type === 'message_start' ? 'message_start'
                    : parsed.type === 'content_block_start' ? 'content_block_start'
                    : parsed.type === 'content_block_stop' ? 'content_block_stop'
                    : parsed.type

                  controller.enqueue(encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify({ ...parsed, type: eventType })}\n\n`))
                } catch {
                  // 忽略解析错误
                }
              }
            }
          }
        } catch (error) {
          controller.error(error)
        } finally {
          controller.close()
        }
      }
    })
  }

  /**
   * 映射停止原因
   */
  private mapStopReason(reason: string | null): StopReason {
    if (!reason) return 'end_turn'

    const mapping: Record<string, StopReason> = {
      'end_turn': 'end_turn',
      'max_tokens': 'max_tokens',
      'tool_use': 'tool_use',
      'stop': 'end_turn'
    }

    return mapping[reason] || 'end_turn'
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.apiKey = ''
  }
}
