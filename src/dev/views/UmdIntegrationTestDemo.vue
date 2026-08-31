<template>
  <TableIndex :ui-config="tableConfig" />
</template>

<script setup lang="ts">
// 开发环境也走正式 UMD 导出链路，确保包装器行为与交付产物一致
import { TableIndex } from '@/build'

const mockData = [
  { Kvid: 'D57A-C48B-A306-586775CEEDFC', OwnerName: '事业发展科', Amount: 1472, AmountPayment: 0, AmountTax: 83.32, AmountUntaxed: 1388.68, Category: 'Debit', CreateTime: '2025-04-23T17:13:02+08:00', CreatorName: '超级管理员', Currency: 'CNY', OperateTime: '2025-05-04T00:00:00+08:00', PayerName: '扬州中金大网络科技有限公司', PayerTaxNumber: '91320803MA660A1099', SerialNumber: '2532200000434866' },
  { Kvid: 'C7B3-DF9-1B95-46DF-150587EF2961', OwnerName: 'Kivii测试平台', Amount: 5600, AmountPayment: 2000, AmountTax: 316.98, AmountUntaxed: 5283.02, Category: 'Credit', CreateTime: '2025-04-24T09:30:00+08:00', CreatorName: '测试用户', Currency: 'CNY', OperateTime: '2025-05-05T10:00:00+08:00', PayerName: '江苏省南京市示例公司', PayerTaxNumber: '91320100TEST000001', SerialNumber: '2532200000434867' },
  ...Array.from({ length: 19 }, (_, index) => {
    const sequence = index + 3
    const amount = 1000 + index * 375
    const amountPayment = index % 3 === 0 ? amount : Math.round(amount * 0.4)
    const amountTax = Number((amount * 0.06).toFixed(2))

    return {
      Kvid: `MOCK-2025-INV-${String(sequence).padStart(4, '0')}`,
      OwnerName: index % 2 === 0 ? '财务管理部' : '业务运营部',
      Amount: amount,
      AmountPayment: amountPayment,
      AmountTax: amountTax,
      AmountUntaxed: Number((amount - amountTax).toFixed(2)),
      Category: index % 2 === 0 ? 'Debit' : 'Credit',
      CreateTime: `2025-05-${String(index + 1).padStart(2, '0')}T09:30:00+08:00`,
      CreatorName: index % 2 === 0 ? '管理员' : '演示用户',
      Currency: 'CNY',
      OperateTime: `2025-05-${String(index + 2).padStart(2, '0')}T10:00:00+08:00`,
      PayerName: `模拟付款单位 ${sequence}`,
      PayerTaxNumber: `91320100TEST${String(sequence).padStart(6, '0')}`,
      SerialNumber: `2532200000${String(434865 + sequence).padStart(6, '0')}`,
    }
  }),
]

const mockFields = [
  { Name: 'OwnerName', DisplayName: '部门' },
  { Name: 'Amount', DisplayName: '金额' },
  { Name: 'AmountPayment', DisplayName: '支付金额' },
  { Name: 'AmountTax', DisplayName: '税额' },
  { Name: 'AmountUntaxed', DisplayName: '未加税金额' },
  { Name: 'Category', DisplayName: '类别' },
  { Name: 'CreateTime', DisplayName: '创建时间' },
  { Name: 'CreatorName', DisplayName: 'CreatorName' },
  { Name: 'Currency', DisplayName: '货币' },
  { Name: 'OperateTime', DisplayName: 'OperateTime' },
  { Name: 'PayerName', DisplayName: 'PayerName' },
  { Name: 'PayerTaxNumber', DisplayName: 'PayerTaxNumber' },
  { Name: 'SerialNumber', DisplayName: 'SerialNumber' },
]

const visibleColumns = [
  'OwnerName', 'Amount', 'AmountPayment', 'AmountTax', 'AmountUntaxed',
  'Category', 'CreateTime', 'CreatorName', 'Currency', 'OperateTime',
  'PayerName', 'SerialNumber',
]

const searchFields = [
  { key: 'OwnerName', label: '部门', type: 'input', visible: true, defaultValue: '', placeholder: '请输入部门', options: [], order: 1 },
  { key: 'AmountPayment', label: '支付金额', type: 'input', visible: true, defaultValue: '', placeholder: '请输入支付金额', options: [], order: 2 },
  { key: 'AmountTax', label: '税额', type: 'input', visible: true, defaultValue: '', placeholder: '请输入税额', options: [], order: 3 },
  { key: 'AmountUntaxed', label: '未加税金额', type: 'input', visible: true, defaultValue: '', placeholder: '请输入未加税金额', options: [], order: 4 },
  { key: 'Category', label: '类别', type: 'input', visible: true, defaultValue: '', placeholder: '请输入类别', options: [], order: 5 },
  { key: 'Currency', label: '货币', type: 'input', visible: true, defaultValue: '', placeholder: '请输入货币', options: [], order: 6 },
  { key: 'Amount', label: '金额', type: 'input', visible: true, defaultValue: '', placeholder: '请输入金额', options: [], order: 7 },
  { key: 'CreateTime', label: '创建时间', type: 'date', visible: true, defaultValue: '', placeholder: '请选择创建时间', options: [], order: 8 },
]

const mockSettings = [
  {
    id: 'default',
    name: '表格示例',
    config: {
      columnSettings: {
        visibleColumns,
        columnOrder: [...visibleColumns, 'PayerTaxNumber'],
      },
      searchSettings: {
        searchFields,
        searchFieldConfigs: searchFields,
      },
    },
  },
]

const tableConfig = {
  Type: 'Kivii.Finances.Entities.Invoice',
  InternalCode: '发票管理(tableField)',
  IsDefault: true,
  InitQuery: '/Restful/Kivii.Finances.Entities.Invoice/Query.json',
  GetUrl: '/Restful/Kivii.Basic.Entities.UiConfig/Get.json',
  SetUrl: '/Restful/Kivii.Basic.Entities.UiConfig/Set.json',
  CreateVueUrl: '/codet/invoiceContent.vue',
  mock: { enabled: true, data: mockData, fields: mockFields, settings: mockSettings },
}
</script>
