/**
 * 预设供应商配置常量
 */

export const PROVIDER_CONFIGS = {
  // 预定义供应商 - 魔搭
  modelscope: {
    name: '魔搭社区',
    description: '阿里云魔搭社区提供的大语言模型服务',
    icon: 'from-blue-500 to-purple-600',
    type: 'openai' as const,
    endpoint: 'https://api-inference.modelscope.cn/v1/chat/completions',
    models: ['Qwen/Qwen3-Coder-480B-A35B-Instruct'],
    helpText: '请前往 https://www.modelscope.cn/ 注册并获取 API Key',
    transformer: 'claude-to-openai' as const,
    isPreset: true
  },
  // 预定义供应商 - Google AI Studio
  google: {
    name: 'Google AI Studio',
    description: 'Google AI Studio 的 Gemini 系列模型',
    icon: 'from-blue-500 to-blue-600',
    type: 'google' as const,
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/{{model}}:generateContent',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    helpText: '请前往 https://aistudio.google.com/apikey 创建并获取 API Key',
    transformer: 'claude-to-gemini' as const,
    isPreset: true
  },
  // 预定义供应商 - MiniMax
  minimax: {
    name: 'MiniMax',
    description: 'MiniMax M2.5 系列模型，支持 Anthropic 兼容 API',
    icon: 'from-orange-500 to-red-600',
    type: 'minimax' as const,
    endpoint: 'https://api.minimaxi.com/anthropic',
    models: ['MiniMax-M2.5', 'MiniMax-M2.5-highspeed', 'MiniMax-M2.5-lightning'],
    helpText: '请前往 https://platform.minimaxi.com/ 注册并获取 API Key',
    transformer: 'claude-to-minimax' as const,
    isPreset: true
  },
  // 自定义 OpenAI 兼容服务
  openai: {
    name: 'OpenAI Compatible',
    description: '兼容 OpenAI API 的自定义服务',
    icon: 'from-gray-500 to-gray-700',
    type: 'openai' as const,
    endpoint: '',
    models: [],
    helpText: '请输入兼容 OpenAI API 格式的服务端点和密钥',
    transformer: 'claude-to-openai' as const,
    isPreset: false
  }
} as const