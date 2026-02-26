# 供应商 API 端点改为 Base URL 设计方案

## 背景

当前供应商编辑需要用户填写完整的 API 端点路径（如 `https://api.openai.com/v1/chat/completions`），用户需要知道具体的后缀路径，使用成本高。

## 目标

改为用户只填写 Base URL，系统根据供应商类型自动拼接正确的后缀。

## 方案详情

### 1. 类型定义变更

**文件**: `shared/types/admin/providers.ts`

```typescript
// 变更前
interface ModelProvider {
  endpoint: string  // 完整路径
}

// 变更后
interface ModelProvider {
  baseUrl: string  // 仅 Base URL
}
```

### 2. 预设供应商配置

**文件**: `shared/constants/admin/providers.ts`

```typescript
export const PROVIDER_CONFIGS = {
  modelscope: {
    name: '魔搭社区',
    type: 'modelscope' as const,
    baseUrl: 'https://api-inference.modelscope.cn',
    // 后缀由系统自动添加: /v1/messages
  },
  openai: {
    name: 'OpenAI',
    type: 'openai' as const,
    baseUrl: 'https://api.openai.com',
    // 后缀由系统自动添加: /v1/chat/completions
  },
  google: {
    name: 'Google AI',
    type: 'google' as const,
    baseUrl: 'https://generativelanguage.googleapis.com',
    // 后缀动态构建: /v1beta/models/{model}:generateContent
  },
  minimax: {
    name: 'MiniMax',
    type: 'minimax' as const,
    baseUrl: 'https://api.minimax.chat',
    // 后缀由系统自动添加: /v1/text/chatcompletion_v2
  }
}
```

### 3. 前端变更

**文件**: `packages/frontend/components/ProviderForm.vue`

- 字段名 `endpoint` → `baseUrl`
- placeholder 改为: `https://api.example.com`
- 帮助文本更新

### 4. 后端逻辑变更

**文件**: `packages/backend/src/services/proxy/engines/provider-engine.ts`

新增 `getFullUrl()` 辅助函数：

```typescript
function getFullUrl(provider: ModelProvider, model: string): string {
  switch (provider.type) {
    case 'modelscope':
      return `${provider.baseUrl}/v1/messages`
    case 'openai':
      return `${provider.baseUrl}/v1/chat/completions`
    case 'minimax':
      return `${provider.baseUrl}/v1/text/chatcompletion_v2`
    case 'google':
      return `${provider.baseUrl}/v1beta/models/${model}:generateContent`
    default:
      throw new Error(`Unknown provider type: ${provider.type}`)
  }
}
```

### 5. 其他需同步的文件

| 文件 | 变更内容 |
|------|----------|
| `shared/types/admin/providers.ts` | endpoint → baseUrl |
| `shared/constants/admin/providers.ts` | endpoint → baseUrl |
| `packages/frontend/components/ProviderForm.vue` | 表单字段改名 |
| `packages/backend/src/services/proxy/engines/provider-engine.ts` | URL 构建逻辑 |
| `packages/backend/src/services/proxy/engines/minimax-engine.ts` | 使用 baseUrl |
| `packages/backend/src/services/proxy/transformers/claude-to-modelscope.ts` | 使用 baseUrl |
| 其他引用 `endpoint` 的文件 | 同步更新 |

## 待确认

- [x] 方案选择: 方案 A - 完全改为 base URL
- [x] 支持自定义供应商: 是

### 自定义供应商支持

用户新增供应商时，可选择预设或自定义：

| 选项 | type | transformer | baseUrl |
|------|------|-------------|---------|
| 预设-魔搭 | modelscope | claude-to-modelscope | 自动预设-OpenAI填充 |
|  | openai | claude-to-openai | 自动填充 |
| 预设-Google | google | claude-to-gemini | 自动填充 |
| 预设-MiniMax | minimax | 内置 | 自动填充 |
| **自定义** | 用户选择 | 用户选择 | 用户填写 |

**自定义供应商选项**:

- **type**: openai / gemini / modelscope / minimax（决定后缀拼接逻辑）
- **transformer**: claude-to-openai / claude-to-gemini / claude-to-modelscope
- **baseUrl**: 用户填写（如 `https://api.myservice.com`）

前端表单需要新增 type 选择器：
```vue
<select v-model="form.type">
  <option value="openai">OpenAI 兼容</option>
  <option value="gemini">Google Gemini</option>
  <option value="modelscope">魔搭 (Anthropic 兼容)</option>
  <option value="minimax">MiniMax</option>
</select>
```
