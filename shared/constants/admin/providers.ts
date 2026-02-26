/**
 * 预设供应商配置常量
 */

export const PROVIDER_CONFIGS = {
  // 预定义供应商 - Anthropic 兼容 (魔搭)
  modelscope: {
    name: '魔搭社区',
    description: '阿里云魔搭社区提供的大语言模型服务 (Anthropic 兼容模式)',
    icon: 'from-blue-500 to-purple-600',
    type: 'anthropic' as const,
    baseUrl: 'https://api-inference.modelscope.cn',
    models: ['Qwen/Qwen3.5-397B-A17B', 'Qwen/Qwen2.5-7B-Instruct', 'moonshotai/Kimi-K2.5'],
    helpText: '请前往 https://www.modelscope.cn/ 注册并获取 API Key',
    transformer: 'claude-to-anthropic' as const,
    isPreset: true
  },
  // 预定义供应商 - Google AI Studio
  google: {
    name: 'Google AI Studio',
    description: 'Google AI Studio 的 Gemini 系列模型',
    icon: 'from-blue-500 to-blue-600',
    type: 'gemini' as const,
    baseUrl: 'https://generativelanguage.googleapis.com',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'],
    helpText: '请前往 https://aistudio.google.com/apikey 创建并获取 API Key',
    transformer: 'claude-to-gemini' as const,
    isPreset: true
  },
  // 预定义供应商 - Anthropic 兼容 (MiniMax)
  minimax: {
    name: 'MiniMax',
    description: 'MiniMax M2.5 系列模型 (Anthropic 兼容 API)',
    icon: 'from-orange-500 to-red-600',
    type: 'anthropic' as const,
    baseUrl: 'https://api.minimaxi.com/anthropic',
    models: ['MiniMax-M2.5', 'MiniMax-M2.5-highspeed', 'MiniMax-M2.5-lightning'],
    helpText: '请前往 https://platform.minimaxi.com/ 注册并获取 API Key',
    transformer: 'claude-to-anthropic' as const,
    isPreset: true
  },
  // 自定义 OpenAI 兼容服务
  openai: {
    name: 'OpenAI Compatible',
    description: '兼容 OpenAI API 的自定义服务',
    icon: 'from-gray-500 to-gray-700',
    type: 'openai' as const,
    baseUrl: '',
    models: [],
    helpText: '请输入兼容 OpenAI API 格式的服务端点和密钥',
    transformer: 'claude-to-openai' as const,
    isPreset: false
  }
} as const