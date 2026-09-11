<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import axios, { type AxiosInstance } from 'axios';
import ActionDialog from './ActionDialog.vue';
defineOptions({
  name: 'SearchForm'
});

// 从主组件注入状态和方法
const tableState: any = inject('tableState');
const tableMethods: any = inject('tableMethods');
const httpClient = inject<AxiosInstance>('httpClient', axios);
const tableApi: any = inject('tableApi');

const { searchForm, formItems, isExpanded, checkedRowKeys, tableData } = tableState;
const { handleCreate } = tableMethods;
// 引入自定义动作相关逻辑
const customActionsRef = computed(() => tableState.customActionsRef?.value);

// ActionDialog 状态管理
const showActionDialog = ref(false);
const actionDialogUrl = ref('');
const actionDialogData = ref<any>(null);

// 创建一个计算属性专门处理选中行数量
const selectedRowCount = computed(() => {
  // 直接从tableState获取选中行数量
  const count = Array.isArray(checkedRowKeys?.value) ? checkedRowKeys.value.length : 0;
  return count;
});

// 监听选中行变化
watch(
  () => checkedRowKeys?.value,
  newValue => {
    // 如果有选中行但没有自定义动作，尝试从tableState获取
    if (newValue && newValue.length > 0) {
      // 如果customActionsRef未初始化，尝试从tableState获取并初始化
      if ((!customActionsRef.value || !customActionsRef.value.customActions) && tableState.customActionsRef?.value) {
        if (tableState.customActionsRef.value.loadCustomActions) {
          tableState.customActionsRef.value.loadCustomActions().then(() => { });
        }
      }
    }
  },
  { deep: true }
);

// 辅助函数：从视图配置获取动作
const getActionsFromViewConfig = () => {
  if (
    !tableState.viewsConfig?.value?.length ||
    typeof tableState.currentViewIndex?.value !== 'number' ||
    tableState.currentViewIndex.value < 0
  ) {
    return [];
  }

  const currentViewIndex = tableState.currentViewIndex.value;
  if (currentViewIndex >= tableState.viewsConfig.value.length) {
    return [];
  }

  const currentView = tableState.viewsConfig.value[currentViewIndex];
  return currentView?.config?.customActionSettings?.customActions || [];
};

// 辅助函数：获取默认动作
const getDefaultActions = () => {
  if (!checkedRowKeys?.value?.length) return [];

  return [
    {
      buttonName: '导出选中',
      enabled: true,
      operationType: 'multiple',
      actionType: 'external_tab',
      url: '/export',
      buttonDescription: '导出选中的数据'
    }
  ];
};

// 辅助函数：过滤动作
const filterActionsBySelection = (actions: any[]) => {
  const selectedCount = selectedRowCount.value;

  return actions.filter((action: any) => {
    if (!action.enabled) return false;

    if (action.operationType === 'single') {
      return selectedCount === 1;
    }

    if (action.operationType === 'multiple') {
      return selectedCount > 1;
    }

    return true;
  });
};

// 获取要显示的动作按钮列表
const getCustomActions = computed(() => {
  // 首先尝试获取已过滤的可见动作
  if (customActionsRef.value?.visibleActions) {
    return customActionsRef.value.visibleActions;
  }

  // 按优先级获取动作配置
  let actions = getActionsFromViewConfig();

  if (!actions.length && customActionsRef.value?.customActions?.length) {
    actions = customActionsRef.value.customActions;
  }

  if (!actions.length && tableState.customActionsRef?.value?.customActions?.length) {
    actions = tableState.customActionsRef.value.customActions;
  }

  if (!actions.length) {
    actions = getDefaultActions();
  }

  return filterActionsBySelection(actions);
});

// 检查是否有选中的行和自定义动作
const showCustomActions = computed(() => {
  // 检查是否有选中行
  const hasCheckedRows = selectedRowCount.value > 0;
  // 如果没有选中行，不显示动作按钮
  if (!hasCheckedRows) {
    return false;
  }

  // 检查是否有可用的自定义动作
  const hasEnabledActions = getCustomActions.value.length > 0;
  return hasEnabledActions;
});

// 处理ActionDialog关闭
const handleActionDialogClose = () => {
  showActionDialog.value = false;
  actionDialogUrl.value = '';
  actionDialogData.value = null;
};

// 构建带参数的URL
const buildUrlWithParams = (url: string, requestParams: string[]) => {
  if (!requestParams || requestParams.length === 0 || !tableData.value || tableData.value.length === 0) {
    return url;
  }

  // 获取第一行数据作为参数来源
  const firstRow = tableData.value[0];
  if (!firstRow) {
    return url;
  }

  // 构建查询参数
  const queryParams: string[] = [];
  requestParams.forEach(param => {
    if (firstRow[param] !== undefined && firstRow[param] !== null) {
      const paramValue = encodeURIComponent(firstRow[param]);
      queryParams.push(`${param}=${paramValue}`);
    }
  });

  if (queryParams.length === 0) {
    return url;
  }

  // 检查URL是否已经包含查询参数
  const separator = url.includes('?') ? '&' : '?';

  return `${url}${separator}${queryParams.join('&')}`;
};

// 添加单选参数
const addSingleSelectionParams = (action: any, queryParams: string[]) => {
  // 单选模式：使用选中的单个项目数据
  const selectedItem = tableData.value.find((row: any) => checkedRowKeys.value.includes(row.Kvid));
  if (selectedItem) {
    action.requestParams.forEach((param: string) => {
      if (selectedItem[param] !== undefined && selectedItem[param] !== null) {
        const paramValue = encodeURIComponent(selectedItem[param]);
        queryParams.push(`${param}=${paramValue}`);
      }
    });
  }
};

// 添加多选参数
const addMultiSelectionParams = (action: any, queryParams: string[]) => {
  // 多选模式：将选中项目的指定字段作为数组参数传递
  const selectedItems = tableData.value.filter((row: any) => checkedRowKeys.value.includes(row.Kvid));
  action.requestParams.forEach((param: string) => {
    const values = selectedItems
      .map((item: any) => item[param])
      .filter((value: any) => value !== undefined && value !== null);

    if (values.length > 0) {
      // 多选时，可以使用逗号分隔的值或者多个同名参数
      const paramValue = encodeURIComponent(values.join(','));
      queryParams.push(`${param}=${paramValue}`);

      // 也可以添加数组格式的参数
      queryParams.push(`${param}_array=${encodeURIComponent(JSON.stringify(values))}`);
    }
  });

  // 添加选中数量参数
  queryParams.push(`selected_count=${selectedItems.length}`);
};

// 构建查询参数
const buildQueryParams = (action: any) => {
  const queryParams: string[] = [];

  // 根据操作类型处理参数
  if (action.operationType === 'single') {
    addSingleSelectionParams(action, queryParams);
  } else {
    addMultiSelectionParams(action, queryParams);
  }

  return queryParams;
};

// 构建动作URL（包含参数）
const buildActionUrl = (action: any, baseUrl: string) => {
  // 如果没有请求参数，直接返回原URL
  if (!action.requestParams || action.requestParams.length === 0) {
    return baseUrl;
  }

  const queryParams = buildQueryParams(action);

  // 如果没有有效的查询参数，返回原URL
  if (queryParams.length === 0) {
    return baseUrl;
  }

  // 检查URL是否已经包含查询参数
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${queryParams.join('&')}`;
};

// 处理Dialog弹窗动作
const handleDialogAction = (action: any, finalUrl: string) => {
  // 准备传递给Dialog的数据
  let dialogData;
  if (action.operationType === 'single') {
    // 单选模式：传递单个对象
    dialogData = tableData.value.find((row: any) => checkedRowKeys.value.includes(row.Kvid));
  } else {
    // 多选模式：传递数组
    dialogData = tableData.value.filter((row: any) => checkedRowKeys.value.includes(row.Kvid));
  }

  // 设置ActionDialog的数据并显示
  actionDialogUrl.value = finalUrl;
  actionDialogData.value = dialogData;
  showActionDialog.value = true;
};

// 处理外标签打开动作
const handleExternalTabAction = (action: any, finalUrl: string) => {
  const externalUrl = buildActionUrl(action, finalUrl);
  window.open(externalUrl, '_blank');
  window.$message?.success('已在新标签页打开');
};

// 处理内标签打开动作
const handleInternalTabAction = (action: any, finalUrl: string) => {
  const internalUrl = buildActionUrl(action, finalUrl);

  try {
    (window as any).$routerPush.routerPush(internalUrl);
    window.$message?.success('已跳转到目标页面');
  } catch (error) {
    // console.error('SearchForm - 内标签跳转失败:', error);
    window.$message?.error('内标签跳转失败');
  }
};

// 执行自定义动作
const executeAction = async (action: any) => {
  // 首先尝试使用计算属性中的方法
  if (customActionsRef.value?.executeAction) {
    customActionsRef.value.executeAction(action);
    return;
  }

  // 如果失败，尝试从tableState获取方法
  if (tableState.customActionsRef?.value?.executeAction) {
    tableState.customActionsRef.value.executeAction(action);
    return;
  }

  try {
    // 构建最终的URL
    let finalUrl = action.url;

    // 如果URL是.vue文件且有请求参数，则添加查询字符串
    if (action.url.endsWith('.vue') && action.requestParams && action.requestParams.length > 0) {
      finalUrl = buildUrlWithParams(action.url, action.requestParams);
    }

    // 根据动作类型执行不同的逻辑
    switch (action.actionType) {
      case 'dialog':
        handleDialogAction(action, finalUrl);
        break;
      case 'external_tab':
        handleExternalTabAction(action, finalUrl);
        break;
      case 'internal_tab':
        handleInternalTabAction(action, finalUrl);
        break;
      default:
        window.$message?.warning('未知的动作类型');
    }
  } catch (error) {
    // console.error('SearchForm - 执行动作失败:', error);
    window.$message?.error('执行动作失败');
  }
};

// 获取视图配置
const viewsConfig = computed(() => {
  // 检查viewsConfig是否存在且有值
  if (tableState.viewsConfig && tableState.viewsConfig.value && tableState.viewsConfig.value.length > 0) {
    return tableState.viewsConfig.value;
  }
  return [];
});

const currentViewIndex = computed({
  get: () => {
    if (tableState.currentViewIndex && typeof tableState.currentViewIndex.value === 'number') {
      return tableState.currentViewIndex.value;
    }
    return 0;
  },
  set: val => {
    if (tableState.currentViewIndex) {
      tableState.currentViewIndex.value = val;
    }
  }
});

const { handleSearch, resetSearch, fetchData } = tableMethods;

const toggleExpand = () => {
  tableState.isExpanded.value = !tableState.isExpanded.value;
};

const openSettings = () => {
  tableState.showSettingDrawer.value = true;
};

// 计算是否有启用的搜索字段
const hasEnabledSearchFields = computed(() => {
  return formItems.value && formItems.value.length > 0;
});

// 计算是否需要显示展开按钮（字段超过5个时才显示）
const showExpandButton = computed(() => {
  return formItems.value && formItems.value.length > 5;
});

// 计算第一行显示的字段
const firstRowFields = computed(() => {
  if (!formItems.value) return [];

  // 如果字段数量 <= 5，显示所有字段
  if (formItems.value.length <= 5) {
    return formItems.value;
  }

  // 如果字段数量 > 5，第一行总是显示前5个字段（不管展开还是折叠）
  return formItems.value.slice(0, 5);
});

// 计算展开后的额外字段（第6个字段开始）
const expandedFields = computed(() => {
  if (!formItems.value || formItems.value.length <= 5 || !isExpanded.value) {
    return [];
  }
  return formItems.value.slice(5);
});

// 计算是否需要在第一行显示操作按钮
const showActionsInFirstRow = computed(() => {
  return false; // 操作按钮总是单独占一行
});

// 处理视图标签页切换
const handleTabChange = async (index: number) => {
  // 调用TableSettingsDrawer中的视图切换方法
  if (tableState.tableSettingsDrawerRef && tableState.tableSettingsDrawerRef.value) {
    try {
      const result = await tableState.tableSettingsDrawerRef.value.handleViewSelect(index);

      if (result) {
        fetchData();
      }
    } catch (error) {
      // console.error('❌ SearchForm: 视图切换出错', error);
    }
  } else {
    currentViewIndex.value = index;
    // 刷新数据
    fetchData();
  }
};

// 获取特定视图的下拉菜单选项
const getViewDropdownOptions = (_viewIndex: number) => {
  const canDelete = viewsConfig.value.length > 1; // 至少保留一个视图

  return [
    {
      label: '复制视图',
      key: 'copy',
      icon: (): string => '📋'
    },
    {
      label: '编辑视图',
      key: 'edit',
      icon: (): string => '✏️'
    },
    {
      label: '删除视图',
      key: 'delete',
      disabled: !canDelete,
      icon: (): string => '🗑️'
    }
  ];
};

// 复制视图
const handleCopyView = async (viewIndex: number = currentViewIndex.value) => {
  try {
    const targetView = viewsConfig.value[viewIndex];
    if (!targetView) return;

    // 获取当前日期时间作为ID
    const now = new Date();
    const id = `view_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    // 生成新视图名称
    const copyName = `${targetView.name} 副本`;

    // 创建新的视图配置（深拷贝当前视图配置）
    const newView = {
      id,
      name: copyName,
      config: JSON.parse(JSON.stringify(targetView.config || {}))
    };

    // 添加到视图配置数组
    tableState.viewsConfig.value.push(newView);

    // 切换到新创建的视图
    const newIndex = tableState.viewsConfig.value.length - 1;
    tableState.currentViewIndex.value = newIndex;

    // 保存到服务器
    {
      await tableApi.setSettings({
        Type: tableState.uiConfig.Type,
        InternalCode: tableState.uiConfig.InternalCode,
        IsDefault: tableState.uiConfig.IsDefault,
        Parameters: JSON.stringify(tableState.viewsConfig.value)
      });
    }

    // 应用新视图配置
    if (tableState.tableSettingsDrawerRef && tableState.tableSettingsDrawerRef.value) {
      await tableState.tableSettingsDrawerRef.value.handleViewSelect(newIndex);
    }

    window.$message?.success('视图复制成功');
    fetchData();
  } catch (error) {
    window.$message?.error('复制视图失败');
    // console.error('❌ SearchForm: 复制视图失败:', error);
  }
};

// 删除视图
const handleDeleteView = async (viewIndex: number = currentViewIndex.value) => {
  const targetView = viewsConfig.value[viewIndex];
  if (!targetView) return;

  // 确认删除
  const dialog = window.$dialog;
  if (!dialog) return;

  dialog.warning({
    title: '确认删除',
    content: `确定要删除视图 "${targetView.name}" 吗？此操作不可撤销。`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        // 如果只有一个视图，不允许删除
        if (viewsConfig.value.length <= 1) {
          window.$message?.error('至少要保留一个视图');
          return;
        }

        // 从配置数组中删除
        tableState.viewsConfig.value.splice(viewIndex, 1);

        // 调整当前视图索引
        let newIndex = currentViewIndex.value;
        if (viewIndex === currentViewIndex.value) {
          // 如果删除的是当前视图
          if (newIndex >= tableState.viewsConfig.value.length) {
            newIndex = tableState.viewsConfig.value.length - 1;
          }
          tableState.currentViewIndex.value = newIndex;
        } else if (viewIndex < currentViewIndex.value) {
          // 如果删除的视图在当前视图之前，需要调整索引
          tableState.currentViewIndex.value = currentViewIndex.value - 1;
        }

        // 保存到服务器
        {
          await tableApi.setSettings({
            Type: tableState.uiConfig.Type,
            InternalCode: tableState.uiConfig.InternalCode,
            IsDefault: tableState.uiConfig.IsDefault,
            Parameters: JSON.stringify(tableState.viewsConfig.value)
          });
        }

        // 应用新的视图配置
        if (tableState.tableSettingsDrawerRef && tableState.tableSettingsDrawerRef.value) {
          await tableState.tableSettingsDrawerRef.value.handleViewSelect(tableState.currentViewIndex.value);
        }

        window.$message?.success('视图删除成功');
        fetchData();
      } catch (error) {
        window.$message?.error('删除视图失败');
        // console.error('❌ SearchForm: 删除视图失败:', error);
      }
    }
  });
};
// 处理视图操作
const handleViewAction = async (key: string, viewIndex?: number) => {
  // 如果没有指定视图索引，使用当前视图索引
  const targetIndex = viewIndex !== undefined ? viewIndex : currentViewIndex.value;
  const targetView = viewsConfig.value[targetIndex];
  if (!targetView) return;

  switch (key) {
    case 'copy':
      await handleCopyView(targetIndex);
      break;
    case 'edit':
      // 设置当前视图索引
      tableState.currentViewIndex.value = targetIndex;
      // 打开表格设置侧边栏
      tableState.showSettingDrawer.value = true;
      break;
    case 'delete':
      await handleDeleteView(targetIndex);
      break;
    default:
      console.warn('未知的视图操作:', key);
      break;
  }
};
</script>

<template>
  <NCard class="search-card" :bordered="true" content-style="padding: 14px 16px;">
    <!-- 顶部配置按钮区域 -->
    <div class="top-actions">
      <div class="tabs-container" style="display: flex; align-items: center; flex: 1; margin-right: 10px">

        <!--<NButton size="tiny" type="primary" quaternary circle title="新建视图" style="margin-right: 8px"-->
        <!--  class="add-view-button" @click="createNewView">-->
        <!--  <template #icon>-->
        <!--    <NIcon>-->
        <!--      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"-->
        <!--        style="width: 24px; height: 24px; transform: translateY(-9px)" class="add-icon">-->
        <!--        <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" fill="currentColor" />-->
        <!--      </svg>-->
        <!--    </NIcon>-->
        <!--  </template>-->
        <!--</NButton>-->


        <NTabs v-if="viewsConfig && viewsConfig.length > 0" :value="currentViewIndex" type="line" size="small"
          style="flex: 1" @update:value="handleTabChange">
          <NTabPane v-for="(view, index) in viewsConfig" :key="view.id" :name="index">
            <template #tab>
              <div class="tab-with-dropdown" style="display: flex; align-items: center; gap: 4px">
                <span>{{ view.name }}</span>
                <NDropdown :options="getViewDropdownOptions(Number(index))" placement="bottom-end" trigger="click"
                  @select="key => handleViewAction(key, Number(index))" @click.stop>
                  <NButton size="tiny" quaternary circle :title="`${view.name} 操作`"
                    style="margin-left: 4px; opacity: 0.6" @click.stop>
                    <template #icon>
                      <NIcon size="12">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path
                            d="M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z"
                            fill="currentColor" />
                        </svg>
                      </NIcon>
                    </template>
                  </NButton>
                </NDropdown>
              </div>
            </template>
          </NTabPane>
        </NTabs>
      </div>

      <NSpace :size="8" align="center">
        <NButton type="primary" size="small" @click="() => handleCreate(null)">新建</NButton>
        <NButton size="small" title="刷新数据" @click="fetchData">
          <template #icon>
            <NIcon>
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24">
                <path
                  d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                  fill="currentColor"></path>
              </svg>
            </NIcon>
          </template>
        </NButton>
        <NButton size="small" @click="openSettings">
          <template #icon>
            <NIcon>
              <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24">
                <path opacity=".3"
                  d="M19.28 8.6l-.7-1.21l-1.27.51l-1.06.43l-.91-.7c-.39-.3-.8-.54-1.23-.71l-1.06-.43l-.16-1.13L12.7 4h-1.4l-.19 1.35l-.16 1.13l-1.06.44c-.41.17-.82.41-1.25.73l-.9.68l-1.05-.42l-1.27-.52l-.7 1.21l1.08.84l.89.7l-.14 1.13c-.03.3-.05.53-.05.73s.02.43.05.73l.14 1.13l-.89.7l-1.08.84l.7 1.21l1.27-.51l1.06-.43l.91.7c.39.3.8.54 1.23.71l1.06.43l.16 1.13l.19 1.36h1.39l.19-1.35l.16-1.13l1.06-.43c.41-.17.82-.41 1.25-.73l.9-.68l1.04.42l1.27.51l.7-1.21l-1.08-.84l-.89-.7l.14-1.13c.04-.31.05-.52.05-.73c0-.21-.02-.43-.05-.73l-.14-1.13l.89-.7l1.1-.84zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4s4 1.79 4 4s-1.79 4-4 4z"
                  fill="currentColor"></path>
                <path
                  d="M19.43 12.98c.04-.32.07-.64.07-.98c0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65A.488.488 0 0 0 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1a.566.566 0 0 0-.18-.03c-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.42.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03c.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zm-1.98-1.71c.04.31.05.52.05.73c0 .21-.02.43-.05.73l-.14 1.13l.89.7l1.08.84l-.7 1.21l-1.27-.51l-1.04-.42l-.9.68c-.43.32-.84.56-1.25.73l-1.06.43l-.16 1.13l-.2 1.35h-1.4l-.19-1.35l-.16-1.13l-1.06-.43c-.43-.18-.83-.41-1.23-.71l-.91-.7l-1.06.43l-1.27.51l-.7-1.21l1.08-.84l.89-.7l-.14-1.13c-.03-.31-.05-.54-.05-.74s.02-.43.05-.73l.14-1.13l-.89-.7l-1.08-.84l.7-1.21l1.27.51l1.04.42l.9-.68c.43-.32.84-.56 1.25-.73l1.06-.43l.16-1.13l.2-1.35h1.39l.19 1.35l.16 1.13l1.06.43c.43.18.83.41 1.23.71l.91.7l1.06-.43l1.27-.51l.7 1.21l-1.07.85l-.89.7l.14 1.13zM12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4s4-1.79 4-4s-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2s2 .9 2 2s-.9 2-2 2z"
                  fill="currentColor"></path>
              </svg>
            </NIcon>
          </template>
        </NButton>
      </NSpace>
    </div>

    <!-- 自定义动作按钮区域 -->
    <div v-if="showCustomActions" class="custom-actions">
      <div class="selected-info">
        <NTag type="info" size="small">已选择 {{ selectedRowCount }} 项</NTag>
      </div>
      <div class="actions-list">
        <NButton v-for="(action, index) in getCustomActions" :key="index" size="small" type="primary"
          @click="executeAction(action)">
          {{ action.buttonName }}
        </NButton>
      </div>
      <div class="actions-close">
        <NButton size="small" quaternary @click="tableState.checkedRowKeys.value = []">
          <template #icon>
            <NIcon>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path
                  d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  fill="currentColor" />
              </svg>
            </NIcon>
          </template>
        </NButton>
      </div>
    </div>

    <!-- 搜索表单区域 - 仅当没有显示自定义动作时展示 -->
    <div v-if="!showCustomActions" class="search-form-area">
      <NGrid :cols="24" x-gap="6" y-gap="6">
        <!-- 第一行：搜索字段 + 操作按钮（如果需要） -->
        <template v-for="item in firstRowFields" :key="item.label">
          <NGridItem :span="item.type === 'date-range' ? 8 : 4">
            <NFormItem :label="item.label" label-placement="left">
              <NInput v-if="item.type === 'input'" v-model:value="searchForm[item.key]" :placeholder="item.placeholder"
                size="small" clearable />
              <NSelect v-if="item.type === 'select'" v-model:value="searchForm[item.key]" :options="item.options"
                :placeholder="item.placeholder" size="small" />
              <NDatePicker v-if="item.type === 'date'" v-model:value="searchForm[item.key]" type="date"
                :placeholder="item.placeholder" size="small" clearable />
              <NDatePicker v-if="item.type === 'date-range'" v-model:value="searchForm[item.key]" type="daterange"
                :placeholder="item.placeholder" size="small" clearable />
            </NFormItem>
          </NGridItem>
        </template>

        <!-- 第一行的操作按钮（当折叠且字段超过5个时） -->
        <NGridItem v-if="showActionsInFirstRow" :span="8">
          <div class="action-buttons">
            <NSpace :size="8">
              <NButton v-if="hasEnabledSearchFields" type="primary" size="small" @click="handleSearch">查询</NButton>
              <NButton v-if="hasEnabledSearchFields" size="small" @click="resetSearch">重置</NButton>
              <NButton v-if="showExpandButton" size="small" @click="toggleExpand">
                <template #icon>
                  <NIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                      viewBox="0 0 24 24">
                      <path d="M18 6.41L16.59 5L12 9.58L7.41 5L6 6.41l6 6z" fill="currentColor"></path>
                      <path d="M18 13l-1.41-1.41L12 16.17l-4.59-4.58L6 13l6 6z" fill="currentColor"></path>
                    </svg>
                  </NIcon>
                </template>
              </NButton>
            </NSpace>
          </div>
        </NGridItem>

        <!-- 展开后的额外字段（第6个字段开始） -->
        <template v-if="expandedFields.length > 0">
          <template v-for="item in expandedFields" :key="item.key">
            <NGridItem :span="item.type === 'date-range' ? 8 : 4">
              <NFormItem :label="item.label" label-placement="left">
                <NInput v-if="item.type === 'input'" v-model:value="searchForm[item.key]"
                  :placeholder="item.placeholder" size="small" clearable />
                <NSelect v-if="item.type === 'select'" v-model:value="searchForm[item.key]" :options="item.options"
                  :placeholder="item.placeholder" size="small" />
                <NDatePicker v-if="item.type === 'date'" v-model:value="searchForm[item.key]" type="date"
                  :placeholder="item.placeholder" size="small" clearable />
                <NDatePicker v-if="item.type === 'date-range'" v-model:value="searchForm[item.key]" type="daterange"
                  :placeholder="item.placeholder" size="small" clearable />
              </NFormItem>
            </NGridItem>
          </template>
        </template>

        <!-- 展开状态下的操作按钮 -->
        <NGridItem v-if="expandedFields.length > 0" :span="4">
          <div class="action-buttons">
            <NSpace :size="8">
              <NButton v-if="hasEnabledSearchFields" type="primary" size="small" @click="handleSearch">查询</NButton>
              <NButton v-if="hasEnabledSearchFields" size="small" @click="resetSearch">重置</NButton>
              <NButton size="small" @click="toggleExpand">
                <template #icon>
                  <NIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                      viewBox="0 0 16 16">
                      <g fill="none">
                        <path
                          d="M4.26 8.3a.75.75 0 1 1-1.02-1.1l4.25-4a.75.75 0 0 1 1.02 0l4.25 4a.75.75 0 1 1-1.02 1.1L8 4.773L4.26 8.3zm0 4a.75.75 0 0 1-1.02-1.1l4.25-4a.75.75 0 0 1 1.02 0l4.25 4a.75.75 0 1 1-1.02 1.1L8 8.773L4.26 12.3z"
                          fill="currentColor"></path>
                      </g>
                    </svg>
                  </NIcon>
                </template>
              </NButton>
            </NSpace>
          </div>
        </NGridItem>

        <!-- 折叠状态下的操作按钮（当字段超过5个且折叠时） -->
        <NGridItem v-if="!isExpanded && showExpandButton" :span="8">
          <div class="action-buttons">
            <NSpace :size="8">
              <NButton v-if="hasEnabledSearchFields" type="primary" size="small" @click="handleSearch">查询</NButton>
              <NButton v-if="hasEnabledSearchFields" size="small" @click="resetSearch">重置</NButton>
              <NButton size="small" @click="toggleExpand">
                <template #icon>
                  <NIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
                      viewBox="0 0 24 24">
                      <path d="M18 6.41L16.59 5L12 9.58L7.41 5L6 6.41l6 6z" fill="currentColor"></path>
                      <path d="M18 13l-1.41-1.41L12 16.17l-4.59-4.58L6 13l6 6z" fill="currentColor"></path>
                    </svg>
                  </NIcon>
                </template>
              </NButton>
            </NSpace>
          </div>
        </NGridItem>

        <!-- 字段数量 <= 5 时的操作按钮 -->
        <NGridItem v-if="!showExpandButton && hasEnabledSearchFields" :span="4">
          <div class="action-buttons">
            <NSpace :size="8">
              <NButton type="primary" size="small" @click="handleSearch">查询</NButton>
              <NButton size="small" @click="resetSearch">重置</NButton>
            </NSpace>
          </div>
        </NGridItem>
      </NGrid>
    </div>

    <!-- ActionDialog 组件 -->
    <ActionDialog v-model:show="showActionDialog" :url="actionDialogUrl" :data="actionDialogData"
      @close="handleActionDialogClose" />
  </NCard>
</template>

<style scoped>
.search-card {
  margin-bottom: 12px;
  overflow: hidden;
  border-radius: 1rem;
  border-color: var(--kivii-table-border);
  background: var(--kivii-table-surface);
}

/* 自定义动作样式 */
.custom-actions {
  display: flex;
  align-items: center;
  background-color: var(--n-color-action);
  padding: 6px 12px;
  border: 1px solid var(--kivii-table-border);
  border-radius: 6px;
  margin-top: 8px;
  gap: 12px;
  animation: fadeIn 0.3s ease;
}

.selected-info {
  display: flex;
  align-items: center;
  white-space: nowrap;
}

.actions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
}

.actions-close {
  margin-left: auto;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 添加新样式 */
.add-view-button:hover {
  background-color: transparent !important;
  box-shadow: none !important;
}

.add-icon {
  transition: all 0.3s ease;
}

.add-view-button:hover .add-icon {
  transform: translateY(-6px) scale(1.5) !important;
}

.top-actions {
  display: flex;
  justify-content: flex-end;
  /* margin-bottom: 16px; */
  padding-bottom: 8px;
  /* border-bottom: 1px solid var(--n-border-color); */
}

.search-form-area {
  margin-top: 8px;
}

:deep(.n-form-item) {
  margin-bottom: 0;
}

:deep(.n-form-item-label) {
  width: 100px;
  justify-content: flex-end;
  padding-right: 8px;
  font-size: 14px;
  color: var(--n-text-color-2);
  align-items: flex-start;
  display: flex;
  height: 28px;
  padding-top: 5px;
}

:deep(.n-form-item-label label) {
  line-height: 1;
  margin: 0;
}

.n-date-picker.n-date-picker--range {
  width: 100%;
}

:deep(.n-form-item-blank) {
  min-height: 28px;
}

:deep(.n-input) {
  --n-height: 28px;
}

:deep(.n-select) {
  --n-height: 28px;
}

:deep(.n-date-picker) {
  --n-height: 28px;
}

:deep(.n-form-item-feedback-wrapper) {
  display: none;
}

:deep(.n-card__content) {
  padding: 12px !important;
}

.action-buttons {
  margin-left: 0px;
  /* 100px label宽度 + 8px padding-right */
  height: 28px;
  display: flex;
  align-items: center;
}

/* 标签页中的下拉菜单样式 */
.tab-with-dropdown {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tab-with-dropdown .n-button {
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.tab-with-dropdown:hover .n-button {
  opacity: 1;
}

/* 确保下拉按钮不会影响标签页选择 */
:deep(.n-tabs-tab) {
  position: relative;
}

:deep(.n-tabs-tab .tab-with-dropdown .n-button) {
  position: relative;
  z-index: 10;
}
</style>
