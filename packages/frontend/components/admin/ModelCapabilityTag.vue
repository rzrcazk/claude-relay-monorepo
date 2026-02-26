<template>
  <button
    @click="handleClick"
    :class="[
      'inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200',
      'hover:scale-105 active:scale-95',
      buttonClass
    ]"
    :title="buttonTitle"
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

    <!-- 状态指示 -->
    <span v-if="supported === true" class="text-green-600">✓</span>
    <span v-else-if="supported === false" class="text-red-500">✗</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { CapabilityType } from '../../../shared/types/admin/providers'

// 预设测试提示词
export const CAPABILITY_PROMPTS: Record<CapabilityType, { message: string; image?: string }> = {
  vision: {
    message: '这张图片里有什么？请描述你看到的内容。',
    // 1x1 透明 PNG
    image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  },
  thinking: {
    message: '请详细思考并回答：为什么天空是蓝色的？请展示你的思考过程。'
  },
  web_search: {
    message: '搜索一下今天北京天气怎么样？'
  },
  long_context: {
    message: '请详细解释一下什么是量子计算？'
  }
}

interface Props {
  capability: CapabilityType
  model: string
  providerId: string
  supported: boolean | null  // null = 未标记, true = 支持, false = 不支持
}

interface Emits {
  (e: 'fill', capability: CapabilityType): void  // 填充消息框
  (e: 'toggle', capability: CapabilityType): void   // 切换状态
}

const props = defineProps<Props>()

const emit = defineEmits<Emits>()

const capabilityLabels: Record<CapabilityType, string> = {
  thinking: '思考',
  web_search: '联网',
  vision: '视觉',
  long_context: '长文本'
}

const capabilityTitles: Record<CapabilityType, string> = {
  thinking: '点击填充思考测试提示词',
  web_search: '点击填充联网测试提示词',
  vision: '点击填充视觉测试提示词',
  long_context: '点击填充长文本测试提示词'
}

const label = computed(() => capabilityLabels[props.capability])
const buttonTitle = computed(() => capabilityTitles[props.capability])

// 按钮样式
const buttonClass = computed(() => {
  if (props.supported === null) {
    // 未标记状态 - 灰色
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
  // 填充消息框
  emit('fill', props.capability)
  // 切换状态
  emit('toggle', props.capability)
}
</script>
