<script setup lang="ts">
import { inject, ref, watch } from 'vue';

// 从主组件注入状态和方法
const tableState: any = inject('tableState');
const tableMethods: any = inject('tableMethods');

const { showSearchFieldDrawer, currentSearchField, newOptionKey, newOptionValue } = tableState;

const { saveSearchField, addOption, removeOption } = tableMethods;

// 值类型选择选项
const valueTypeOptions = ref([
  { label: '等于', value: 'EqualTo' },
  { label: '不等于', value: 'NotEqualTo' },
  { label: '为空', value: 'IsNull' },
  { label: '不为空', value: 'IsNotNull' },
  { label: '在一个集合中', value: 'In' },
  { label: '不在一个集合中', value: 'NotIn' },
  { label: '包含', value: 'Contains' },
  { label: '不包含', value: 'NotContains' },
  { label: '以什么开头', value: 'StartsWith' },
  { label: '不以什么开头', value: 'NotStartsWith' },
  { label: '以什么结尾', value: 'EndsWith' },
  { label: '不以什么结尾', value: 'NotEndsWith' },
  { label: '范围内', value: 'Between' },
  { label: '不在范围内', value: 'NotBetween' },
  { label: '大于', value: 'GreaterThan' },
  { label: '大于等于', value: 'GreaterThanOrEqualTo' },
  { label: '小于', value: 'LessThan' },
  { label: '小于等于', value: 'LessThanOrEqualTo' }
]);

// 添加调试信息
watch(
  currentSearchField,
  newVal => {
    // console.log('🔍 SearchFieldEditDrawer currentSearchField 变化:', newVal);
    // console.log('🔍 operatorName 值:', newVal?.operatorName);
  },
  { deep: true, immediate: true }
);

// 监听控件类型变化，当选择日期范围时清空值类型选择
watch(
  () => currentSearchField.value.type,
  newType => {
    if (newType === 'date-range') {
      currentSearchField.value.operatorName = '';
      //console.log('🔍 控件类型变为日期范围选择，已清空值类型选择');
    }
  }
);

watch(showSearchFieldDrawer, newVal => {
  if (newVal) {
    // console.log('🔍 搜索字段编辑抽屉打开');
    // console.log('🔍 当前 currentSearchField:', currentSearchField.value);
    // console.log('🔍 当前 operatorName:', currentSearchField.value?.operatorName);
  }
});

defineOptions({
  name: 'SearchFieldEditDrawer'
});
</script>

<template>
  <NDrawer v-model:show="showSearchFieldDrawer" :width="400" placement="right">
    <NDrawerContent title="编辑搜索字段">
      <NForm ref="searchFieldForm" :model="currentSearchField" label-placement="left" label-width="100">
        <NFormItem label="显示名称" path="label">
          <NInput v-model:value="currentSearchField.label" placeholder="请输入显示名称"></NInput>
        </NFormItem>

        <NFormItem label="字段名" path="key">
          <NInput v-model:value="currentSearchField.key" disabled></NInput>
        </NFormItem>

        <NFormItem label="控件类型" path="type">
          <NSelect
            v-model:value="currentSearchField.type"
            :options="[
              { label: '输入框', value: 'input' },
              { label: '下拉选择', value: 'select' },
              { label: '日期选择', value: 'date' },
              { label: '日期范围选择', value: 'date-range' },
              { label: '数字范围', value: 'number-range' }
            ]"
          ></NSelect>
        </NFormItem>

        <NFormItem label="占位提示" path="placeholder">
          <NInput v-model:value="currentSearchField.placeholder" placeholder="请输入占位提示"></NInput>
        </NFormItem>

        <NFormItem label="默认值" path="defaultValue">
          <NInput v-model:value="currentSearchField.defaultValue" placeholder="请输入默认值"></NInput>
        </NFormItem>

        <NFormItem label="值类型选择" path="operatorName">
          <NSelect
            v-model:value="currentSearchField.operatorName"
            :options="valueTypeOptions"
            placeholder="请选择值类型"
            clearable
            :disabled="currentSearchField.type === 'date-range'"
          ></NSelect>
        </NFormItem>

        <!-- 当类型为 select 时显示选项配置 -->
        <template v-if="currentSearchField.type === 'select'">
          <NDivider>选项配置</NDivider>

          <!-- 添加新选项的输入框 -->
          <NSpace vertical>
            <NInputGroup>
              <NInput v-model:value="newOptionKey" placeholder="选项名称"></NInput>
              <NInput v-model:value="newOptionValue" placeholder="选项值"></NInput>
              <NButton type="primary" :disabled="!newOptionKey || !newOptionValue" @click="addOption">添加</NButton>
            </NInputGroup>
          </NSpace>

          <!-- 已添加选项列表 -->
          <NSpace vertical style="margin-top: 12px">
            <div
              v-for="(option, index) in currentSearchField.options"
              :key="index"
              style="display: flex; justify-content: space-between; align-items: center"
            >
              <span>{{ option.label }} - {{ option.value }}</span>
              <NButton text type="error" @click="removeOption(index)">
                <template #icon>
                  <NIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                        fill="currentColor"
                      />
                    </svg>
                  </NIcon>
                </template>
              </NButton>
            </div>
          </NSpace>
        </template>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showSearchFieldDrawer = false">取消</NButton>
          <NButton type="primary" @click="saveSearchField">保存</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.n-input-group {
  display: flex;
  gap: 8px;
}

.n-input-group .n-input {
  flex: 1;
}

.n-divider {
  margin: 16px 0;
}
</style>
