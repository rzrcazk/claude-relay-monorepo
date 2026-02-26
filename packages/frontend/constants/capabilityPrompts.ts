import type { CapabilityType } from '../shared/types/admin/providers'

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
