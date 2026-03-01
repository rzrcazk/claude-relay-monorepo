import { ref } from 'vue'
import type { RequestLog, GetRequestLogsQuery } from '../../../shared/types/admin/request-logs'
import { API_ENDPOINTS } from '../../../shared/constants/endpoints'

export const useRequestLogs = () => {
  const config = useRuntimeConfig()

  // 响应式数据
  const logs = ref<RequestLog[]>([])
  const loading = ref(false)
  const hasMore = ref(false)
  const cursor = ref<string | null>(null)

  // 筛选条件
  const filters = ref<{
    status: 'success' | 'error' | null
    providerId: string | null
  }>({
    status: null,
    providerId: null
  })

  // 加载日志
  const loadLogs = async (reset = false) => {
    if (loading.value) return

    loading.value = true

    try {
      const query: GetRequestLogsQuery = {
        limit: 20,
        cursor: reset ? undefined : (cursor.value || undefined),
        status: filters.value.status || undefined,
        providerId: filters.value.providerId || undefined
      }

      const response = await $fetch<{
        success: boolean
        data: { logs: RequestLog[]; hasMore: boolean }
      }>(
        API_ENDPOINTS.ADMIN_REQUEST_LOGS,
        {
          baseURL: config.public.apiBaseUrl,
          query
        }
      )

      if (response.success) {
        if (reset) {
          logs.value = response.data.logs
        } else {
          logs.value = [...logs.value, ...response.data.logs]
        }
        hasMore.value = response.data.hasMore
        if (response.data.logs.length > 0) {
          cursor.value = response.data.logs[response.data.logs.length - 1].timestamp
        }
      }
    } catch (error) {
      console.error('Failed to load request logs:', error)
    } finally {
      loading.value = false
    }
  }

  // 刷新日志
  const refreshLogs = async () => {
    cursor.value = null
    hasMore.value = false
    await loadLogs(true)
  }

  // 设置筛选条件
  const setFilter = async (key: 'status' | 'providerId', value: string | null) => {
    filters.value[key] = value as any
    await refreshLogs()
  }

  // 加载更多
  const loadMore = async () => {
    if (hasMore.value && !loading.value) {
      await loadLogs(false)
    }
  }

  // 格式化时间
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  // 获取路由规则显示文本
  const getRuleDisplay = (rule: string) => {
    const map: Record<string, string> = {
      default: '默认',
      longContext: '长上下文',
      background: '后台任务',
      think: '深度思考',
      webSearch: '网络搜索'
    }
    return map[rule] || rule
  }

  // 初始化时加载数据
  loadLogs(true)

  return {
    logs,
    loading,
    hasMore,
    filters,
    loadLogs,
    refreshLogs,
    setFilter,
    loadMore,
    formatTime,
    getRuleDisplay
  }
}
