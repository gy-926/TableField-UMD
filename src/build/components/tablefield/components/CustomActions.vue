<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import ActionDialog from './ActionDialog.vue';

// 从主组件注入状态和方法
const tableState: any = inject('tableState');
const tableMethods: any = inject('tableMethods', {});

// 获取表格数据和选中行
const { tableData, checkedRowKeys, viewsConfig, currentViewIndex, customActions } = tableState;

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

// 本地动作状态管理（类似 SearchFieldSettings 的 localFieldVisibility）
const localActionStates = ref(new Map());

// 操作类型选项
const operationTypeOptions = [
  { label: '单选', value: 'single' },
  { label: '多选', value: 'multiple' }
];

// 动作类型选项
const actionTypeOptions = [
  { label: 'dialog弹窗', value: 'dialog' },
  { label: '外标签打开', value: 'external_tab' },
  { label: '内标签打开', value: 'internal_tab' }
];

// 请求参数选项 - 基于原始表格数据的所有字段，只过滤 Metadata 字段
const requestParamsOptions = computed(() => {
  if (!tableData.value || tableData.value.length === 0) return [];

  // 从第一行数据中获取所有字段
  const firstRow = tableData.value[0];
  if (!firstRow) return [];

  // 获取所有字段名，只过滤掉 Metadata 字段，保留 Kvid 和其他字段
  const fieldKeys = Object.keys(firstRow).filter(key => key !== 'Metadata');

  return fieldKeys.map(key => ({
    label: key, // 使用字段名作为显示标签
    value: key
  }));
});

// 根据操作类型获取对应的标签
const getOperationTypeLabel = (type: string) => {
  const typeOption = operationTypeOptions.find(option => option.value === type);
  return typeOption ? typeOption.label : type;
};

// 根据动作类型获取对应的标签
const getActionTypeLabel = (type: string) => {
  const typeOption = actionTypeOptions.find(option => option.value === type);
  return typeOption ? typeOption.label : type;
};

// 根据请求参数值获取对应的标签
const getRequestParamsLabel = (values: string[]) => {
  if (!values || values.length === 0) return '';

  const labels = values.map(value => {
    const paramOption = requestParamsOptions.value.find(option => option.value === value);
    return paramOption ? paramOption.label : value;
  });

  return labels.join(', ');
};

// 同步动作到视图配置
const syncActionsToViewConfig = () => {
  if (!viewsConfig?.value || !Array.isArray(viewsConfig.value) || currentViewIndex?.value === null) {
    // console.log('CustomActions - 无法同步到视图配置，配置不存在');
    return;
  }

  const currentView = viewsConfig.value[currentViewIndex.value];
  if (!currentView) {
    // console.log('CustomActions - 当前视图不存在');
    return;
  }

  // 确保视图配置结构存在
  if (!currentView.config) {
    currentView.config = {};
  }
  if (!currentView.config.customActionSettings) {
    currentView.config.customActionSettings = {};
  }

  // 更新视图配置中的自定义动作
  currentView.config.customActionSettings.customActions = [...customActions.value];
  // console.log('CustomActions - 已同步到视图配置，动作数量:', customActions.value.length);
};

// 更新动作状态
const updateActionState = (action: any, _actionIndex: number, newState: any) => {
  Object.assign(action, newState);
  // console.log('CustomActions - 动作状态已更新:', action.buttonName);

  // 同步到视图配置
  syncActionsToViewConfig();
};

// 初始化默认动作
const initDefaultActions = () => {
  // console.log('CustomActions - 初始化默认动作');

  // 清空现有动作
  customActions.value = [];

  // 添加默认动作
  const defaultActions = [
    {
      buttonName: '导出选中',
      enabled: true,
      operationType: 'multiple',
      operationTypeLabel: '多选',
      actionType: 'external_tab',
      actionTypeLabel: '外标签打开',
      url: '/export',
      requestParams: [],
      requestParamsLabel: '',
      buttonDescription: '导出选中的数据'
    },
    {
      buttonName: '批量处理',
      enabled: true,
      operationType: 'multiple',
      operationTypeLabel: '多选',
      actionType: 'dialog',
      actionTypeLabel: 'dialog弹窗',
      url: '/batch',
      requestParams: [],
      requestParamsLabel: '',
      buttonDescription: '批量处理选中的数据'
    },
    {
      buttonName: '查看详情',
      enabled: true,
      operationType: 'single',
      operationTypeLabel: '单选',
      actionType: 'internal_tab',
      actionTypeLabel: '内标签打开',
      url: '/detail',
      requestParams: [],
      requestParamsLabel: '',
      buttonDescription: '查看选中项的详细信息'
    }
  ];

  customActions.value = defaultActions;
  // console.log('CustomActions - 已添加默认动作:', customActions.value.length, '个');

  // 同步到视图配置
  syncActionsToViewConfig();
};

// 从视图配置加载自定义动作
const loadCustomActionsFromViewConfig = () => {
  try {
    // console.log('CustomActions - 开始从视图配置加载自定义动作');

    // 检查视图配置是否有效
    if (!viewsConfig?.value || !Array.isArray(viewsConfig.value) || currentViewIndex?.value === null) {
      // console.log('CustomActions - 视图配置无效，初始化默认动作');
      initDefaultActions();
      return;
    }

    const currentView = viewsConfig.value[currentViewIndex.value];
    if (!currentView) {
      // console.log('CustomActions - 当前视图不存在，初始化默认动作');
      initDefaultActions();
      return;
    }

    // console.log('CustomActions - 当前视图名称:', currentView.name);

    // 获取自定义动作配置
    const customActionSettings = currentView.config?.customActionSettings;
    if (!customActionSettings?.customActions || !Array.isArray(customActionSettings.customActions)) {
      // console.log('CustomActions - 视图配置中没有自定义动作，初始化默认动作');
      initDefaultActions();
      return;
    }

    // 加载配置中的自定义动作
    const actionsFromConfig = customActionSettings.customActions;
    // console.log('CustomActions - 从视图配置加载动作，数量:', actionsFromConfig.length);

    // 确保每个动作都有必要的标签字段
    customActions.value = actionsFromConfig.map((action: any) => ({
      ...action,
      operationTypeLabel: action.operationTypeLabel || getOperationTypeLabel(action.operationType),
      actionTypeLabel: action.actionTypeLabel || getActionTypeLabel(action.actionType),
      requestParamsLabel: action.requestParamsLabel || getRequestParamsLabel(action.requestParams)
    }));

    // console.log('CustomActions - 成功加载自定义动作配置');
  } catch (error) {
    // console.error('CustomActions - 从视图配置加载失败:', error);
    initDefaultActions();
  }
};

// 初始化本地状态
const initializeLocalState = () => {
  const actionStatesMap = new Map();
  customActions.value.forEach((action: any, index: number) => {
    actionStatesMap.set(index, {
      enabled: action.enabled,
      buttonName: action.buttonName,
      operationType: action.operationType,
      actionType: action.actionType,
      url: action.url,
      requestParams: action.requestParams,
      buttonDescription: action.buttonDescription
    });
  });
  localActionStates.value = actionStatesMap;
  // console.log('CustomActions - 初始化本地状态，动作数量:', customActions.value.length);
};

// 防抖的动作更新函数
const debouncedActionUpdate = debounce((actionIndex: number, newState: any) => {
  const action = customActions.value[actionIndex];
  if (action) {
    updateActionState(action, actionIndex, newState);
  }
}, 300);

// 本地动作状态切换处理
const handleLocalActionChange = (actionIndex: number, field: string, value: any) => {
  // 立即更新本地状态
  const currentState = localActionStates.value.get(actionIndex) || {};
  const newState = { ...currentState, [field]: value };
  localActionStates.value.set(actionIndex, newState);

  // 防抖更新父组件状态
  debouncedActionUpdate(actionIndex, newState);
};

// 监听customActions变化，同步到本地状态
watch(
  customActions,
  () => {
    initializeLocalState();
  },
  { immediate: true, deep: true }
);

// 移除视图配置监听器，避免与主组件的状态更新冲突
// 现在完全依赖主组件的 customActions 状态，通过 applyCustomActionSettings 进行更新

// 监听选中行变化
watch(
  () => checkedRowKeys?.value,
  newKeys => {
    // console.log('CustomActions - 选中行变化:', newKeys);
    // const count = newKeys?.length || 0;
    // console.log('CustomActions - 选中行数量:', count);
  },
  { deep: true, immediate: true }
);

// 同步自定义动作到状态（保持向后兼容）
const syncCustomActions = () => {
  // console.log('CustomActions - 同步自定义动作完成，总数:', customActions.value.length);
  syncActionsToViewConfig();
  return true;
};

// 加载自定义动作配置（保持向后兼容）
const loadCustomActions = async () => {
  try {
    // console.log('CustomActions - 开始加载自定义动作配置');
    loadCustomActionsFromViewConfig();
    return true;
  } catch (error) {
    // console.error('CustomActions - 获取自定义动作配置失败:', error);
    initDefaultActions();
    return true;
  }
};

// 在组件挂载时初始化本地状态（不主动加载配置，等待主组件状态更新）
onMounted(async () => {
  // console.log('CustomActions - 组件挂载，初始化本地状态');
  initializeLocalState();
});

// 计算当前选中行数量
const selectedRowCount = computed(() => {
  const count = checkedRowKeys?.value?.length || 0;
  // console.log('CustomActions - 计算选中行数量:', count);
  return count;
});

// 判断是否有选中行
const hasSelectedRows = computed(() => {
  const hasRows = selectedRowCount.value > 0;
  // console.log('CustomActions - 是否有选中行:', hasRows);
  return hasRows;
});

// 判断是否是单选状态（只选中了一行）
const isSingleSelection = computed(() => {
  return selectedRowCount.value === 1;
});

// 判断是否是多选状态（选中了多行）
const isMultipleSelection = computed(() => {
  return selectedRowCount.value > 1;
});

// 计算是否有可用的自定义动作
const hasEnabledActions = computed(() => {
  return customActions.value.some((action: any) => action.enabled);
});

// 根据选中行数量获取可显示的动作
const visibleActions = computed(() => {
  // 如果没有选中行，不显示任何动作
  if (selectedRowCount.value === 0) {
    return [];
  }

  // 过滤出启用的动作
  return customActions.value.filter((action: any) => {
    // 首先检查动作是否启用
    if (!action.enabled) return false;

    // 单选动作：只有当选中一行时显示
    if (action.operationType === 'single') {
      return selectedRowCount.value === 1;
    }

    // 多选动作：只有当选中多行时显示
    if (action.operationType === 'multiple') {
      return selectedRowCount.value > 1;
    }

    // 如果没有指定操作类型，默认显示
    return true;
  });
});

// 编辑状态管理
const editingAction = ref<any>(null);
const showEditDialog = ref(false);

// ActionDialog 状态管理
const showActionDialog = ref(false);
const actionDialogUrl = ref('');
const actionDialogData = ref<any>(null);

// 编辑表单数据
const editForm = ref<{
  buttonName: string;
  enabled: boolean;
  operationType: string;
  actionType: string;
  url: string;
  requestParams: string[];
  buttonDescription: string;
}>({
  buttonName: '',
  enabled: true,
  operationType: 'single',
  actionType: 'dialog',
  url: '',
  requestParams: [],
  buttonDescription: ''
});

// 添加新的自定义动作
const addCustomAction = () => {
  editingAction.value = null;
  editForm.value = {
    buttonName: '',
    enabled: true,
    operationType: 'single',
    actionType: 'dialog',
    url: '',
    requestParams: [],
    buttonDescription: ''
  };
  showEditDialog.value = true;
};

// 编辑自定义动作
const editCustomAction = (action: any) => {
  editingAction.value = action;
  editForm.value = {
    buttonName: action.buttonName,
    enabled: action.enabled,
    operationType: action.operationType,
    actionType: action.actionType,
    url: action.url,
    requestParams: action.requestParams,
    buttonDescription: action.buttonDescription
  };
  showEditDialog.value = true;
};

// 删除自定义动作
const removeCustomAction = async (index: number) => {
  customActions.value.splice(index, 1);

  // 同步到视图配置
  syncActionsToViewConfig();

  // 重新初始化本地状态
  initializeLocalState();
};

// 验证自定义动作
const validateCustomAction = () => {
  if (!editForm.value.buttonName.trim()) {
    window.$message?.error('请输入按钮名称');
    return false;
  }

  if (!editForm.value.operationType) {
    window.$message?.error('请选择操作类型');
    return false;
  }

  if (!editForm.value.actionType) {
    window.$message?.error('请选择动作类型');
    return false;
  }

  if (!editForm.value.url.trim()) {
    window.$message?.error('请输入URL地址');
    return false;
  }

  return true;
};

// 保存自定义动作
const saveCustomAction = async () => {
  if (!validateCustomAction()) {
    return;
  }

  const actionData = {
    buttonName: editForm.value.buttonName.trim(),
    enabled: editForm.value.enabled,
    operationType: editForm.value.operationType,
    operationTypeLabel: getOperationTypeLabel(editForm.value.operationType),
    actionType: editForm.value.actionType,
    actionTypeLabel: getActionTypeLabel(editForm.value.actionType),
    url: editForm.value.url.trim(),
    requestParams: editForm.value.requestParams,
    requestParamsLabel: getRequestParamsLabel(editForm.value.requestParams),
    buttonDescription: editForm.value.buttonDescription.trim()
  };

  if (editingAction.value) {
    // 编辑模式：替换现有动作
    const index = customActions.value.findIndex((action: any) => action === editingAction.value);
    if (index !== -1) {
      customActions.value[index] = actionData;
    }
  } else {
    // 新增模式：添加新动作
    customActions.value.push(actionData);
  }

  // 同步到视图配置
  syncActionsToViewConfig();

  showEditDialog.value = false;
  editingAction.value = null;
};

// 取消编辑
const cancelEdit = () => {
  showEditDialog.value = false;
  editingAction.value = null;
};

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

// 构建单选参数
const buildSingleSelectionParams = (action: any, queryParams: string[]) => {
  const selectedItem = tableData.value.find((row: any) => checkedRowKeys.value.includes(row.Kvid));
  if (selectedItem) {
    action.requestParams.forEach((param: any) => {
      if (selectedItem[param] !== undefined && selectedItem[param] !== null) {
        const paramValue = encodeURIComponent(selectedItem[param]);
        queryParams.push(`${param}=${paramValue}`);
      }
    });
  }
};

// 构建多选参数
const buildMultiSelectionParams = (action: any, queryParams: string[]) => {
  const selectedItems = tableData.value.filter((row: any) => checkedRowKeys.value.includes(row.Kvid));
  action.requestParams.forEach((param: any) => {
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

// 构建带动作参数的URL
const buildUrlWithActionParams = (action: any, baseUrl: string) => {
  if (!action.requestParams || action.requestParams.length === 0 || !tableData.value || tableData.value.length === 0) {
    return baseUrl;
  }

  const queryParams: string[] = [];

  // 根据操作类型处理参数
  if (action.operationType === 'single') {
    buildSingleSelectionParams(action, queryParams);
  } else {
    buildMultiSelectionParams(action, queryParams);
  }

  // 构建最终URL
  if (queryParams.length > 0) {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${queryParams.join('&')}`;
  }

  return baseUrl;
};

// 构建动作URL
const buildActionUrl = (action: any) => {
  let finalUrl = action.url;
  // 如果URL是.vue文件且有请求参数，则添加查询字符串
  if (action.url.endsWith('.vue') && action.requestParams && action.requestParams.length > 0) {
    finalUrl = buildUrlWithParams(action.url, action.requestParams);
    // console.log('构建的URL:', finalUrl);
  }
  return finalUrl;
};

// 执行Dialog弹窗动作
const executeDialogAction = (action: any, finalUrl: string) => {
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

// 执行外标签打开动作
const executeExternalTabAction = async (action: any, finalUrl: string) => {
  // 构建带参数的URL用于外标签打开
  const externalUrl = buildUrlWithActionParams(action, finalUrl);
  // console.log('外标签打开URL:', externalUrl);
  window.open(externalUrl, '_blank');
  window.$message?.success('已在新标签页打开');
};

// 执行内标签打开动作
const executeInternalTabAction = async (action: any, finalUrl: string) => {
  // 构建带参数的URL用于内标签打开
  const internalUrl = buildUrlWithActionParams(action, finalUrl);
  console.log('内标签打开URL:', internalUrl);

  // 使用自定义路由方法跳转
  try {
    (window as any).$routerPush.routerPush(internalUrl);
    window.$message?.success('已跳转到目标页面');
    console.log('内标签打开URL:', internalUrl);
  } catch (error) {
    // console.error('内标签跳转失败:', error);
    window.$message?.error('内标签跳转失败');
  }
};

// 执行自定义动作
const executeAction = async (action: any) => {
  if (!action.enabled) {
    window.$message?.warning('该动作已禁用');
    return;
  }

  try {
    // console.log('执行自定义动作:', action);
    const finalUrl = buildActionUrl(action);

    // 根据动作类型执行不同的逻辑
    if (action.actionType === 'dialog') {
      executeDialogAction(action, finalUrl);
    } else if (action.actionType === 'external_tab') {
      await executeExternalTabAction(action, finalUrl);
    } else if (action.actionType === 'internal_tab') {
      await executeInternalTabAction(action, finalUrl);
    }
  } catch (error) {
    // console.error('动作执行失败:', error);
    window.$message?.error('动作执行失败');
  }
};

// 获取单选类型且启用的自定义动作
const getSingleSelectActions = computed(() =>
  customActions.value.filter((action: any) => action.enabled && action.operationType === 'single')
);

// 导出给父组件使用
defineExpose({
  getSingleSelectActions,
  executeAction,
  customActions,
  loadCustomActions,
  syncCustomActions,
  selectedRowCount,
  hasSelectedRows,
  hasEnabledActions,
  visibleActions,
  isSingleSelection,
  isMultipleSelection,
  initDefaultActions,
  // 新增：导出本地状态管理相关方法
  localActionStates,
  handleLocalActionChange,
  initializeLocalState,
  loadCustomActionsFromViewConfig
});

defineOptions({
  name: 'CustomActions'
});
</script>

<template>
  <div>
    <div class="action-config-header">
      <span>自定义动作配置</span>
      <div class="header-actions">
        <NButton size="small" type="primary" @click="addCustomAction">添加动作</NButton>
      </div>
    </div>

    <div class="action-rules-list">
      <NScrollbar style="max-height: calc(100vh - 200px)">
        <div class="action-rules-container">
          <div v-for="(action, index) in customActions" :key="index" class="action-rule-item">
            <div class="rule-item-content">
              <div class="rule-main-info">
                <span class="rule-field-label">{{ action.buttonName }}</span>
                <NSwitch :value="localActionStates.get(index)?.enabled ?? action.enabled" size="small"
                  class="enable-switch" @update:value="val => handleLocalActionChange(Number(index), 'enabled', val)" />
              </div>
              <div class="rule-sub-info">
                <span class="rule-type">{{ action.operationTypeLabel }}</span>
                <span class="rule-config">{{ action.actionTypeLabel }}</span>
                <span v-if="action.requestParamsLabel && action.requestParamsLabel.length > 0" class="rule-params">
                  参数: {{ action.requestParamsLabel }}
                </span>
                <span v-if="action.buttonDescription" class="rule-description">{{ action.buttonDescription }}</span>
              </div>
            </div>

            <div class="rule-item-right">
              <!--<NButton size="small" type="primary" :disabled="!action.enabled" @click="executeAction(action)">-->
              <!--  {{ action.buttonName }}-->
              <!--</NButton>-->
              <NButton text @click="editCustomAction(action)">
                <template #icon>
                  <NIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                        fill="currentColor" />
                    </svg>
                  </NIcon>
                </template>
              </NButton>
              <NButton text @click="removeCustomAction(Number(index))">
                <template #icon>
                  <NIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                        fill="currentColor" />
                    </svg>
                  </NIcon>
                </template>
              </NButton>
            </div>
          </div>

          <div v-if="customActions.length === 0" class="empty-state">
            <span>暂无自定义动作</span>
            <NButton size="small" type="primary" @click="addCustomAction">添加第一个自定义动作</NButton>
          </div>
        </div>
      </NScrollbar>
    </div>

    <!-- 编辑对话框 -->
    <NModal v-model:show="showEditDialog" preset="card" :title="editingAction ? '编辑自定义动作' : '添加自定义动作'"
      style="width: 600px" :mask-closable="false">
      <div class="edit-form">
        <div class="form-item">
          <label>按钮名称</label>
          <NInput v-model:value="editForm.buttonName" placeholder="请输入按钮名称" />
        </div>

        <div class="form-item">
          <label>是否启用</label>
          <NSwitch v-model:value="editForm.enabled">
            <template #checked>启用</template>
            <template #unchecked>禁用</template>
          </NSwitch>
        </div>

        <div class="form-item">
          <label>操作类型</label>
          <NSelect v-model:value="editForm.operationType" :options="operationTypeOptions" placeholder="请选择操作类型" />
        </div>

        <div class="form-item">
          <label>动作类型</label>
          <NSelect v-model:value="editForm.actionType" :options="actionTypeOptions" placeholder="请选择动作类型" />
        </div>

        <div class="form-item">
          <label>URL地址</label>
          <NInput v-model:value="editForm.url" placeholder="请输入URL地址" />
        </div>

        <div class="form-item">
          <label>请求参数</label>
          <NSelect v-model:value="editForm.requestParams" :options="requestParamsOptions" placeholder="请选择请求参数" multiple
            clearable />
        </div>

        <div class="form-item">
          <label>按钮说明</label>
          <NInput v-model:value="editForm.buttonDescription" type="textarea" :rows="3" placeholder="请输入按钮说明" />
        </div>
      </div>

      <template #action>
        <div class="dialog-actions">
          <NButton @click="cancelEdit">取消</NButton>
          <NButton type="primary" @click="saveCustomAction">保存</NButton>
        </div>
      </template>
    </NModal>

    <!-- ActionDialog 组件 -->
    <ActionDialog v-model:show="showActionDialog" :url="actionDialogUrl" :data="actionDialogData"
      @close="handleActionDialogClose" />
  </div>
</template>

<style scoped>
.action-config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px 12px;
  border-bottom: 1px solid var(--n-border-color);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-rules-container {
  padding: 8px 0;
}

.action-rule-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--n-border-color);
  contain: layout style paint;
  will-change: transform;
}

.rule-item-content {
  flex: 1;
  margin-right: 12px;
}

.rule-main-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.rule-field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
}

.enable-switch {
  margin-left: 12px;
}

.rule-sub-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rule-type {
  font-size: 12px;
  color: var(--n-primary-color);
}

.rule-config {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.rule-params {
  font-size: 12px;
  color: var(--n-warning-color);
  font-weight: 500;
}

.rule-description {
  font-size: 12px;
  color: var(--n-text-color-2);
  font-style: italic;
}

.rule-item-right {
  display: flex;
  gap: 8px;
  align-items: center;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.action-rule-item:hover .rule-item-right {
  opacity: 1;
}

.empty-state {
  text-align: center;
  padding: 40px 16px;
  color: var(--n-text-color-3);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-item label {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 自定义滚动条样式 */
:deep(.n-scrollbar-rail) {
  right: 2px;
}

:deep(.n-scrollbar-rail__scrollbar) {
  width: 6px;
  border-radius: 3px;
}
</style>