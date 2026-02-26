<template>
  <div class="bg-white/80 backdrop-blur-sm shadow-xl overflow-hidden rounded-2xl border border-orange-100">
    <div class="px-6 py-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h3 class="text-xl font-bold text-gray-900">模型供应商管理</h3>
          <p class="text-sm text-gray-600 mt-1">管理接入的第三方模型供应商，如魔搭、智谱 AI 等</p>
        </div>
        <NuxtLink to="/admin/add-provider" 
                 class="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:from-emerald-600 hover:to-teal-700 transform hover:scale-105 transition duration-200 shadow-lg flex items-center space-x-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          <span>添加供应商</span>
        </NuxtLink>
      </div>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="provider in providers" :key="provider.id" 
             class="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-sm border border-orange-200 rounded-2xl p-6 hover:shadow-lg transition duration-300 group">
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
              </div>
              <div>
                <h4 class="text-lg font-bold text-gray-900">{{ provider.name }}</h4>
                <p class="text-sm text-gray-500">
                  <span v-if="provider.type === 'openai'">OpenAI 兼容模型</span>
                  <span v-else-if="provider.type === 'anthropic'">Anthropic 兼容模型</span>
                  <span v-else-if="provider.type === 'gemini'">Google Gemini 模型</span>
                </p>
              </div>
            </div>
            <span :class="provider.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'"
                  class="px-3 py-1 text-xs font-medium rounded-full">
              {{ provider.status === 'active' ? '• 活跃' : '• 停用' }}
            </span>
          </div>
          
          <div class="space-y-3 mb-6">
            <div class="flex items-center space-x-2 text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
              </svg>
              <span class="text-gray-600 truncate">{{ provider.baseUrl }}</span>
            </div>
            
            <div class="space-y-2">
              <div class="flex items-center space-x-2 text-sm">
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                <span class="text-gray-600">
                  支持模型 ({{ provider.models?.length || 0 }}):
                </span>
              </div>
              
              <!-- 模型列表显示 -->
              <div class="ml-6">
                <div v-if="!provider.models?.length" 
                     class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-md italic">
                  未配置模型
                </div>
                <div v-else class="space-y-2">
                  <!-- 默认显示前3个模型 -->
                  <div class="flex flex-wrap gap-1">
                    <span v-for="model in (expandedProviders.has(provider.id) ? provider.models : provider.models.slice(0, 3))" 
                          :key="model"
                          class="inline-block px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-md font-mono hover:bg-blue-100 transition-colors">
                      {{ model }}
                    </span>
                  </div>
                  <!-- 展开/收起按钮 -->
                  <button v-if="provider.models.length > 3"
                          @click="toggleProviderExpansion(provider.id)"
                          class="text-xs text-orange-500 hover:text-orange-600 flex items-center space-x-1 transition-colors">
                    <span>{{ expandedProviders.has(provider.id) ? '收起' : `查看全部 ${provider.models.length} 个模型` }}</span>
                    <svg class="w-3 h-3 transition-transform" 
                         :class="expandedProviders.has(provider.id) ? 'rotate-180' : ''"
                         fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="flex items-center space-x-2 text-sm">
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
              </svg>
              <span class="text-gray-600">密钥池: {{ keyPoolStatuses.get(provider.id) || '加载中...' }}</span>
            </div>
            
            <!-- 备注描述显示 -->
            <div v-if="provider.description" class="flex items-start space-x-2 text-sm">
              <svg class="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1.586l-4 4z"></path>
              </svg>
              <span class="text-gray-600 break-words">{{ provider.description }}</span>
            </div>
          </div>
          
          <div class="flex space-x-2">
            <button @click="openTestModal(provider, 'connection')"
                    class="px-4 py-2 text-blue-600 hover:text-blue-700 rounded-xl border border-blue-200 hover:border-blue-300 transition duration-200 text-sm inline-flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              测试
            </button>
            <NuxtLink :to="`/admin/key-pool/${provider.id}`"
                    class="px-4 py-2 text-emerald-600 hover:text-emerald-700 rounded-xl border border-emerald-200 hover:border-emerald-300 transition duration-200 text-sm inline-flex items-center">
              <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path>
              </svg>
              密钥池
            </NuxtLink>
            <button @click="editProvider(provider)"
                    class="px-4 py-2 text-orange-600 hover:text-orange-700 rounded-xl border border-orange-200 hover:border-orange-300 transition duration-200 text-sm">
              编辑
            </button>
            <button @click="deleteProvider(provider.id)"
                    class="px-4 py-2 text-red-600 hover:text-red-700 rounded-xl border border-red-200 hover:border-red-300 transition duration-200 text-sm">
              删除
            </button>
          </div>
        </div>
      </div>
      
      <div v-if="providers.length === 0" class="text-center py-8">
        <p class="text-gray-500">暂无模型供应商</p>
      </div>
    </div>
  </div>

  <!-- 编辑供应商模态框 -->
  <div v-if="showEditModal && editingProvider" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
      <div class="flex justify-between items-center px-6 py-4 border-b">
        <h3 class="text-xl font-bold text-gray-900">编辑供应商</h3>
        <button @click="cancelEdit" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      
      <div class="px-6 py-4 overflow-y-auto flex-1">
        <ProviderForm 
          :provider="editingProvider"
          :loading="editLoading"
          @submit="updateProvider"
          @cancel="cancelEdit" />
      </div>
    </div>
  </div>

  <!-- 确认删除对话框 -->
  <ConfirmDialog
    :visible="showConfirmDialog"
    :title="confirmDialogConfig?.title"
    :message="confirmDialogConfig?.message"
    :description="confirmDialogConfig?.description"
    :type="confirmDialogConfig?.type || 'danger'"
    :loading="confirmLoading"
    confirm-text="删除"
    cancel-text="取消"
    @confirm="handleConfirmDialogConfirm"
    @cancel="handleConfirmDialogCancel"
  />

  <!-- 测试模态框 - 聊天风格 -->
  <div v-if="showTestModal && testingProvider" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[600px] flex flex-col">
      <!-- 头部 -->
      <div class="flex justify-between items-center px-6 py-4 border-b">
        <h3 class="text-xl font-bold text-gray-900">聊天测试</h3>
        <button @click="closeTestModal" class="text-gray-400 hover:text-gray-600">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Tab 切换 -->
      <div class="flex border-b">
        <button
          @click="chatTab = 'text'"
          :class="chatTab === 'text' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          class="flex-1 py-3 text-center font-medium border-b-2 transition-colors"
        >纯文本</button>
        <button
          @click="chatTab = 'image'"
          :class="chatTab === 'image' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'"
          class="flex-1 py-3 text-center font-medium border-b-2 transition-colors"
        >带图</button>
      </div>

      <!-- 供应商信息和模型选择 -->
      <div class="px-6 py-3 bg-gray-50 border-b space-y-2">
        <p class="text-sm text-gray-600">供应商: <span class="font-medium text-gray-900">{{ testingProvider.name }}</span></p>
        <select v-model="selectedTestModel"
                class="block w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
          <option v-for="model in testingProvider.models" :key="model" :value="model">{{ model }}</option>
        </select>
      </div>

      <!-- 聊天消息区域 -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        <div v-if="chatMessages.length === 0" class="text-center text-gray-400 py-8">
          <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
          <p>发送消息开始测试</p>
        </div>

        <div v-for="(msg, idx) in chatMessages" :key="idx" class="space-y-1">
          <!-- 用户消息 -->
          <div v-if="msg.role === 'user'" class="flex justify-end">
            <div class="bg-orange-500 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-[80%]">
              <p class="text-sm">{{ msg.content }}</p>
              <img v-if="msg.image" :src="'data:image/png;base64,' + msg.image" class="mt-2 rounded-lg max-h-32" />
            </div>
          </div>
          <!-- AI 消息 -->
          <div v-else class="flex justify-start">
            <div class="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-2 max-w-[80%] shadow-sm">
              <p class="text-sm text-gray-800 whitespace-pre-wrap">{{ msg.content }}</p>
              <p v-if="msg.latency" class="text-xs text-gray-400 mt-1">{{ msg.latency }}ms</p>
            </div>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="chatLoading" class="flex justify-start">
          <div class="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
            <div class="flex space-x-1">
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
              <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="p-4 border-t bg-white rounded-b-2xl space-y-3">
        <!-- 图片上传预览 -->
        <div v-if="chatTab === 'image'" class="relative inline-block">
          <div v-if="chatImage" class="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
            <img :src="'data:image/png;base64,' + chatImage" class="h-16 w-16 object-cover rounded" />
            <button @click="clearImage" class="text-gray-500 hover:text-red-500 p-1">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          <label v-else class="flex items-center justify-center w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
            <input type="file" accept="image/*" class="hidden" @change="(e) => { const file = (e.target as HTMLInputElement).files?.[0]; file && handleImageUpload(file) }" />
          </label>
        </div>

        <!-- 文本输入 -->
        <div class="flex space-x-2">
          <input
            v-model="chatInput"
            @keyup.enter="sendChat"
            type="text"
            :placeholder="chatTab === 'image' ? '描述这张图片...' : '输入消息...'"
            class="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <button
            @click="sendChat"
            :disabled="chatLoading || !chatInput.trim() || (chatTab === 'image' && !chatImage)"
            class="px-6 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useProviders } from '../../composables/useProviders'
import ConfirmDialog from '../ui/ConfirmDialog.vue'

// 使用 composable 来管理供应商相关逻辑
const {
  providers,
  keyPoolStatuses,
  expandedProviders,
  showEditModal,
  editingProvider,
  editLoading,
  showConfirmDialog,
  confirmDialogConfig,
  confirmLoading,
  showTestModal,
  testingProvider,
  selectedTestModel,
  testingType,
  testLoading,
  testResult,
  // 聊天测试
  chatTab,
  chatInput,
  chatImage,
  chatLoading,
  chatMessages,
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
  clearImage
} = useProviders()
</script>