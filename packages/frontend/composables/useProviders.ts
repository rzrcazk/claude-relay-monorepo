import { ref, inject } from 'vue'
import type { ModelProvider, EditProviderRequest, TestConnectionResponse, TestVisionResponse, ChatResponse, DetectCapabilityResponse, CapabilityType } from '../../../shared/types/admin/providers'
import type { KeyPoolStats } from '../../../shared/types/key-pool'
import { API_ENDPOINTS } from '../../../shared/constants/endpoints'
import { useKeyPool } from './useKeyPool'

export const useProviders = () => {
  const config = useRuntimeConfig()
  const { getMultipleKeyPoolStats, formatKeyPoolStatus } = useKeyPool()
  
  // 注入 refreshDashboard 方法
  const refreshDashboard = inject<(() => Promise<void>) | undefined>('refreshDashboard')
  
  // 响应式数据
  const providers = ref<ModelProvider[]>([])
  const keyPoolStatuses = ref<Map<string, string>>(new Map())
  const expandedProviders = ref<Set<string>>(new Set())
  const showEditModal = ref(false)
  const editingProvider = ref<ModelProvider | null>(null)
  const editLoading = ref(false)
  
  // 确认对话框状态
  const showConfirmDialog = ref(false)
  const confirmDialogConfig = ref<{
    title: string
    message: string
    description?: string
    type: 'danger' | 'warning' | 'info'
    onConfirm: () => void
  } | null>(null)
  const confirmLoading = ref(false)

  // 通知函数
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const notification = document.createElement('div')
    notification.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-xl text-white font-medium shadow-lg transform translate-x-full transition-transform duration-300 ${
      type === 'success' ? 'bg-emerald-500' : type === 'error' ? 'bg-red-500' : 'bg-orange-500'
    }`
    notification.textContent = message
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.classList.remove('translate-x-full')
    }, 100)
    
    setTimeout(() => {
      notification.classList.add('translate-x-full')
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, 3000)
  }

  // 供应商管理方法
  const loadProviders = async () => {
    try {
      const response = await $fetch<{ success: boolean; data: ModelProvider[] }>(
        API_ENDPOINTS.ADMIN_PROVIDERS,
        { baseURL: config.public.apiBaseUrl }
      )
      if (response.success) {
        providers.value = response.data
        // 加载所有供应商的密钥池状态
        await loadKeyPoolStatuses()
      }
    } catch (error) {
      console.error('Failed to load providers:', error)
    }
  }

  const loadKeyPoolStatuses = async () => {
    if (providers.value.length === 0) return
    
    const providerIds = providers.value.map(p => p.id)
    const statsMap = await getMultipleKeyPoolStats(providerIds)
    
    // 更新状态显示
    keyPoolStatuses.value.clear()
    providers.value.forEach(provider => {
      const stats = statsMap.get(provider.id) || null
      keyPoolStatuses.value.set(provider.id, formatKeyPoolStatus(stats))
    })
  }

  const editProvider = (provider: ModelProvider) => {
    editingProvider.value = { ...provider }
    showEditModal.value = true
  }

  const updateProvider = async (request: EditProviderRequest) => {
    if (!editingProvider.value) return
    
    editLoading.value = true
    
    try {
      const response = await $fetch<{ success: boolean; data: ModelProvider }>(
        `${API_ENDPOINTS.ADMIN_PROVIDERS}/${editingProvider.value.id}`,
        {
          method: 'PUT',
          baseURL: config.public.apiBaseUrl,
          body: request
        }
      )
      
      if (response.success) {
        await loadProviders() // 刷新供应商列表
        // 刷新 dashboard 数据以更新供应商数量
        if (refreshDashboard) {
          await refreshDashboard()
        }
        showEditModal.value = false
        editingProvider.value = null
        showNotification('供应商更新成功', 'success')
      }
    } catch (error) {
      console.error('Failed to update provider:', error)
      showNotification('更新供应商失败', 'error')
    } finally {
      editLoading.value = false
    }
  }

  const cancelEdit = () => {
    showEditModal.value = false
    editingProvider.value = null
  }

  const deleteProvider = async (id: string) => {
    const provider = providers.value.find(p => p.id === id)
    if (!provider) return
    
    confirmDialogConfig.value = {
      title: '删除供应商',
      message: `确定要删除供应商"${provider.name}"吗？`,
      description: '删除后将无法恢复，该供应商的所有配置和密钥池数据也将被清除。',
      type: 'danger',
      onConfirm: async () => {
        confirmLoading.value = true
        
        try {
          const response = await $fetch<{ success: boolean }>(
            `${API_ENDPOINTS.ADMIN_PROVIDERS}/${id}`,
            {
              method: 'DELETE',
              baseURL: config.public.apiBaseUrl
            }
          )
          
          if (response.success) {
            await loadProviders()
            // 刷新 dashboard 数据以更新供应商数量
            if (refreshDashboard) {
              await refreshDashboard()
            }
            showNotification('删除供应商成功', 'success')
            showConfirmDialog.value = false
          }
        } catch (error) {
          console.error('Failed to delete provider:', error)
          showNotification('删除供应商失败', 'error')
        } finally {
          confirmLoading.value = false
        }
      }
    }
    
    showConfirmDialog.value = true
  }
  
  // 确认对话框方法
  const handleConfirmDialogCancel = () => {
    showConfirmDialog.value = false
    confirmDialogConfig.value = null
    confirmLoading.value = false
  }
  
  const handleConfirmDialogConfirm = () => {
    if (confirmDialogConfig.value?.onConfirm) {
      confirmDialogConfig.value.onConfirm()
    }
  }

  // 展开/收起供应商模型列表
  const toggleProviderExpansion = (providerId: string) => {
    if (expandedProviders.value.has(providerId)) {
      expandedProviders.value.delete(providerId)
    } else {
      expandedProviders.value.add(providerId)
    }
  }

  // 测试功能相关状态
  const showTestModal = ref(false)
  const testingProvider = ref<ModelProvider | null>(null)
  const selectedTestModel = ref('')
  const testingType = ref<'connection' | 'vision'>('connection')
  const testLoading = ref(false)
  const testResult = ref<{
    success: boolean
    latency: number
    message: string
    visionSupported?: boolean
    error?: string
  } | null>(null)

  // 聊天测试相关状态
  const chatTab = ref<'text' | 'image'>('text')
  const chatInput = ref('Hi')
  const chatImage = ref<string | null>(null)
  const chatLoading = ref(false)
  const chatMessages = ref<Array<{
    role: 'user' | 'assistant'
    content: string
    image?: string
    latency?: number
  }>>([])

  // 打开测试模态框
  const openTestModal = (provider: ModelProvider, type: 'connection' | 'vision') => {
    testingProvider.value = provider
    testingType.value = type
    selectedTestModel.value = provider.models[0] || ''
    testResult.value = null
    // 重置聊天状态
    chatTab.value = 'text'
    chatInput.value = 'Hi'
    chatImage.value = null
    chatMessages.value = []
    showTestModal.value = true
  }

  // 关闭测试模态框
  const closeTestModal = () => {
    showTestModal.value = false
    testingProvider.value = null
    selectedTestModel.value = ''
    testResult.value = null
    // 重置聊天状态
    chatMessages.value = []
    chatImage.value = null
  }

  // 发送聊天消息
  const sendChat = async () => {
    if (!testingProvider.value || !selectedTestModel.value) return
    // 至少需要有文字或图片
    if (!chatInput.value.trim() && !chatImage.value) return

    chatLoading.value = true

    const userMessage = chatInput.value.trim()
    const userImage = chatImage.value || undefined

    // 添加用户消息
    chatMessages.value.push({
      role: 'user',
      content: userMessage,
      image: userImage
    })

    const currentInput = userMessage
    const currentImage = userImage

    // 清空输入
    chatInput.value = 'Hi'
    chatImage.value = null

    try {
      const response = await $fetch<{ success: boolean; data: ChatResponse }>(
        `${API_ENDPOINTS.ADMIN_PROVIDERS}/${testingProvider.value.id}/chat`,
        {
          method: 'POST',
          baseURL: config.public.apiBaseUrl,
          body: {
            model: selectedTestModel.value,
            message: currentInput,
            image: currentImage
          }
        }
      )

      // 添加 AI 回复
      chatMessages.value.push({
        role: 'assistant',
        content: response.data.response || response.data.error || '无响应',
        latency: response.data.latency
      })
    } catch (error: any) {
      chatMessages.value.push({
        role: 'assistant',
        content: `错误: ${error.data?.message || error.message || '请求失败'}`,
        latency: 0
      })
    } finally {
      chatLoading.value = false
    }
  }

  // 处理图片上传
  const handleImageUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      // 提取 base64 数据（去掉 data:image/xxx;base64, 前缀）
      const base64 = result.split(',')[1]
      chatImage.value = base64
    }
    reader.readAsDataURL(file)
  }

  // 清除图片
  const clearImage = () => {
    chatImage.value = null
  }

  // 能力检测相关状态
  const capabilityResults = ref<Map<string, Map<string, boolean>>>(new Map())  // providerId -> model -> capability -> supported

  // 检测模型能力
  const detectCapability = async (
    providerId: string,
    model: string,
    capability: CapabilityType
  ): Promise<DetectCapabilityResponse | null> => {
    try {
      const response = await $fetch<{ success: boolean; data: DetectCapabilityResponse }>(
        `${API_ENDPOINTS.ADMIN_PROVIDERS}/${providerId}/detect-capability`,
        {
          method: 'POST',
          baseURL: config.public.apiBaseUrl,
          body: { model, capability }
        }
      )

      // 缓存结果
      if (!capabilityResults.value.has(providerId)) {
        capabilityResults.value.set(providerId, new Map())
      }
      const providerResults = capabilityResults.value.get(providerId)!
      providerResults.set(`${model}_${capability}`, response.data.supported)

      return response.data
    } catch (error: any) {
      console.error('Failed to detect capability:', error)
      showNotification(`检测失败: ${error.data?.message || error.message}`, 'error')
      return null
    }
  }

  // 获取缓存的能力检测结果
  const getCapabilityResult = (providerId: string, model: string, capability: CapabilityType): boolean | null => {
    const providerResults = capabilityResults.value.get(providerId)
    if (!providerResults) return null
    return providerResults.get(`${model}_${capability}`) ?? null
  }

  // 执行测试
  const runTest = async () => {
    if (!testingProvider.value || !selectedTestModel.value) return

    testLoading.value = true
    testResult.value = null

    try {
      if (testingType.value === 'connection') {
        // 测试连通性
        const response = await $fetch<{ success: boolean; data: TestConnectionResponse }>(
          `${API_ENDPOINTS.ADMIN_PROVIDERS}/${testingProvider.value.id}/test-connection`,
          {
            method: 'POST',
            baseURL: config.public.apiBaseUrl,
            body: { model: selectedTestModel.value }
          }
        )
        testResult.value = response.data
      } else {
        // 测试图片识别
        const response = await $fetch<{ success: boolean; data: TestVisionResponse }>(
          `${API_ENDPOINTS.ADMIN_PROVIDERS}/${testingProvider.value.id}/test-vision`,
          {
            method: 'POST',
            baseURL: config.public.apiBaseUrl,
            body: { model: selectedTestModel.value }
          }
        )
        testResult.value = response.data
      }
    } catch (error: any) {
      testResult.value = {
        success: false,
        latency: 0,
        message: error.data?.message || error.message || '测试请求失败',
        error: error.data?.message || error.message || 'Unknown error'
      }
    } finally {
      testLoading.value = false
    }
  }

  // 初始化时加载数据
  loadProviders()

  return {
    // 响应式数据
    providers,
    keyPoolStatuses,
    expandedProviders,
    showEditModal,
    editingProvider,
    editLoading,

    // 确认对话框状态
    showConfirmDialog,
    confirmDialogConfig,
    confirmLoading,

    // 测试功能状态
    showTestModal,
    testingProvider,
    selectedTestModel,
    testingType,
    testLoading,
    testResult,

    // 聊天测试状态
    chatTab,
    chatInput,
    chatImage,
    chatLoading,
    chatMessages,

    // 方法
    loadProviders,
    loadKeyPoolStatuses,
    editProvider,
    updateProvider,
    cancelEdit,
    deleteProvider,
    toggleProviderExpansion,
    handleConfirmDialogCancel,
    handleConfirmDialogConfirm,
    openTestModal,
    closeTestModal,
    runTest,
    sendChat,
    handleImageUpload,
    clearImage,

    // 能力检测
    capabilityResults,
    detectCapability,
    getCapabilityResult
  }
}