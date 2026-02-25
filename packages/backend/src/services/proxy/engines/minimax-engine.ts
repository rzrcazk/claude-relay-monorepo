/**
 * MiniMax Engine
 * 使用 Anthropic 兼容 API，复用 Claude Engine 逻辑
 */

import type { Engine } from './types'
import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages'
import { HTTPException } from 'hono/http-exception'

export class MinimaxEngine implements Engine {
  private apiKey: string
  private endpoint: string

  constructor(apiKey: string, endpoint: string = 'https://api.minimaxi.com/anthropic') {
    this.apiKey = apiKey
    this.endpoint = endpoint
  }

  async processRequest(request: MessageCreateParamsBase): Promise<Response> {
    // 转发请求到 MiniMax Anthropic 兼容 API
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(request)
    })

    // 处理响应
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`MiniMax API error: ${response.status}`, errorText)

      throw new HTTPException(response.status as any, {
        message: `MiniMax API error: ${errorText}`
      })
    }

    // 返回响应（支持流式和非流式）
    const contentType = response.headers.get('Content-Type')
    const isStream = contentType?.includes('text/event-stream')

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': contentType || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        ...(isStream && {
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no'
        })
      }
    })
  }
}
