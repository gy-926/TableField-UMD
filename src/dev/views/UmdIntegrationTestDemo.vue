<template>
  <div class="p-8 bg-gray-100 min-h-screen">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold mb-8 text-gray-800">Kivii 动态表格 UMD 预览</h1>
      
      <div class="mb-8 p-4 bg-white rounded-lg shadow">
        <h2 class="text-xl font-semibold mb-4">External Control Panel</h2>
        <div class="flex items-center gap-4">
          <button 
            @click="setTheme('light')" 
            class="px-4 py-2 rounded transition-colors"
            :class="currentTheme === 'light' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'"
          >
            Light Mode
          </button>
          <button 
            @click="setTheme('dark')" 
            class="px-4 py-2 rounded transition-colors"
            :class="currentTheme === 'dark' ? 'bg-slate-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'"
          >
            Dark Mode
          </button>
          <span class="ml-auto text-sm text-gray-500">
            Current State: <span class="font-mono font-bold">{{ currentTheme }}</span>
          </span>
        </div>
      </div>

      <TableIndex :ui-config="tableConfig" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// 开发环境也走正式 UMD 导出链路，确保包装器行为与交付产物一致
import { TableIndex } from '@/build'

const currentTheme = ref<'light' | 'dark'>('light')

const setTheme = (theme: 'light' | 'dark') => {
  currentTheme.value = theme
}

const mockData = [
  { Kvid: 'D57A-C48B-A306-586775CEEDFC', OwnerName: '事业发展科', Amount: 1472, AmountPayment: 0, AmountTax: 83.32, AmountUntaxed: 1388.68, Category: 'Debit', CreateTime: '2025-04-23T17:13:02+08:00', CreatorName: '超级管理员', Currency: 'CNY', OperateTime: '2025-05-04T00:00:00+08:00', PayerName: '扬州中金大网络科技有限公司', PayerTaxNumber: '91320803MA660A1099', SerialNumber: '2532200000434866' },
  { Kvid: 'C7B3-DF9-1B95-46DF-150587EF2961', OwnerName: 'Kivii测试平台', Amount: 5600, AmountPayment: 2000, AmountTax: 316.98, AmountUntaxed: 5283.02, Category: 'Credit', CreateTime: '2025-04-24T09:30:00+08:00', CreatorName: '测试用户', Currency: 'CNY', OperateTime: '2025-05-05T10:00:00+08:00', PayerName: '江苏省南京市示例公司', PayerTaxNumber: '91320100TEST000001', SerialNumber: '2532200000434867' },
]

const tableConfig = {
  Type: 'Kivii.Finances.Entities.Invoice',
  InternalCode: '发票管理(tableField)',
  IsDefault: true,
  InitQuery: '/Restful/Kivii.Finances.Entities.Invoice/Query.json',
  GetUrl: '/Restful/Kivii.Basic.Entities.UiConfig/Get.json',
  SetUrl: '/Restful/Kivii.Basic.Entities.UiConfig/Set.json',
  CreateVueUrl: '/codet/invoiceContent.vue',
  mock: { enabled: true, data: mockData, settings: [] },
}
</script>
