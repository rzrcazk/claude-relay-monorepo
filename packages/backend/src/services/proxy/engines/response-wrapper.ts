/**
 * 响应包装器
 * 负责将转换器的输出包装为标准的 HTTP Response
 */

import type { Message } from '@anthropic-ai/sdk/resources/messages'

export class ResponseWrapper {
  /**
   * 包装转换器的输出为 HTTP Response
   */
  static wrap(result: Message | ReadableStream | Response): Response {
    // 如果已经是 Response，直接返回
    if (result instanceof Response) {
      return result
    }

    if (result instanceof ReadableStream) {
      // 流式响应
      return new Response(result, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      })
    } else {
      // 普通响应
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      })
    }
  }

  /**
   * 创建错误响应
   */
  static createErrorResponse(error: Error, status: number = 500): Response {
    return new Response(JSON.stringify({
      error: {
        type: 'internal_error',
        message: error.message
      }
    }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    })
  }
}