/**
 * 管理路由主入口 - 聚合所有子路由
 */

import { Hono } from 'hono'
import { authRoutes } from './auth'
import { dashboardRoutes } from './dashboard'
import { providerRoutes } from './providers'
import { modelRoutes } from './models'
import { claudeAccountRoutes } from './claude-accounts'
import { keyPoolRoutes } from './key-pool'
import { routeConfigRoutes } from './route-configs'
import { requestLogRoutes } from './request-logs'
import type { Bindings } from '../../types/env'

const adminRoutes = new Hono<{ Bindings: Bindings }>()

// 挂载所有子路由
adminRoutes.route('/', authRoutes)
adminRoutes.route('/', dashboardRoutes)
adminRoutes.route('/', providerRoutes)
adminRoutes.route('/', modelRoutes)
adminRoutes.route('/', claudeAccountRoutes)
adminRoutes.route('/', keyPoolRoutes)
adminRoutes.route('/', routeConfigRoutes)
adminRoutes.route('/', requestLogRoutes)

export { adminRoutes }