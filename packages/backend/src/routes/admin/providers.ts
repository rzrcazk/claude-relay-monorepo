/**
 * 模型供应商管理路由
 */

import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { HTTPException } from 'hono/http-exception'
import { ProviderService } from '../../services/admin/index'
import { createSuccessResponse } from '../../utils/response'
import { AddProviderRequest, EditProviderRequest, TestConnectionRequest, TestVisionRequest, ChatRequest } from '../../../../../shared/types/admin/providers'
import type { Bindings } from '../../types/env'

const providerRoutes = new Hono<{ Bindings: Bindings }>()

// 获取所有模型供应商
providerRoutes.get('/providers', async (c) => {
  const providerService = new ProviderService(c.env.CLAUDE_RELAY_ADMIN_KV)
  const providers = await providerService.getProviders()
  
  return createSuccessResponse(providers, '获取供应商列表成功')
})

// 添加模型供应商
providerRoutes.post('/providers',
  validator('json', (value: any): AddProviderRequest => {
    const { name, type, endpoint, models } = value
    
    if (!name || !type || !endpoint || !models) {
      throw new HTTPException(400, {
        message: '缺少必填字段'
      })
    }
    
    return value
  }),
  async (c) => {
    const request = c.req.valid('json')
    
    const providerService = new ProviderService(c.env.CLAUDE_RELAY_ADMIN_KV)
    const provider = await providerService.addProvider(request)
    
    return createSuccessResponse(provider, '添加供应商成功')
  }
)

// 编辑模型供应商
providerRoutes.put('/providers/:id',
  validator('param', (value) => {
    if (!value.id) {
      throw new HTTPException(400, {
        message: '缺少供应商 ID'
      })
    }
    return value
  }),
  validator('json', (value: any): EditProviderRequest => {
    const { name, endpoint, models } = value
    
    if (!name || !endpoint || !models || !Array.isArray(models)) {
      throw new HTTPException(400, {
        message: '缺少必填字段或格式错误'
      })
    }
    
    return value
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const request = c.req.valid('json')
    
    const providerService = new ProviderService(c.env.CLAUDE_RELAY_ADMIN_KV)
    const provider = await providerService.editProvider(id, request)
    
    return createSuccessResponse(provider, '编辑供应商成功')
  }
)

// 删除模型供应商
providerRoutes.delete('/providers/:id',
  validator('param', (value) => {
    if (!value.id) {
      throw new HTTPException(400, {
        message: '缺少供应商 ID'
      })
    }
    return value
  }),
  async (c) => {
    const { id } = c.req.valid('param')

    const providerService = new ProviderService(c.env.CLAUDE_RELAY_ADMIN_KV)
    await providerService.deleteProvider(id)

    return createSuccessResponse(null, '删除供应商成功')
  }
)

// 测试供应商连通性
providerRoutes.post('/providers/:id/test-connection',
  validator('param', (value) => {
    if (!value.id) {
      throw new HTTPException(400, {
        message: '缺少供应商 ID'
      })
    }
    return value
  }),
  validator('json', (value: any): TestConnectionRequest => {
    const { model } = value

    if (!model) {
      throw new HTTPException(400, {
        message: '缺少模型名称'
      })
    }

    return value
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const request = c.req.valid('json')

    const providerService = new ProviderService(c.env.CLAUDE_RELAY_ADMIN_KV)
    const result = await providerService.testConnection(id, request)

    return createSuccessResponse(result, '连通性测试完成')
  }
)

// 测试供应商图片识别能力
providerRoutes.post('/providers/:id/test-vision',
  validator('param', (value) => {
    if (!value.id) {
      throw new HTTPException(400, {
        message: '缺少供应商 ID'
      })
    }
    return value
  }),
  validator('json', (value: any): TestVisionRequest => {
    const { model } = value

    if (!model) {
      throw new HTTPException(400, {
        message: '缺少模型名称'
      })
    }

    return value
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const request = c.req.valid('json')

    const providerService = new ProviderService(c.env.CLAUDE_RELAY_ADMIN_KV)
    const result = await providerService.testVision(id, request)

    return createSuccessResponse(result, '图片识别测试完成')
  }
)

// 聊天测试
providerRoutes.post('/providers/:id/chat',
  validator('param', (value) => {
    if (!value.id) {
      throw new HTTPException(400, {
        message: '缺少供应商 ID'
      })
    }
    return value
  }),
  validator('json', (value: any): ChatRequest => {
    const { model, message } = value

    if (!model) {
      throw new HTTPException(400, {
        message: '缺少模型名称'
      })
    }

    if (!message) {
      throw new HTTPException(400, {
        message: '缺少消息内容'
      })
    }

    return value
  }),
  async (c) => {
    const { id } = c.req.valid('param')
    const request = c.req.valid('json')

    const providerService = new ProviderService(c.env.CLAUDE_RELAY_ADMIN_KV)
    const result = await providerService.chat(id, request)

    return createSuccessResponse(result, '聊天测试完成')
  }
)

export { providerRoutes }