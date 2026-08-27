<script setup lang="ts">
import { inject } from 'vue';

// 从主组件注入状态和方法
const tableState: any = inject('tableState');
const tableMethods: any = inject('tableMethods');

const { showAddFieldDrawer, selectedColumns, availableColumns } = tableState;

const { confirmAddFields } = tableMethods;

defineOptions({
  name: 'AddFieldDrawer'
});
</script>

<template>
  <NDrawer v-model:show="showAddFieldDrawer" :width="400" placement="right">
    <NDrawerContent title="添加搜索字段">
      <div class="add-field-content">
        <NAlert type="info" :show-icon="true" class="mb-4">请选择要添加为搜索条件的字段</NAlert>

        <div class="field-select-list">
          <NScrollbar style="max-height: calc(100vh - 250px)">
            <NCheckboxGroup v-model:value="selectedColumns">
              <div v-for="column in availableColumns" :key="column.key" class="field-select-item">
                <NCheckbox :value="column.key">
                  <span class="field-select-label">{{ column.title }}</span>
                  <span class="field-select-key">({{ column.key }})</span>
                </NCheckbox>
              </div>
            </NCheckboxGroup>
          </NScrollbar>
        </div>
      </div>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showAddFieldDrawer = false">取消</NButton>
          <NButton type="primary" :disabled="selectedColumns.length === 0" @click="confirmAddFields">确定</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
.add-field-content {
  padding: 16px;
}

.field-select-list {
  margin-top: 16px;
}

.field-select-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--n-border-color);
}

.field-select-item:last-child {
  border-bottom: none;
}

.field-select-label {
  font-size: 14px;
  color: var(--n-text-color);
}

.field-select-key {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin-left: 8px;
}

.mb-4 {
  margin-bottom: 16px;
}
</style>
