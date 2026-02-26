<template>
  <button
    @click="handleClick"
    :disabled="loading"
    :class="[
      'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200',
      'hover:scale-105 active:scale-95',
      buttonClass,
      loading ? 'opacity-50 cursor-wait' : ''
    ]"
    :title="loading ? '检测中...' : buttonTitle"
  >
    <!-- 图标 -->
    <svg v-if="capability === 'thinking'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
    </svg>
    <svg v-else-if="capability === 'web_search'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path>
    </svg>
    <svg v-else-if="capability === 'vision'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
    </svg>
    <svg v-else-if="capability === 'long_context'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
    </svg>

    <!-- 标签文字 -->
    <span>{{ label }}</span>

    <!-- 加载指示器 -->
    <svg v-if="loading" class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>

    <!-- 结果指示 -->
    <span v-else-if="supported === true" class="text-green-600">✓</span>
    <span v-else-if="supported === false" class="text-red-500">✗</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CapabilityType } from '../../../shared/types/admin/providers'

interface Props {
  capability: CapabilityType
  model: string
  providerId: string
  supported: boolean | null  // null = 未检测, true = 支持, false = 不支持
  loading?: boolean
}

interface Emits {
  (e: 'detect', capability: CapabilityType): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const capabilityLabels: Record<CapabilityType, string> = {
  thinking: '思考',
  web_search: '联网',
  vision: '视觉',
  long_context: '长文本'
}

const capabilityTitles: Record<CapabilityType, string> = {
  thinking: '点击检测深度思考能力',
  web_search: '点击检测联网搜索能力',
  vision: '点击检测视觉理解能力',
  long_context: '点击检测长上下文能力'
}

const label = computed(() => capabilityLabels[props.capability])
const buttonTitle = computed(() => capabilityTitles[props.capability])

// 按钮样式
const buttonClass = computed(() => {
  if (props.loading) {
    return 'bg-gray-100 text-gray-500'
  }

  if (props.supported === null) {
    // 未检测状态 - 灰色
    return 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  }

  if (props.supported) {
    // 支持 - 绿色
    return 'bg-green-100 text-green-700 hover:bg-green-200'
  }

  // 不支持 - 红色
  return 'bg-red-100 text-red-700 hover:bg-red-200'
})

const handleClick = () => {
  if (!props.loading) {
    emit('detect', props.capability)
  }
}
</script>
