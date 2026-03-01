<template>
  <div class="bg-gradient-to-br from-orange-50 via-orange-50 to-amber-50 min-h-screen">
    <!-- 背景装饰 -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-20 right-20 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
      <div class="absolute bottom-20 left-20 w-64 h-64 bg-orange-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
    </div>

    <!-- 顶部导航 -->
    <nav class="relative z-10 bg-white/80 backdrop-blur-sm border-b border-orange-100 sticky top-0">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center space-x-4">
            <NuxtLink to="/admin/dashboard" class="flex items-center space-x-2 text-gray-500 hover:text-orange-600 transition">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
              </svg>
              <span class="text-sm">返回</span>
            </NuxtLink>
            <div class="h-8 w-px bg-gray-300"></div>
            <div>
              <h1 class="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-600 bg-clip-text text-transparent">
                请求日志
              </h1>
              <p class="text-xs text-gray-500">查看请求路由记录</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <button @click="refreshLogs"
                    class="flex items-center space-x-2 text-gray-500 hover:text-orange-600 px-3 py-2 rounded-xl hover:bg-white/50 transition">
              <svg class="w-4 h-4" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              <span class="text-sm">刷新</span>
            </button>
          </div>
        </div>
      </div>
    </nav>

    <div class="relative z-10 max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
      <div class="px-4 sm:px-0">
        <!-- 筛选条件 -->
        <div class="bg-white/50 backdrop-blur-sm rounded-xl p-4 mb-6">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-600">状态:</span>
              <select v-model="statusFilter"
                      @change="handleFilterChange"
                      class="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                <option value="">全部</option>
                <option value="success">成功</option>
                <option value="error">失败</option>
              </select>
            </div>
          </div>
        </div>

        <!-- 日志列表 -->
        <div class="bg-white/50 backdrop-blur-sm rounded-xl overflow-hidden">
          <!-- 表头 -->
          <div class="grid grid-cols-12 gap-4 px-6 py-3 bg-orange-100/50 text-xs font-medium text-gray-600">
            <div class="col-span-2">时间</div>
            <div class="col-span-2">请求模型</div>
            <div class="col-span-2">路由规则</div>
            <div class="col-span-3">路由原因</div>
            <div class="col-span-2">实际路由</div>
            <div class="col-span-1 text-center">状态</div>
          </div>

          <!-- 加载状态 -->
          <div v-if="loading && logs.length === 0" class="py-12 text-center text-gray-500">
            加载中...
          </div>

          <!-- 空状态 -->
          <div v-else-if="logs.length === 0" class="py-12 text-center text-gray-500">
            暂无请求日志
          </div>

          <!-- 日志项 -->
          <div v-else>
            <div v-for="log in logs" :key="log.id"
                 class="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-100 hover:bg-orange-50/30 transition">
              <div class="col-span-2 text-sm text-gray-600">
                {{ formatTime(log.timestamp) }}
              </div>
              <div class="col-span-2 text-sm font-mono text-gray-800">
                {{ log.requestedModel || '-' }}
              </div>
              <div class="col-span-2">
                <span :class="getRuleBadgeClass(log.routeRule)" class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium">
                  {{ getRuleDisplay(log.routeRule) }}
                </span>
              </div>
              <div class="col-span-3 text-sm text-gray-600">
                {{ log.routeReason }}
              </div>
              <div class="col-span-2">
                <div class="text-sm font-medium text-gray-800">{{ log.selectedProviderName }}</div>
                <div class="text-xs text-gray-500 font-mono">{{ log.selectedModel }}</div>
              </div>
              <div class="col-span-1 flex justify-center">
                <span v-if="log.status === 'success'"
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  成功
                </span>
                <span v-else
                      class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                  失败
                </span>
              </div>
            </div>

            <!-- 加载更多 -->
            <div v-if="hasMore" class="py-6 text-center">
              <button @click="loadMore"
                      :disabled="loading"
                      class="px-4 py-2 text-sm text-orange-600 hover:text-orange-700 disabled:opacity-50 transition">
                {{ loading ? '加载中...' : '加载更多' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRequestLogs } from '~/composables/useRequestLogs'

useHead({
  title: '请求日志 - Claude Code 管理中心'
})

const {
  logs,
  loading,
  hasMore,
  refreshLogs,
  setFilter,
  loadMore,
  formatTime,
  getRuleDisplay
} = useRequestLogs()

// 筛选状态
const statusFilter = ref('')

// 筛选变化处理
const handleFilterChange = async () => {
  await setFilter('status', statusFilter.value || null)
}

// 刷新
const refresh = async () => {
  await refreshLogs()
}

// 路由规则徽章样式
const getRuleBadgeClass = (rule: string) => {
  const classes: Record<string, string> = {
    default: 'bg-gray-100 text-gray-800',
    longContext: 'bg-yellow-100 text-yellow-800',
    background: 'bg-blue-100 text-blue-800',
    think: 'bg-purple-100 text-purple-800',
    webSearch: 'bg-orange-100 text-orange-800'
  }
  return classes[rule] || 'bg-gray-100 text-gray-800'
}
</script>
