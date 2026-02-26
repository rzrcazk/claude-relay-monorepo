/**
 * MiniMax Engine
 * 使用 Anthropic 兼容 API，复用 Claude Engine 逻辑
 */

import type { Engine } from './types'
import type { MessageCreateParamsBase } from '@anthropic-ai/sdk/resources/messages'
import { HTTPException } from 'hono/http-exception'

export class MinimaxEngine implements Engine {
  private apiKey: string
  private baseUrl: string

  constructor(apiKey: string, baseUrl: string = 'https://api.minimax.chat') {
    this.apiKey = apiKey
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  async processRequest(request: MessageCreateParamsBase): Promise<Response> {
    // Anthropic 兼容统一使用 /v1/messages
    const url = `${this.baseUrl}/v1/messages`
    const response = await fetch(url, {
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
