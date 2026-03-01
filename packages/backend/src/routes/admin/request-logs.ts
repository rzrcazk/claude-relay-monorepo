/**
 * 请求日志路由
 */

import { Hono } from 'hono'
import { RequestLogRepository } from '../../repositories'
import { createSuccessResponse } from '../../utils/response'
import type { Bindings } from '../../types/env'
import type { GetRequestLogsQuery } from '@shared/types/admin/request-logs'

const requestLogRoutes = new Hono<{ Bindings: Bindings }>()

// 获取请求日志列表
requestLogRoutes.get('/request-logs', async (c) => {
  const limit = c.req.query('limit')
  const cursor = c.req.query('cursor')
  const status = c.req.query('status') as 'success' | 'error' | undefined
  const providerId = c.req.query('providerId')

  const query: GetRequestLogsQuery = {
    limit: limit ? parseInt(limit, 10) : 20,
    cursor: cursor || undefined,
    status,
    providerId
  }

  const repo = new RequestLogRepository(c.env.CLAUDE_RELAY_ADMIN_KV)
  const result = await repo.getLogs(query)

  return createSuccessResponse(result, '获取请求日志成功')
})

// 获取请求日志统计
requestLogRoutes.get('/request-logs/stats', async (c) => {
  const repo = new RequestLogRepository(c.env.CLAUDE_RELAY_ADMIN_KV)
  const stats = await repo.getStats()

  return createSuccessResponse(stats, '获取统计成功')
})

export { requestLogRoutes }
