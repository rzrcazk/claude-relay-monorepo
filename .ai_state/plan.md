# 模型能力检测功能实现计划

## 需求概述

在供应商/模型管理中增加能力标签（思考、联网、视觉等），点击标签时真实检测该能力，用颜色反馈结果。

### 核心设计

1. **可插拔**: 不检测、不实现对现有逻辑无影响
2. **手动触发**: 用户选择供应商和模型后，点击标签才检测
3. **颜色反馈**: 绿色=支持，红色=不支持

---

## 任务列表

### T-001: 类型定义 (shared/types/admin/providers.ts)

新增能力检测相关类型：

```typescript
// 能力检测请求
export interface DetectCapabilityRequest {
  model: string
  capability: 'thinking' | 'web_search' | 'vision' | 'long_context'
}

// 能力检测响应
export interface DetectCapabilityResponse {
  capability: string
  supported: boolean
  latency: number
  message: string
  error?: string
}

// 能力标签（存储在模型元数据中）
export interface ModelCapability {
  capability: 'thinking' | 'web_search' | 'vision' | 'long_context'
  supported: boolean | null  // null 表示未检测
  detectedAt?: string
}

// 扩展 ModelProvider
interface ModelProvider {
  // ... 现有字段
  capabilities?: Record<string, ModelCapability[]>  // model -> capabilities
}
```

### T-002: 后端 API (packages/backend/src/routes/admin/providers.ts)

新增检测端点：

```
POST /api/admin/providers/:id/detect-capability
```

请求体：
```json
{
  "model": "qwen-turbo",
  "capability": "thinking"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "capability": "thinking",
    "supported": true,
    "latency": 1500,
    "message": "模型支持深度思考"
  }
}
```

**检测逻辑**:

| 能力 | 检测方式 |
|------|----------|
| thinking | 发送带 `thinking` 提示的请求，检查返回是否有 thinking 块 |
| web_search | 发送带工具请求，检查是否能调用搜索 |
| vision | 发送带图片的请求，检查是否能处理图片（复用现有 test-vision 逻辑）|
| long_context | 检查模型配置中的上下文窗口大小 |

### T-003: 后端服务 (packages/backend/src/services/admin/providers.ts)

在 `ProviderService` 中新增 `detectCapability` 方法，实现上述检测逻辑。

### T-004: 前端组件 (packages/frontend/components/admin/)

新增 `ModelCapabilityTag.vue` 组件：

```vue
<template>
  <button
    @click="handleClick"
    :class="[
      'px-2 py-1 rounded text-xs font-medium transition-colors',
      statusClass
    ]"
    :disabled="loading"
  >
    {{ label }}
    <span v-if="loading" class="ml-1">...</span>
  </button>
</template>
```

属性：
- `capability`: 能力类型
- `model`: 模型名称
- `providerId`: 供应商 ID
- `supported`: 当前支持状态 (true/false/null)

### T-005: 集成到 ProviderForm (packages/frontend/components/ProviderForm.vue)

在模型列表项旁边显示能力标签：

```vue
<!-- 模型列表项 -->
<div v-for="model in form.models" class="flex items-center justify-between">
  <span>{{ model }}</span>
  <div class="flex gap-1">
    <ModelCapabilityTag
      v-for="cap in capabilities"
      :key="cap.type"
      :capability="cap.type"
      :model="model"
      :provider-id="providerId"
      @result="handleResult"
    />
  </div>
</div>
```

### T-006: API 调用 (packages/frontend/composables/useProviderApi.ts)

新增能力检测 API 调用方法。

---

## 依赖关系

```
T-001 (类型定义)
  └─ T-002 (后端路由) ─ T-003 (后端服务)
  └─ T-004 (前端组件) ─ T-006 (前端 API)
       └─ T-005 (集成到表单)
```

---

## 确认状态

- [ ] 方案确认: 用户已确认方向
- [ ] 能力列表: thinking, web_search, vision, long_context
- [ ] 触发方式: 点击标签检测
- [ ] 反馈方式: 绿色/红色颜色标识
