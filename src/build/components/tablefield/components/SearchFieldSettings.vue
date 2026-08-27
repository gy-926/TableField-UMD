<script setup lang="ts">
import { inject, ref, watch } from 'vue';

// 从主组件注入状态和方法
const tableState: any = inject('tableState');
const tableMethods: any = inject('tableMethods');

const { searchFields } = tableState;

// 防抖函数
const debounce = (func: Function, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// 本地字段可见性状态管理
const localFieldVisibility = ref(new Map());

// 初始化本地状态
const initializeLocalState = () => {
  const visibilityMap = new Map();
  searchFields.value.forEach((field: any) => {
    visibilityMap.set(field.key, field.visible);
  });
  localFieldVisibility.value = visibilityMap;
};

// 防抖的字段可见性更新函数
const debouncedFieldUpdate = debounce((fieldKey: string, visible: boolean) => {
  const field = searchFields.value.find((f: any) => f.key === fieldKey);
  if (field) {
    updateFieldVisibility(field, visible);
  }
}, 300);

// 本地字段可见性切换处理
const handleLocalFieldVisibilityChange = (field: any, visible: boolean) => {
  // 立即更新本地状态
  localFieldVisibility.value.set(field.key, visible);

  // 防抖更新父组件状态
  debouncedFieldUpdate(field.key, visible);
};

// 监听searchFields变化，同步到本地状态
watch(searchFields, () => {
  initializeLocalState();
}, { immediate: true, deep: true });

defineOptions({
  name: 'SearchFieldSettings'
});

const {
  addSearchField,
  editSearchField,
  removeSearchField,
  updateFieldVisibility,
  handleSearchFieldDragStart,
  handleSearchFieldDragOver,
  handleSearchFieldDrop
} = tableMethods;
</script>

<template>
  <div>
    <div class="search-config-header">
      <span>搜索字段配置</span>
      <NButton size="small" type="primary" @click="addSearchField">添加字段</NButton>
    </div>

    <div class="search-fields-list">
      <NScrollbar style="max-height: calc(100vh - 200px)">
        <div class="search-fields-container">
          <div
            v-for="field in searchFields"
            :key="field.key"
            class="search-field-item"
            draggable="true"
            @dragstart="handleSearchFieldDragStart($event, field)"
            @dragover="handleSearchFieldDragOver"
            @drop="handleSearchFieldDrop($event, field)"
          >
            <div class="field-item-left">
              <NIcon class="field-drag-handle">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M8 18h8v-2H8v2zm0-4h8v-2H8v2zm0-4h8V8H8v2zm0-4h8V4H8v2z" fill="currentColor" />
                </svg>
              </NIcon>
              <NSwitch
                :value="localFieldVisibility.get(field.key) ?? field.visible"
                size="small"
                @update:value="val => handleLocalFieldVisibilityChange(field, val)"
              ></NSwitch>
            </div>

            <div class="field-item-content">
              <span class="field-label">{{ field.label }}</span>
              <span class="field-key">({{ field.key }})</span>
            </div>

            <div class="field-item-right">
              <NButton text @click="editSearchField(field)">
                <template #icon>
                  <NIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                        fill="currentColor"
                      />
                    </svg>
                  </NIcon>
                </template>
              </NButton>
              <NButton text @click="removeSearchField(field)">
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
          </div>
        </div>
      </NScrollbar>
    </div>
  </div>
</template>

<style scoped>
.search-config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px 12px;
  border-bottom: 1px solid var(--n-border-color);
}

.search-fields-container {
  padding: 8px 0;
}

.search-field-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid var(--n-border-color);
  cursor: move;
  contain: layout style paint;
  will-change: transform;
}

.field-item-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.field-drag-handle {
  cursor: move;
  color: var(--n-text-color-3);
}

.field-item-content {
  flex: 1;
  margin: 0 12px;
}

.field-label {
  font-size: 12px;
  color: var(--n-text-color);
}

.field-key {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin-left: 8px;
}

.field-item-right {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.search-field-item:hover .field-item-right {
  opacity: 1;
}

/* 自定义滚动条样式 - 仅适用于当前组件 */
.search-fields-list :deep(.n-scrollbar-rail) {
  right: 2px !important;
  width: 6px !important;
  border-radius: 3px !important;
}

.search-fields-list :deep(.n-scrollbar-rail .n-scrollbar-rail__scrollbar) {
  width: 6px !important;
  border-radius: 3px !important;
  background: var(--n-scrollbar-color, #d1d5db) !important;
  transition: all 0.2s ease !important;
  opacity: 0.6 !important;
}

.search-fields-list :deep(.n-scrollbar-rail .n-scrollbar-rail__scrollbar:hover) {
  background: var(--n-scrollbar-color-hover, #9ca3af) !important;
  opacity: 1 !important;
}

/* 隐藏默认的滚动条轨道背景 */
.search-fields-list :deep(.n-scrollbar-track) {
  background: transparent !important;
}

/* 滚动条容器悬停时显示 */
.search-fields-list:hover :deep(.n-scrollbar-rail .n-scrollbar-rail__scrollbar) {
  opacity: 0.8 !important;
}
</style>
