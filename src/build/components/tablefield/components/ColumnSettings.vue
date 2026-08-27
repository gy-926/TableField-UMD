<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue';

// 从主组件注入状态和方法
const tableState: any = inject('tableState');
const tableMethods: any = inject('tableMethods');

const { rawColumns, visibleColumns, columnSearchText } = tableState;

// 本地优化的filteredColumns计算属性，使用防抖
const localFilteredColumns = ref([...rawColumns.value]);

// 虚拟滚动相关状态
const scrollContainer = ref<HTMLElement>();
const itemHeight = 48; // 每个列表项的高度
const containerHeight = ref(400); // 容器高度
const scrollTop = ref(0);
const visibleItemCount = ref(10); // 可见项数量
const bufferSize = 3; // 缓冲区大小

// 计算虚拟滚动的可见项
const virtualItems = computed(() => {
  const startIndex = Math.max(0, Math.floor(scrollTop.value / itemHeight) - bufferSize);
  const endIndex = Math.min(
    localFilteredColumns.value.length - 1,
    startIndex + visibleItemCount.value + bufferSize * 2
  );

  return {
    startIndex,
    endIndex,
    items: localFilteredColumns.value.slice(startIndex, endIndex + 1),
    offsetY: startIndex * itemHeight,
    totalHeight: localFilteredColumns.value.length * itemHeight
  };
});

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

// 防抖的过滤函数
const debouncedFilter = debounce(() => {
  const searchText = columnSearchText.value.toLowerCase().trim();
  if (!searchText) {
    localFilteredColumns.value = [...rawColumns.value];
    return;
  }

  localFilteredColumns.value = rawColumns.value.filter((column: any) => {
    const title = column.title.toLowerCase();
    const key = column.key.toLowerCase();
    return title.includes(searchText) || key.includes(searchText);
  });
}, 200);

// 滚动事件处理
const handleScroll = debounce((e: Event) => {
  const target = e.target as HTMLElement;
  scrollTop.value = target.scrollTop;
}, 16); // 60fps

// 更新容器高度和可见项数量
const updateContainerSize = () => {
  if (scrollContainer.value) {
    containerHeight.value = scrollContainer.value.clientHeight;
    visibleItemCount.value = Math.ceil(containerHeight.value / itemHeight);
  }
};

// 监听搜索文本变化
watch(
  columnSearchText,
  () => {
    debouncedFilter();
  },
  { immediate: true }
);

// 监听原始列变化
watch(
  rawColumns,
  () => {
    debouncedFilter();
  },
  { immediate: true, deep: true }
);

// 组件挂载时初始化
onMounted(() => {
  updateContainerSize();
  window.addEventListener('resize', updateContainerSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerSize);
});

const filteredColumns = computed(() => localFilteredColumns.value);

// 本地Switch状态管理，避免频繁调用父组件方法
const localVisibleColumns = ref(new Set([...visibleColumns.value]));

const {
  handleColumnVisibleChange,
  clearColumnSearch,
  handleEditColumn,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleSetSettings
} = tableMethods;

// 防抖的列可见性更新函数
const debouncedVisibilityUpdate = debounce((changes: Array<{ key: string; visible: boolean }>) => {
  changes.forEach(change => {
    handleColumnVisibleChange(change.visible, { key: change.key });
  });
}, 300);

// 批量更新队列
const pendingVisibilityChanges = ref<Array<{ key: string; visible: boolean }>>([]);

// 本地Switch切换处理
const handleLocalSwitchChange = (checked: boolean, column: any) => {
  // 立即更新本地状态，提供即时反馈
  if (checked) {
    localVisibleColumns.value.add(column.key);
  } else {
    localVisibleColumns.value.delete(column.key);
  }

  // 将更改添加到队列
  const existingIndex = pendingVisibilityChanges.value.findIndex(c => c.key === column.key);
  if (existingIndex >= 0) {
    pendingVisibilityChanges.value[existingIndex].visible = checked;
  } else {
    pendingVisibilityChanges.value.push({ key: column.key, visible: checked });
  }

  // 防抖批量更新
  debouncedVisibilityUpdate([...pendingVisibilityChanges.value]);
  pendingVisibilityChanges.value = [];
};

// 监听父组件的visibleColumns变化，同步到本地状态
watch(
  visibleColumns,
  newValue => {
    localVisibleColumns.value = new Set([...newValue]);
  },
  { immediate: true }
);

// 添加拖拽完成后的保存处理
const handleDragEnd = () => {
  // 触发配置保存
  if (handleSetSettings) {
    handleSetSettings();
  }
};

defineOptions({
  name: 'ColumnSettings'
});
</script>

<template>
  <div>
    <div class="columns-header">
      <span>显示字段</span>
      <span>显示 {{ visibleColumns.length }} 列</span>
    </div>
    <div class="columns-search">
      <NInput v-model:value="columnSearchText" placeholder="搜索列" clearable @clear="clearColumnSearch">
        <template #prefix>
          <NIcon>
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24">
              <path
                d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5A4.5 4.5 0 0 1 9.5 14z"
                fill="currentColor"
              />
            </svg>
          </NIcon>
        </template>
      </NInput>
    </div>
    <div class="columns-list">
      <!-- 对于少量数据使用常规渲染 -->
      <NScrollbar v-if="filteredColumns.length <= 20" style="max-height: calc(100vh - 200px)">
        <div class="columns-container">
          <div
            v-for="(column, index) in filteredColumns"
            :key="column.key"
            class="column-item"
            draggable="true"
            @dragstart="handleDragStart($event, index)"
            @dragover="handleDragOver"
            @drop="handleDrop($event, index)"
            @dragend="handleDragEnd"
          >
            <div class="column-item-left">
              <NIcon class="column-drag-handle">
                <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24">
                  <path d="M8 18h8v-2H8v2zm0-4h8v-2H8v2zm0-4h8V8H8v2zm0-4h8V4H8v2z" fill="currentColor" />
                </svg>
              </NIcon>
              <NSwitch
                :value="localVisibleColumns.has(column.key)"
                size="small"
                @update:value="checked => handleLocalSwitchChange(checked, column)"
              ></NSwitch>
            </div>
            <div class="column-item-content">
              <span class="column-title">{{ column.title }}</span>
              <span class="column-key">({{ column.key }})</span>
            </div>
            <div class="column-item-right">
              <NButton text @click="handleEditColumn(column)">
                <template #icon>
                  <NIcon>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      xmlns:xlink="http://www.w3.org/1999/xlink"
                      viewBox="0 0 24 24"
                    >
                      <g fill="none">
                        <path
                          d="M3 17.75A3.25 3.25 0 0 0 6.25 21h4.915l.356-1.423l.02-.077H6.25a1.75 1.75 0 0 1-1.75-1.75V11h3.25l.184-.005A3.25 3.25 0 0 0 11 7.75V4.5h6.75c.966 0 1.75.784 1.75 1.75v4.982c.479-.19.994-.263 1.5-.22V6.25A3.25 3.25 0 0 0 17.75 3h-6.879a2.25 2.25 0 0 0-1.59.659L3.658 9.28A2.25 2.25 0 0 0 3 10.871v6.879zM7.75 9.5H5.561L9.5 5.561V7.75l-.006.144A1.75 1.75 0 0 1 7.75 9.5zm11.35 3.17l-5.903 5.902a2.686 2.686 0 0 0-.706 1.247l-.458 1.831a1.087 1.087 0 0 0 1.319 1.318l1.83-.457a2.685 2.685 0 0 0 1.248-.707l5.902-5.902A2.286 2.286 0 0 0 19.1 12.67z"
                          fill="currentColor"
                        ></path>
                      </g>
                    </svg>
                  </NIcon>
                </template>
              </NButton>
            </div>
          </div>
        </div>
      </NScrollbar>

      <!-- 对于大量数据使用虚拟滚动 -->
      <div v-else ref="scrollContainer" class="virtual-scroll-container" @scroll="handleScroll">
        <div class="virtual-scroll-content" :style="{ height: virtualItems.totalHeight + 'px' }">
          <div class="virtual-scroll-items" :style="{ transform: `translateY(${virtualItems.offsetY}px)` }">
            <div
              v-for="(column, virtualIndex) in virtualItems.items"
              :key="column.key"
              class="column-item"
              :style="{ height: itemHeight + 'px' }"
              draggable="true"
              @dragstart="handleDragStart($event, virtualItems.startIndex + virtualIndex)"
              @dragover="handleDragOver"
              @drop="handleDrop($event, virtualItems.startIndex + virtualIndex)"
              @dragend="handleDragEnd"
            >
              <div class="column-item-left">
                <NIcon class="column-drag-handle">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    xmlns:xlink="http://www.w3.org/1999/xlink"
                    viewBox="0 0 24 24"
                  >
                    <path d="M8 18h8v-2H8v2zm0-4h8v-2H8v2zm0-4h8V8H8v2zm0-4h8V4H8v2z" fill="currentColor" />
                  </svg>
                </NIcon>
                <NSwitch
                  :value="localVisibleColumns.has(column.key)"
                  size="small"
                  @update:value="checked => handleLocalSwitchChange(checked, column)"
                ></NSwitch>
              </div>
              <div class="column-item-content">
                <span class="column-title">{{ column.title }}</span>
                <span class="column-key">({{ column.key }})</span>
              </div>
              <div class="column-item-right">
                <NButton text @click="handleEditColumn(column)">
                  <template #icon>
                    <NIcon>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        xmlns:xlink="http://www.w3.org/1999/xlink"
                        viewBox="0 0 24 24"
                      >
                        <g fill="none">
                          <path
                            d="M3 17.75A3.25 3.25 0 0 0 6.25 21h4.915l.356-1.423l.02-.077H6.25a1.75 1.75 0 0 1-1.75-1.75V11h3.25l.184-.005A3.25 3.25 0 0 0 11 7.75V4.5h6.75c.966 0 1.75.784 1.75 1.75v4.982c.479-.19.994-.263 1.5-.22V6.25A3.25 3.25 0 0 0 17.75 3h-6.879a2.25 2.25 0 0 0-1.59.659L3.658 9.28A2.25 2.25 0 0 0 3 10.871v6.879zM7.75 9.5H5.561L9.5 5.561V7.75l-.006.144A1.75 1.75 0 0 1 7.75 9.5zm11.35 3.17l-5.903 5.902a2.686 2.686 0 0 0-.706 1.247l-.458 1.831a1.087 1.087 0 0 0 1.319 1.318l1.83-.457a2.685 2.685 0 0 0 1.248-.707l5.902-5.902A2.286 2.286 0 0 0 19.1 12.67z"
                            fill="currentColor"
                          ></path>
                        </g>
                      </svg>
                    </NIcon>
                  </template>
                </NButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.columns-header {
  padding: 0 16px 12px;
  margin: 0;
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
}

.columns-search {
  padding: 0 16px 12px;
  flex-shrink: 0;
}

.columns-list {
  flex: 1;
  overflow: hidden;
}

.columns-container {
  display: flex;
  flex-direction: column;
}

.column-item {
  padding: 8px 16px;
  min-height: 40px;
  box-sizing: border-box;
  display: flex;
  border-bottom: 1px solid var(--n-border-color);
  align-items: center;
  contain: layout style paint;
  will-change: transform;
}

.column-item-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.column-drag-handle {
  cursor: move;
  color: var(--n-text-color-3);
}

.column-item-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  margin-left: 12px;
}

.column-title {
  font-size: 12px;
  color: var(--n-text-color);
}

.column-key {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.column-item-right {
  opacity: 0;
  transition: opacity 0.3s;
  margin-left: auto;
}

.column-item:hover .column-item-right {
  opacity: 1;
}

.columns-search :deep(.n-input) {
  --n-height: 32px;
}

.columns-search :deep(.n-input-wrapper) {
  background-color: var(--n-card-color);
}

.columns-search :deep(.n-input__prefix) {
  margin-right: 8px;
}

.columns-search :deep(.n-icon) {
  font-size: 16px;
  color: var(--n-text-color-3);
}

/* 虚拟滚动样式 */
.virtual-scroll-container {
  height: calc(100vh - 200px);
  overflow-y: auto;
  position: relative;
}

.virtual-scroll-content {
  position: relative;
  width: 100%;
}

.virtual-scroll-items {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

/* 自定义滚动条样式 - 仅适用于当前组件 */
.virtual-scroll-container::-webkit-scrollbar {
  width: 6px;
}

.virtual-scroll-container::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

.virtual-scroll-container::-webkit-scrollbar-thumb {
  background: var(--n-scrollbar-color, #d1d5db);
  border-radius: 3px;
  transition: all 0.2s ease;
  opacity: 0.6;
}

.virtual-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--n-scrollbar-color-hover, #9ca3af);
  opacity: 1;
}

/* 针对NScrollbar组件的样式覆盖 */
.columns-list :deep(.n-scrollbar-rail) {
  right: 2px !important;
  width: 6px !important;
  border-radius: 3px !important;
}

.columns-list :deep(.n-scrollbar-rail .n-scrollbar-rail__scrollbar) {
  width: 6px !important;
  border-radius: 3px !important;
  background: var(--n-scrollbar-color, #d1d5db) !important;
  transition: all 0.2s ease !important;
  opacity: 0.6 !important;
}

.columns-list :deep(.n-scrollbar-rail .n-scrollbar-rail__scrollbar:hover) {
  background: var(--n-scrollbar-color-hover, #9ca3af) !important;
  opacity: 1 !important;
}

/* 隐藏默认的滚动条轨道背景 */
.columns-list :deep(.n-scrollbar-track) {
  background: transparent !important;
}

/* 滚动条容器悬停时显示 */
.columns-list:hover :deep(.n-scrollbar-rail .n-scrollbar-rail__scrollbar) {
  opacity: 0.8 !important;
}
</style>
