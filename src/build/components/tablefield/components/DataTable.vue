<script setup lang="ts">
import { computed, h, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import axios, { type AxiosInstance } from 'axios';
import { useMessage, useDialog } from 'naive-ui';

// 从主组件注入状态和方法
const tableState: any = inject('tableState');
const tableMethods: any = inject('tableMethods');
const httpClient = inject<AxiosInstance>('httpClient', axios);
const tableApi: any = inject('tableApi');

// 使用 naive-ui 的 hooks 替代 window 全局对象
const dialog = useDialog();
const message = useMessage();

// 注入暗色模式状态（由 TableIndexWrapper 提供）
const isDark = inject<ReturnType<typeof ref<boolean>>>('isDark', ref(false));
// 注入主题色（由 TableIndexWrapper 提供），默认 #3b82f6
const primaryColor = inject<ReturnType<typeof ref<string>>>('primaryColor', ref('#3b82f6'));

// 固定列背景色：跟随宿主主题自动切换
// 亮色使用 #ffffff，暗色使用 NaiveUI dark theme 对应的卡片背景色
const fixedCellBg = computed(() => (isDark.value ? '#182235' : '#ffffff'));
const fixedHeaderBg = computed(() => (isDark.value ? '#202c40' : '#f5f7fa'));

// 表格主体自动占满当前页面剩余高度。
// 由于 UMD 在不同宿主中的顶部导航高度不固定，这里根据卡片的实际位置计算，
// 不使用写死的 calc(100vh - xxx) 常量。
const tableCardRef = ref<any>(null);
const adaptiveTableHeight = ref(360);
let layoutResizeObserver: ResizeObserver | null = null;
let resizeFrame = 0;

const updateAdaptiveTableHeight = () => {
  window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    const cardElement = tableCardRef.value?.$el as HTMLElement | undefined;
    if (!cardElement) return;

    const cardTop = cardElement.getBoundingClientRect().top;
    const headerHeight = cardElement.querySelector<HTMLElement>('.n-data-table-thead')?.offsetHeight || 40;
    const paginationElement = cardElement.querySelector<HTMLElement>('.n-data-table__pagination');
    const paginationHeight = paginationElement
      ? paginationElement.offsetHeight + 24
      : 10;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    // 百分比高度在部分 UMD 挂载链路中会退化为内容高度，因此不能读取
    // table-container 的 bottom。优先读取宿主页面承载层的真实可视边界，
    // 兼容旧版 UMD 容器和新版 PageHost；其他宿主则回退到浏览器视口。
    const hostContainer = cardElement.closest<HTMLElement>(
      '.umd-component-page, .page-host-umd-container'
    );
    const hostBottom = hostContainer?.getBoundingClientRect().bottom;
    const availableBottom = hostBottom && hostBottom > cardTop
      ? Math.min(viewportHeight, hostBottom)
      : viewportHeight;
    const pageBottomGap = 24;
    const cardBottomPadding = 10;
    const availableHeight = Math.floor(
      availableBottom - cardTop - headerHeight - paginationHeight - pageBottomGap - cardBottomPadding
    );

    adaptiveTableHeight.value = Math.max(160, availableHeight);
  });
};

const {
  tableData,
  columns,
  loading,
  pagination,
  tableSize,
  showBorder,
  showStripe,
  tableHeight,
  tableScrollWidth,
  uiConfig,
  // showFirstColumn,
  showActionColumn,
  firstColumnType,
  checkedRowKeys,
  enableSingleSelect,
  transformRules
} = tableState;

const { handlePageChange, handlePageSizeChange, handleSorterChange, handleFiltersChange, fetchData, handleCreate } =
  tableMethods;

// 处理选中行变化的方法
// const handleCheckedRowKeysChange = (keys: (string | number)[]) => {
//   console.log('🔍 选中的行发生变化!');
//   console.log('📊 选中的行数量:', keys.length);
//   console.log('🔑 选中的行Keys:', keys);

//   // 根据选中的keys获取完整的行数据
//   const selectedRows = tableData.value.filter((row: any) => keys.includes(row.Kvid));
//   console.log('📋 选中的行数据:', selectedRows);

//   // 更新选中状态
//   checkedRowKeys.value = keys;
// };

// const handleDeleteRefresh = tableMethods.handleDeleteRefresh;

// 监听数据变化
watch(
  () => tableData.value,
  () => {
    // console.log('表格数据已更新');
  },
  { deep: true }
);

// 检查选中行变化，更新customActionsRef状态
watch(
  checkedRowKeys,
  _newKeys => {
    // console.log('DataTable - 选中行变化:', _newKeys);

    // 如果customActionsRef存在，确保它正确获取到选中状态
    if (tableState.customActionsRef && tableState.customActionsRef.value) {
      // console.log('DataTable - 通知CustomActions组件选中行变化');
    }
  },
  { deep: true }
);

// 处理行选择变化
const handleSelectionChange = (rowKeys: any) => {
  // console.log('DataTable - 表格选择行变化，之前值:', checkedRowKeys.value, '新值:', rowKeys);

  // 确保是数组类型
  const safeRowKeys = Array.isArray(rowKeys) ? rowKeys : [];

  // 更新选中行
  checkedRowKeys.value = safeRowKeys;

  // 强制更新引用，确保所有组件都能检测到变化
  tableState.checkedRowKeys.value = [...safeRowKeys];

  // 只在选中行不为空时处理自定义动作
  if (safeRowKeys.length > 0) {
    // console.log('DataTable - 有行被选中，总数:', safeRowKeys.length);

    // 确保自定义动作组件已加载
    if (tableState.customActionsRef && tableState.customActionsRef.value) {
      // console.log('DataTable - 通知自定义动作组件有行被选中');

      if (tableState.customActionsRef.value.loadCustomActions) {
        tableState.customActionsRef.value.loadCustomActions();
      }
    } else {
      // console.warn('DataTable - 无法访问自定义动作组件引用');
    }
  } else {
    // console.log('DataTable - 没有选中行');
  }
};

// 组件挂载后检查数据
onMounted(() => {
  nextTick(() => {
    updateAdaptiveTableHeight();

    const cardElement = tableCardRef.value?.$el as HTMLElement | undefined;
    const layoutContainer = cardElement?.closest('.table-container');
    layoutResizeObserver = new ResizeObserver(updateAdaptiveTableHeight);
    if (cardElement) layoutResizeObserver.observe(cardElement);
    if (layoutContainer) layoutResizeObserver.observe(layoutContainer);
    window.addEventListener('resize', updateAdaptiveTableHeight);
    window.visualViewport?.addEventListener('resize', updateAdaptiveTableHeight);
  });
});

onUnmounted(() => {
  layoutResizeObserver?.disconnect();
  layoutResizeObserver = null;
  window.cancelAnimationFrame(resizeFrame);
  window.removeEventListener('resize', updateAdaptiveTableHeight);
  window.visualViewport?.removeEventListener('resize', updateAdaptiveTableHeight);
});

// 创建标签渲染函数
const createTagRenderer = (mapping: any) => {
  return h('div', { class: 'tag-container' }, [
    h(
      'div',
      {
        class: `table-tag ${mapping.color}`,
        style: {
          display: 'inline-block',
          padding: '0 7px',
          fontSize: '12px',
          lineHeight: '20px',
          borderRadius: '3px',
          margin: 0,
          backgroundColor: getTagColor(mapping.color),
          color: '#fff'
        }
      },
      mapping.label
    )
  ]);
};

// 创建图片预览函数
const createImagePreview = (fullImageUrl: string) => {
  const modalDiv = document.createElement('div');
  modalDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    cursor: pointer;
  `;

  const imgElement = document.createElement('img');
  imgElement.src = fullImageUrl;
  imgElement.style.cssText = `
    max-width: 90vw;
    max-height: 90vh;
    object-fit: contain;
  `;

  modalDiv.appendChild(imgElement);
  modalDiv.onclick = (e: any) => {
    if (e.target === modalDiv) {
      document.body.removeChild(modalDiv);
    }
  };

  document.body.appendChild(modalDiv);
};

// 处理标签转换
const applyTagTransform = (value: any, transformRule: any) => {
  if (value === undefined || value === null) return null;

  const stringValue = String(value);
  const mapping = transformRule.params?.mappings?.find((m: any) => String(m.value) === stringValue);

  return mapping ? createTagRenderer(mapping) : null;
};

// 处理文本颜色转换
const applyTextTransform = (value: any, transformRule: any) => {
  if (value === undefined || value === null) return null;

  const stringValue = String(value);
  const mapping = transformRule.params?.mappings?.find((m: any) => String(m.value) === stringValue);

  if (!mapping) return null;

  return h(
    'span',
    {
      style: {
        color: getTagColor(mapping.color),
        fontWeight: '500'
      }
    },
    stringValue
  );
};

// 处理图片转换
const applyImageTransform = (value: any, transformRule: any) => {
  if (!value || typeof value !== 'string') return null;

  const imageConfig = transformRule.params?.imageConfig;
  const fullImageUrl = `${imageConfig?.domainPrefix || ''}${value}`;

  return h('div', { class: 'image-container' }, [
    h('img', {
      src: fullImageUrl,
      alt: '图片',
      style: {
        width: `${imageConfig?.width || 80}px`,
        height: `${imageConfig?.height || 80}px`,
        objectFit: 'cover',
        borderRadius: '4px',
        cursor: imageConfig?.previewable ? 'pointer' : 'default'
      },
      onError: (e: any) => {
        e.target.src =
          'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCA4MCA4MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yNCAzMkwyNCAzMkwyNCAzMkwyNCAzMloiIHN0cm9rZT0iIzk5OTk5OSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4PSIyOCIgeT0iMjgiPgo8cGF0aCBkPSJNMTkgN1Y5SDIxVjdIMTlaTTIxIDExSDE5VjEzSDIxVjExWk0yMSAxNUgxOVYxN0gyMVYxNVpNMTcgN1YxN0g3VjdIMTdaTTE1IDE1VjlIOVYxNUgxNVpNMTMgMTNIMTFWMTFIMTNWMTNaIiBmaWxsPSIjOTk5OTk5Ii8+Cjwvc3ZnPgo8L3N2Zz4K';
        e.target.style.backgroundColor = '#f5f5f5';
      },
      onClick: imageConfig?.previewable ? () => createImagePreview(fullImageUrl) : undefined
    })
  ]);
};

// 处理传统标签对象
const handleLegacyTag = (value: any) => {
  // eslint-disable-next-line no-underscore-dangle
  if (value && typeof value === 'object' && (value as any).__isTag) {
    return createTagRenderer(value);
  }
  return null;
};

// 创建列渲染器
const createColumnRenderer = (col: any) => {
  const transformRule = transformRules?.value?.find((rule: any) => rule.field === col.key);

  return (row: any) => {
    const value = row[col.key];

    // 应用转换规则
    if (transformRule) {
      if (transformRule.type === 'tag') {
        const result = applyTagTransform(value, transformRule);
        if (result) return result;
      } else if (transformRule.type === 'text') {
        const result = applyTextTransform(value, transformRule);
        if (result) return result;
      } else if (transformRule.type === 'image') {
        const result = applyImageTransform(value, transformRule);
        if (result) return result;
      }
    }

    // 处理传统标签
    const legacyTag = handleLegacyTag(value);
    if (legacyTag) return legacyTag;

    // 返回原始值
    return value;
  };
};

// 处理列配置，为表格列添加标签和图片渲染支持
const processedColumns = computed(() => {
  // 处理原始列配置
  const baseColumns = columns.value.map((col: any) => {
    // 如果已经有自定义render函数则保留
    if (col.render) return col;

    // 添加通用的render函数检查转换规则
    const newCol = { ...col };
    newCol.render = createColumnRenderer(col);

    return newCol;
  });

  // 根据首列类型添加相应的列
  const finalColumns: any[] = [];

  if (firstColumnType.value === 'checkbox') {
    // 添加复选框列
    finalColumns.push({
      type: 'selection' as const,
      multiple: !enableSingleSelect.value // 根据enableSingleSelect决定是否多选
    } as any);
  }

  // 添加处理后的基础列
  finalColumns.push(...baseColumns);

  // 添加操作列
  const actionColumn = {
    title: '操作',
    key: 'actions',
    fixed: 'right',
    width: 120,
    render: (row: any) => {
      return h(
        'div',
        {
          style:
            'display: flex; align-items: center; justify-content: center; gap: 4px; padding: 4px; flex-direction: row; flex-wrap: nowrap; width: 70px;'
        },
        [
          // 编辑按钮 - 使用主题色
          h(
            'div',
            {
              style:
                `display: inline-flex; align-items: center; justify-content: center; cursor: pointer; margin-right: 8px; transition: transform 0.2s ease; flex-shrink: 0; color: ${primaryColor.value};`,
              onClick: () => {
                console.log('编辑', row);
                // 使用handleCreate方法处理编辑操作
                if (handleCreate) {
                  handleCreate(row);
                } else {
                  console.warn('handleCreate方法未定义');
                }
              }
            },
            h(
              'svg',
              {
                xmlns: 'http://www.w3.org/2000/svg',
                width: '16',
                height: '16',
                viewBox: '0 0 32 32',
                fill: 'none',
                stroke: 'currentColor'
              },
              [
                h('path', { d: 'M2 26h28v2H2z', fill: 'currentColor' }),
                h('path', {
                  d: 'M25.4 9c.8-.8.8-2 0-2.8l-3.6-3.6c-.8-.8-2-.8-2.8 0l-15 15V24h6.4l15-15zm-5-5L24 7.6l-3 3L17.4 7l3-3zM6 22v-3.6l10-10l3.6 3.6l-10 10H6z',
                  fill: 'currentColor'
                })
              ]
            )
          ),

          // 删除按钮 - 使用危险色
          h(
            'div',
            {
              style:
                'display: inline-flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s ease; flex-shrink: 0; color: #d03050;',
              onClick: () => {
                // 创建确认对话框
                dialog?.warning({
                  title: '确认删除',
                  content: '确定要删除这条数据吗？',
                  positiveText: '确定',
                  negativeText: '取消',
                  onPositiveClick: async () => {
                    try {
                      // 准备删除请求的参数
                      const Kvids = [row.Kvid];

                      // 发送删除请求
                      const response = { data: await tableApi.deleteRows(Kvids) };

                      if (response.data) {
                        message?.success('删除成功');
                        // 重新加载数据
                        fetchData();
                      } else {
                        message?.error('删除失败');
                      }
                    } catch (error: any) {
                      // console.error('删除失败:', error);
                      message?.error(`删除失败: ${error.message || '未知错误'}`);
                    }
                  }
                });
              }
            },
            h(
              'svg',
              {
                xmlns: 'http://www.w3.org/2000/svg',
                width: '16',
                height: '16',
                viewBox: '0 0 20 20',
                fill: 'none',
                stroke: 'currentColor'
              },
              [
                h('path', {
                  d: 'M11.5 4a1.5 1.5 0 0 0-3 0h-1a2.5 2.5 0 0 1 5 0H17a.5.5 0 0 1 0 1h-.554L15.15 16.23A2 2 0 0 1 13.163 18H6.837a2 2 0 0 1-1.987-1.77L3.553 5H3a.5.5 0 0 1-.492-.41L2.5 4.5A.5.5 0 0 1 3 4h8.5zm3.938 1H4.561l1.282 11.115a1 1 0 0 0 .994.885h6.326a1 1 0 0 0 .993-.885L15.438 5zM8.5 7.5c.245 0 .45.155.492.359L9 7.938v6.125c0 .241-.224.437-.5.437c-.245 0-.45-.155-.492-.359L8 14.062V7.939c0-.242.224-.438.5-.438zm3 0c.245 0 .45.155.492.359l.008.079v6.125c0 .241-.224.437-.5.437c-.245 0-.45-.155-.492-.359L11 14.062V7.939c0-.242.224-.438.5-.438z',
                  fill: 'currentColor'
                })
              ]
            )
          )
        ]
      );
    }
  };

  if (showActionColumn?.value === false) {
    return finalColumns;
  }
  return [...finalColumns, actionColumn];
});

// 根据标签类型获取颜色
function getTagColor(type: string) {
  if (type?.startsWith('#')) return type;
  switch (type) {
    case 'default':
      return '#f0f0f0';
    case 'primary':
      return '#2080f0';
    case 'info':
      return '#909399';
    case 'success':
      return '#18a058';
    case 'warning':
      return '#f0a020';
    case 'error':
      return '#d03050';
    default:
      return '#f0f0f0';
  }
}
</script>

<template>
  <NCard ref="tableCardRef" class="table-card" :bordered="true" content-style="padding: 0 0 10px;">
    <NDataTable ref="table" v-model:checked-row-keys="checkedRowKeys" remote :columns="processedColumns"
      :data="tableData" :loading="loading" :pagination="{
        ...pagination,
        onChange: handlePageChange,
        onUpdatePageSize: handlePageSizeChange
      }" :row-key="row => row.Kvid" :min-height="adaptiveTableHeight" :max-height="adaptiveTableHeight"
      :scroll-x="tableScrollWidth" :single-line="!showBorder"
      :striped="showStripe" :size="tableSize" @update:sorter="handleSorterChange" @update:filters="handleFiltersChange"
      @update:checked-row-keys="handleSelectionChange">
      <template #loading>
        <NSpace vertical justify="center" class="py-4">
          <NSpin size="medium"></NSpin>
          <NText depth="3">正在加载数据...</NText>
        </NSpace>
      </template>

      <template #empty>
        <NEmpty description="暂无数据">
          <template #extra>
            <NButton size="small" @click="fetchData">重新加载</NButton>
          </template>
        </NEmpty>
      </template>
    </NDataTable>
  </NCard>
</template>

<style scoped>
.table-card {
  margin-bottom: 0;
  overflow: hidden;
  border-radius: 1rem;
  border-color: var(--kivii-table-border);
  background: var(--kivii-table-surface);
}

.tag-container {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
}

.image-container img {
  transition: transform 0.2s ease;
}

.image-container img:hover {
  transform: scale(1.05);
}

:deep(.n-data-table) {
  --n-merged-th-color: var(--kivii-table-header-bg);
  --n-merged-td-color: var(--kivii-table-surface);
  --n-table-color: var(--kivii-table-surface);
  --n-table-header-color: var(--kivii-table-header-bg);
  --n-table-color-hover: var(--kivii-table-row-hover);
  --n-table-color-striped: var(--kivii-table-row-striped);
  color: var(--kivii-table-text);
}

:deep(.n-data-table-th) {
  font-weight: 600;
  letter-spacing: 0.01em;
}

:deep(.n-data-table-th),
:deep(.n-data-table-td) {
  border-color: var(--kivii-table-border) !important;
}

:deep(.n-data-table-base-table-body) {
  overflow: auto !important;
}

:deep(.n-data-table-table) {
  min-width: 100%;
}

/* 表格主体贴合卡片左右边缘，分页操作区单独保留呼吸空间 */
:deep(.n-data-table__pagination) {
  padding: 0 12px;
  box-sizing: border-box;
}

/* 优化分页器页码选择器的样式 */
:deep(.n-pagination .n-pagination-size-picker) {
  width: 84px !important;
}

:deep(.n-pagination .n-pagination-size-picker .n-base-selection) {
  width: 84px !important;
}

/* 优化分页器整体布局 */
:deep(.n-pagination) {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--kivii-table-muted);
}

/* 确保总条数显示正常 */
:deep(.n-pagination-prefix) {
  margin-right: auto;
  white-space: nowrap;
}

/* 优化表格滚动相关样式 */
:deep(.n-data-table-base-table) {
  width: 100%;
}

:deep(.n-data-table-base-table-body) {
  overflow-x: auto !important;
}

:deep(.n-scrollbar-container) {
  min-width: 100%;
}

/* 图标按钮样式 */
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.icon-button:hover {
  transform: scale(1.2);
}

:deep(.n-data-table .action-buttons .n-button) {
  min-width: 60px;
  cursor: pointer !important;
}

/* 固定列：使用 v-bind 将 JS 计算值直接注入 CSS，确保亮/暗模式都有实色背景 */
:deep(.n-data-table-td--fixed-left),
:deep(.n-data-table-td--fixed-right) {
  background-color: v-bind(fixedCellBg) !important;
  position: sticky !important;
  z-index: 2 !important;
}

:deep(.n-data-table-th--fixed-left) {
  background-color: v-bind(fixedHeaderBg) !important;
  position: sticky !important;
  z-index: 3 !important;
  box-shadow: 2px 0 4px rgba(15, 23, 42, 0.08) !important;
}

:deep(.n-data-table-th--fixed-right) {
  background-color: v-bind(fixedHeaderBg) !important;
  position: sticky !important;
  z-index: 3 !important;
  box-shadow: -2px 0 4px rgba(15, 23, 42, 0.08) !important;
}

:deep(.n-data-table-td--fixed-left) {
  box-shadow: 2px 0 4px rgba(15, 23, 42, 0.05) !important;
}

:deep(.n-data-table-td--fixed-right) {
  box-shadow: -2px 0 4px rgba(15, 23, 42, 0.05) !important;
}

/* 条纹行、悬停行的固定列也保持实色背景 */
:deep(.n-data-table--striped .n-data-table-tr--striped .n-data-table-td--fixed-left),
:deep(.n-data-table--striped .n-data-table-tr--striped .n-data-table-td--fixed-right),
:deep(.n-data-table-tr:hover .n-data-table-td--fixed-left),
:deep(.n-data-table-tr:hover .n-data-table-td--fixed-right) {
  background-color: v-bind(fixedCellBg) !important;
}
</style>
