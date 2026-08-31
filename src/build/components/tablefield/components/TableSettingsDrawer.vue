<script setup lang="ts">
import { inject, ref, watch } from 'vue';
import axios, { type AxiosInstance } from 'axios';
import TableBasicSettings from './TableBasicSettings.vue';
import ColumnSettings from './ColumnSettings.vue';
import SearchFieldSettings from './SearchFieldSettings.vue';
import DataTransform from './DataTransform.vue';
import DialogSettings from './DialogSettings.vue';
import CustomActions from './CustomActions.vue';

defineOptions({
  name: 'TableSettingsDrawer'
});

const httpClient = inject<AxiosInstance>('httpClient', axios);
const mockMode = inject<any>('mockMode', ref(false));
const tableApi: any = inject('tableApi');

// 从主组件注入状态和方法
const tableState: any = inject('tableState');
const tableMethods: any = inject('tableMethods');

// 添加视图管理相关的状态
const viewsConfig = ref<Array<{ id: string; name: string; config: any }>>([]);
const currentViewIndex = ref(0);

// 添加CustomActions组件的引用
const customActionsRef = ref();

// 提供视图配置给全局状态
tableState.viewsConfig = viewsConfig;
tableState.currentViewIndex = currentViewIndex;

// 将CustomActions引用传递给全局状态
tableState.customActionsRef = customActionsRef;

const {
  showSettingDrawer,
  activeTab,
  tableSize,
  showBorder,
  showStripe,
  enableSingleSelect,
  showActionColumn,
  firstColumnType,
  tableHeight,
  tableScrollWidth,
  visibleColumns,
  searchFields,
  formItems,
  uiConfig
} = tableState;

// 视图名称编辑状态
const currentViewName = ref(uiConfig?.InternalCode || '表格设置');
const isEditingViewName = ref(false);
const tempViewName = ref('');

// 添加弹出框设置状态
const dialogWidth = ref('90%');
const dialogHeight = ref('auto');
const editDialogWidth = ref('90%');
const editDialogHeight = ref('auto');

// 图标选择状态
const showIconModal = ref(false);
const iconType = ref('fontawesome'); // 'fontawesome', 'image'
const currentIcon = ref('fa fa-table'); // 默认表格图标
const tempIconType = ref('fontawesome');
const tempIconContent = ref('');

// 分类菜单结构
const menuCategories = [
  {
    title: '表格设置',
    key: 'table-group',
    children: [
      {
        key: 'table',
        label: '表格设置',
        icon: 'M3,3H21V5H3V3M3,7H21V9H3V7M3,11H21V13H3V11M3,15H21V17H3V15M3,19H21V21H3V19Z'
      }
    ]
  },
  {
    title: '视图设置',
    key: 'view-group',
    children: [
      {
        key: 'columns',
        label: '显示字段',
        icon: 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z'
      },
      {
        key: 'dialog',
        label: '弹出框设置',
        icon: 'M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z M11,7H13V9H15V11H13V13H11V11H9V9H11V7Z'
      }
    ]
  },
  {
    title: '用户操作',
    key: 'user-group',
    children: [
      {
        key: 'buttons',
        label: '搜索配置',
        icon: 'M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z'
      },
      {
        key: 'custom',
        label: '自定义动作',
        icon: 'M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,6H13V14H11V6M11,16H13V18H11V16Z'
      }
    ]
  },
  {
    title: '数据设置',
    key: 'data-group',
    children: [
      {
        key: 'transform',
        label: '数据转换',
        icon: 'M5,3C3.89,3 3,3.89 3,5V19C3,20.11 3.89,21 5,21H11V19H5V5H19V11H21V5C21,3.89 20.11,3 19,3H5M18.78,14.37L17.96,13.55L16.27,15.24L15.55,14.52L14.84,15.23L16.97,17.36L18.78,14.37M21.34,15.84L20.63,15.13L19.69,16.07L18.75,15.13L18.04,15.84L18.98,16.78L18.04,17.72L18.75,18.43L19.69,17.5L20.63,18.43L21.34,17.72L20.41,16.78L21.34,15.84Z'
      }
    ]
  }
];

// 开始编辑视图名称
const startEditViewName = () => {
  tempViewName.value = currentViewName.value;
  isEditingViewName.value = true;
};

// 保存视图名称
const saveViewName = () => {
  if (tempViewName.value.trim() !== '') {
    currentViewName.value = tempViewName.value.trim();
    // 更新视图配置
    if (viewsConfig.value[currentViewIndex.value]) {
      viewsConfig.value[currentViewIndex.value].name = currentViewName.value;
      // 同步更新全局视图配置
      if (tableState.viewsConfig) {
        tableState.viewsConfig.value = [...viewsConfig.value];
      }
    }
  }
  isEditingViewName.value = false;
};

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    saveViewName();
  } else if (e.key === 'Escape') {
    isEditingViewName.value = false;
  }
};

// 图标选择相关方法
const openIconModal = () => {
  tempIconType.value = iconType.value || 'fontawesome'; // 确保有默认值
  tempIconContent.value = currentIcon.value || '';
  showIconModal.value = true;
};

const closeIconModal = () => {
  showIconModal.value = false;
  tempIconType.value = 'fontawesome'; // 重置为默认值
  tempIconContent.value = '';
};

const saveIcon = () => {
  if (tempIconContent.value.trim()) {
    iconType.value = tempIconType.value;
    currentIcon.value = tempIconContent.value.trim();
    showIconModal.value = false;
    window.$message?.success('图标已更新');
  } else {
    window.$message?.warning('请输入图标内容');
  }
};

// 监听图标类型切换，清空输入框内容
watch(tempIconType, (newType, oldType) => {
  if (newType !== oldType && showIconModal.value) {
    tempIconContent.value = '';
  }
});

// 监听当前视图索引变化，更新视图名称
watch(currentViewIndex, newIndex => {
  if (viewsConfig.value && viewsConfig.value[newIndex]) {
    currentViewName.value = viewsConfig.value[newIndex].name;
    console.log('✅ TableSettingsDrawer: 视图索引变化，更新视图名称为:', currentViewName.value);
  }
});

// 使用主题色
const themeColor = ref('#18a058')

// 添加标签页延迟加载状态
const tabLoadingStates = ref({
  table: true, // 默认标签页立即加载
  columns: false,
  buttons: false,
  transform: false,
  dialog: false,
  custom: false
});

// 选择菜单项
const selectMenuItem = (key: string) => {
  const previousValue = activeTab.value;
  activeTab.value = key;
  // 加载对应的标签页内容
  if (previousValue !== key) {
    setTimeout(() => {
      tabLoadingStates.value[key as keyof typeof tabLoadingStates.value] = true;
    }, 100);
  }
};

// 获取所有设置信息
const getAllSettings = () => {
  // 获取列编辑配置
  const columnConfigs = tableState.rawColumns.value.map((column: any, index: number) => ({
    key: column.key,
    title: column.title,
    titleAlign: column.titleAlign,
    align: column.align,
    sortable: column.sortable,
    filter: column.filter,
    filterOptions: column.filterOptions,
    ellipsis: column.ellipsis,
    width: column.width,
    minWidth: column.minWidth,
    maxWidth: column.maxWidth,
    fixed: column.fixed,
    resizable: column.resizable,
    order: index // 保存列的排序顺序
  }));

  // 获取搜索字段配置
  const searchFieldConfigs = tableState.searchFields.value.map((field: any) => ({
    key: field.key,
    label: field.label,
    type: field.type,
    visible: field.visible,
    defaultValue: field.defaultValue,
    placeholder: field.placeholder,
    options: field.options,
    order: field.order
  }));

  // 获取数据转换配置
  const transformConfigs = {
    // 保存转换规则
    transformRules: tableState.transformRules.value,
    // 保存标签映射
    tagMappings: tableState.tagMappings.value,
    // 保存字段转换配置
    transformConfigurations: tableState.transformConfigurations.value,
    // 保存列的自定义渲染函数配置
    columnRenderConfigs: tableState.rawColumns.value
      // eslint-disable-next-line no-underscore-dangle
      .filter((column: any) => column.__originalRender)
      .map((column: any) => ({
        key: column.key,
        hasCustomRender: true
      }))
  };

  // 获取自定义动作配置
  let customActionConfigs: Array<Record<string, any>> = [];
  if (tableState.customActions && tableState.customActions.value) {
    // console.log('✅ TableSettingsDrawer: 获取自定义动作配置，总数:', tableState.customActions.value.length);
    customActionConfigs = [...tableState.customActions.value];
  } else {
    // console.log('⚠️ TableSettingsDrawer: 无法获取自定义动作配置，使用空数组');
  }

  return {
    // 视图设置 - 包含标题和图标信息
    viewSettings: {
      viewName: currentViewName.value,
      iconType: iconType.value,
      currentIcon: currentIcon.value
    },
    // 表格基本设置
    tableSettings: {
      tableSize: tableSize.value,
      showBorder: showBorder.value,
      showStripe: showStripe.value,
      enableSingleSelect: enableSingleSelect.value,
      showActionColumn: showActionColumn.value,
      firstColumnType: firstColumnType.value,
      tableHeight: tableHeight.value,
      tableScrollWidth: tableScrollWidth.value
    },
    // 弹出框设置
    dialogSettings: {
      dialogWidth: dialogWidth.value,
      dialogHeight: dialogHeight.value,
      editDialogWidth: editDialogWidth.value,
      editDialogHeight: editDialogHeight.value
    },
    // 列设置
    columnSettings: {
      visibleColumns: visibleColumns.value,
      columnConfigs,
      columnOrder: tableState.rawColumns.value.map((col: any) => col.key) // 保存列的顺序
    },
    // 搜索设置
    searchSettings: {
      searchFields: searchFields.value,
      formItems: formItems.value,
      searchFieldConfigs
    },
    // 数据转换设置
    transformSettings: transformConfigs,
    // 自定义动作设置
    customActionSettings: {
      customActions: customActionConfigs
    }
  };
};

// 拆分的辅助函数
const applyViewSettings = (settings: any) => {
  if (settings.viewSettings) {
    currentViewName.value = settings.viewSettings.viewName || uiConfig?.InternalCode || '表格设置';
    // console.log('✅ 配置恢复：视图名称设置为', currentViewName.value);

    // 恢复图标设置
    iconType.value = settings.viewSettings.iconType || 'fontawesome';
    currentIcon.value = settings.viewSettings.currentIcon || 'fa fa-table';
    // console.log('✅ 配置恢复：图标设置已恢复');
  }
};

const applyTableSettings = (settings: any) => {
  if (!settings.tableSettings) return;

  tableSize.value = settings.tableSettings.tableSize;
  showBorder.value = settings.tableSettings.showBorder;
  showStripe.value = settings.tableSettings.showStripe;
  enableSingleSelect.value = settings.tableSettings.enableSingleSelect;
  showActionColumn.value = settings.tableSettings.showActionColumn ?? true;
  firstColumnType.value = settings.tableSettings.firstColumnType || 'checkbox';

  tableHeight.value = settings.tableSettings.tableHeight;
  tableScrollWidth.value = settings.tableSettings.tableScrollWidth;
};

const applyColumnSettings = (settings: any) => {
  if (!settings.columnSettings) return;

  visibleColumns.value = settings.columnSettings.visibleColumns;

  if (settings.columnSettings.columnOrder) {
    const orderedColumns: any[] = [];
    settings.columnSettings.columnOrder.forEach((key: any) => {
      const column = tableState.rawColumns.value.find((col: any) => col.key === key);
      if (column) orderedColumns.push(column);
    });

    tableState.rawColumns.value.forEach((column: any) => {
      if (!settings.columnSettings.columnOrder.includes(column.key)) {
        orderedColumns.push(column);
      }
    });

    tableState.rawColumns.value = orderedColumns;
  }

  if (settings.columnSettings.columnConfigs) {
    tableState.rawColumns.value = tableState.rawColumns.value.map((column: any) => {
      const config = settings.columnSettings.columnConfigs.find((c: any) => c.key === column.key);
      return config ? { ...column, ...config } : column;
    });
  }
};

const applySearchSettings = (settings: any) => {
  if (!settings.searchSettings) return;

  searchFields.value = settings.searchSettings.searchFields;
  if (settings.searchSettings.searchFieldConfigs) {
    tableState.searchFields.value = settings.searchSettings.searchFieldConfigs;
  }
  if (tableMethods.updateFormItems) {
    tableMethods.updateFormItems();
  }
};

const applyTransformSettings = (settings: any) => {
  if (!settings.transformSettings) return;

  if (settings.transformSettings.transformRules) {
    tableState.transformRules.value = settings.transformSettings.transformRules;
  }
  if (settings.transformSettings.tagMappings) {
    tableState.tagMappings.value = settings.transformSettings.tagMappings;
  }
  if (settings.transformSettings.transformConfigurations) {
    tableState.transformConfigurations.value = settings.transformSettings.transformConfigurations;
  }

  // Call once after all configs are restored
  if (settings.transformSettings.transformRules?.length > 0) {
    tableMethods.updateTransformedColumnRenders();
  }
};

// 添加应用弹出框设置的方法
const applyDialogSettings = (settings: any) => {
  if (!settings.dialogSettings) return;

  dialogWidth.value = settings.dialogSettings.dialogWidth || '90%';
  dialogHeight.value = settings.dialogSettings.dialogHeight || 'auto';
  editDialogWidth.value = settings.dialogSettings.editDialogWidth || '90%';
  editDialogHeight.value = settings.dialogSettings.editDialogHeight || 'auto';

  //console.log('✅ 配置恢复：弹出框设置已恢复');
};

// 添加应用自定义动作设置的方法
const applyCustomActionSettings = (settings: any) => {
  if (!settings.customActionSettings) return;

  // 从配置中获取自定义动作列表
  const { customActions } = settings.customActionSettings;

  // 更新主组件的自定义动作状态
  if (Array.isArray(customActions) && customActions.length > 0) {
    // console.log('✅ 配置恢复：加载自定义动作配置，总数:', customActions.length);

    // 直接更新主组件的customActions状态
    tableState.customActions.value = [...customActions];
  } else {
    // console.log('⚠️ 配置恢复：自定义动作配置为空，设置默认动作');

    // 设置默认动作
    const defaultActions = [
      {
        buttonName: '导出选中',
        enabled: true,
        operationType: 'multiple',
        operationTypeLabel: '多选',
        actionType: 'external_tab',
        actionTypeLabel: '外部标签页',
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
        actionTypeLabel: '弹窗',
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
        actionType: 'dialog',
        actionTypeLabel: '弹窗',
        url: '/detail',
        requestParams: [],
        requestParamsLabel: '',
        buttonDescription: '查看选中项的详细信息'
      }
    ];

    tableState.customActions.value = defaultActions;
  }
};

// 主要的应用配置方法
const applySettings = (settings: any) => {
  if (tableMethods.setApplyingSettings) {
    tableMethods.setApplyingSettings(true);
  }

  applyViewSettings(settings);
  applyTableSettings(settings);
  applyDialogSettings(settings); // 添加弹出框设置应用
  applyColumnSettings(settings);
  applySearchSettings(settings);
  applyTransformSettings(settings);
  applyCustomActionSettings(settings); // 添加自定义动作设置应用

  if (tableMethods.setApplyingSettings) {
    setTimeout(() => {
      tableMethods.setApplyingSettings(false);

      if (settings.tableSettings?.enableSingleSelect !== undefined) {
        const indexColumnExists = tableState.rawColumns.value.some((col: any) => col.key === 'index');

        if (settings.tableSettings.enableSingleSelect && !indexColumnExists) {
          const indexColumn = {
            title: '序号',
            key: 'index',
            width: 60,
            minWidth: 30,
            render: (_: any, index = 0) =>
              index + 1 + (tableState.pagination.value.page - 1) * tableState.pagination.value.pageSize
          };

          tableState.rawColumns.value.unshift(indexColumn);
          if (!tableState.visibleColumns.value.includes('index')) {
            tableState.visibleColumns.value.unshift('index');
          }
          //console.log('✅ 配置恢复时添加序号列');
        } else if (!settings.tableSettings.enableSingleSelect && indexColumnExists) {
          tableState.rawColumns.value = tableState.rawColumns.value.filter((col: any) => col.key !== 'index');
          tableState.visibleColumns.value = tableState.visibleColumns.value.filter((key: any) => key !== 'index');
          //console.log('✅ 配置恢复时移除序号列');
        }
      }

      if (settings.transformSettings?.transformRules?.length > 0) {
        // console.log('✅ 配置恢复时重新应用数据转换');
        tableMethods.updateTransformedColumnRenders();
      }
    }, 100);
  }
};
const settings = ref({});
// 获取配置信息的方法
const handleGetSettings = async () => {
  try {
    // 在请求前检查必要的配置参数
    if (!mockMode.value && (!uiConfig.GetUrl || !uiConfig.Type)) {
      //console.log('📋 缺少必要的配置参数，无法获取配置，需要调用字段匹配接口');

      // 即使没有配置，也初始化一个默认视图
      if (viewsConfig.value.length === 0) {
        // console.log('📋 创建默认视图配置');
        viewsConfig.value = [
          {
            id: 'default',
            name: '默认视图',
            config: {}
          }
        ];
        currentViewIndex.value = 0;
        currentViewName.value = '默认视图';

        // 同步更新全局视图配置（如果存在）
        if (tableState.viewsConfig) {
          //console.log('✅ 同步更新全局视图配置');
          tableState.viewsConfig.value = [...viewsConfig.value];
          tableState.currentViewIndex.value = currentViewIndex.value;
        }
      }

      return false; // 返回false表示没有获取到配置
    }

    // console.log('📋 尝试从 GetUrl 获取配置:', uiConfig.GetUrl);
    const response = { data: await tableApi.getSettings() };

    if (response.data?.Parameters) {
      try {
        const parsedData = JSON.parse(response.data.Parameters);
        // console.log('✅ 成功解析配置数据:', parsedData);

        // 处理数组格式的配置数据（多视图结构）
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          // 保存所有视图配置
          viewsConfig.value = parsedData;
          //console.log('📋 检测到多视图格式配置，共', parsedData.length, '个视图');

          // 使用第一个视图的配置（默认视图）
          settings.value = parsedData[currentViewIndex.value].config || {};
          currentViewName.value = parsedData[currentViewIndex.value].name || '默认视图';
        }
        // 处理对象格式的配置数据（旧格式）
        else {
          //console.log('📋 检测到对象格式配置，转换为单视图格式');
          settings.value = parsedData;

          // 创建单视图结构
          viewsConfig.value = [
            {
              id: 'default',
              name: '默认视图',
              config: parsedData
            }
          ];

          currentViewName.value = '默认视图';
        }

        // 同步更新全局视图配置（如果存在）
        if (tableState.viewsConfig) {
          //console.log('✅ 同步更新全局视图配置');
          tableState.viewsConfig.value = [...viewsConfig.value];
          tableState.currentViewIndex.value = currentViewIndex.value;
        }

        // console.log('✅ 解析后的配置信息:', settings.value);
        // console.log('✅ 视图配置已更新，共', viewsConfig.value.length, '个视图');
        applySettings(settings.value);
        // console.log('✅ 配置信息获取成功，跳过字段匹配接口');
        return true; // 返回true表示成功获取到配置
      } catch (error) {
        // console.error('❌ 解析配置参数失败:', error);

        // 解析失败时，创建默认视图
        if (viewsConfig.value.length === 0) {
          //console.log('📋 创建默认视图配置');
          viewsConfig.value = [
            {
              id: 'default',
              name: '默认视图',
              config: {}
            }
          ];
          currentViewIndex.value = 0;
          currentViewName.value = '默认视图';

          // 同步更新全局视图配置（如果存在）
          if (tableState.viewsConfig) {
            // console.log('✅ 同步更新全局视图配置');
            tableState.viewsConfig.value = [...viewsConfig.value];
            tableState.currentViewIndex.value = currentViewIndex.value;
          }
        }

        return false; // 解析失败返回false
      }
    }
    // console.log('⚠️ 没有获取到配置参数，需要调用字段匹配接口');

    // 没有配置时，创建默认视图
    if (viewsConfig.value.length === 0) {
      //console.log('📋 创建默认视图配置');
      viewsConfig.value = [
        {
          id: 'default',
          name: '默认视图',
          config: {}
        }
      ];
      currentViewIndex.value = 0;
      currentViewName.value = '默认视图';

      // 同步更新全局视图配置（如果存在）
      if (tableState.viewsConfig) {
        // console.log('✅ 同步更新全局视图配置');
        tableState.viewsConfig.value = [...viewsConfig.value];
        tableState.currentViewIndex.value = currentViewIndex.value;
      }
    }

    return false; // 返回false表示没有获取到配置
  } catch (error) {
    // console.error('❌ 获取配置失败:', error);
    // window.$message?.error('获取配置失败');

    // 出错时，创建默认视图
    if (viewsConfig.value.length === 0) {
      //console.log('📋 创建默认视图配置');
      viewsConfig.value = [
        {
          id: 'default',
          name: '默认视图',
          config: {}
        }
      ];
      currentViewIndex.value = 0;
      currentViewName.value = '默认视图';

      // 同步更新全局视图配置（如果存在）
      if (tableState.viewsConfig) {
        // console.log('✅ 同步更新全局视图配置');
        tableState.viewsConfig.value = [...viewsConfig.value];
        tableState.currentViewIndex.value = currentViewIndex.value;
      }
    }

    return false; // 返回false表示获取配置失败
  }
};

// 视图切换功能
const handleViewSelect = async (index: number) => {
  try {
    // console.log('🔄 TableSettingsDrawer: 切换视图到', index);

    // 如果当前正在编辑的视图，先保存当前视图的配置
    const currentConfig = getAllSettings();
    // console.log('📝 保存当前视图配置:', currentViewName.value);
    viewsConfig.value[currentViewIndex.value].config = currentConfig;

    // 更新当前视图索引
    currentViewIndex.value = index;
    currentViewName.value = viewsConfig.value[index].name;

    // 应用新视图的配置
    settings.value = viewsConfig.value[index].config;
    applySettings(settings.value);

    // 同步更新全局视图配置（如果存在）
    if (tableState.viewsConfig) {
      tableState.viewsConfig.value = [...viewsConfig.value];
      tableState.currentViewIndex.value = currentViewIndex.value;
    }

    return true;
  } catch (error) {
    // console.error('❌ 视图切换失败:', error);
    window.$message?.error('视图切换失败');
    return false;
  }
};

// 保存配置信息的方法
const handleSetSettings = async () => {
  try {
    // 获取当前所有配置
    const currentConfig = getAllSettings();

    // 如果viewsConfig为空，创建默认结构
    if (viewsConfig.value.length === 0) {
      viewsConfig.value = [
        {
          id: 'default',
          name: '默认视图',
          config: currentConfig
        }
      ];
      currentViewIndex.value = 0;
    } else {
      // 更新当前视图的配置
      viewsConfig.value[currentViewIndex.value].config = currentConfig;
      // 更新视图名称
      viewsConfig.value[currentViewIndex.value].name = currentViewName.value;
    }

    // 同步更新全局视图配置（如果存在）
    if (tableState.viewsConfig) {
      //console.log('✅ 保存时同步更新全局视图配置');
      tableState.viewsConfig.value = [...viewsConfig.value];
      tableState.currentViewIndex.value = currentViewIndex.value;
    }

    // console.log('📝 保存配置为多视图格式:', viewsConfig.value);

    const response = { data: await tableApi.setSettings({
      Type: uiConfig.Type,
      InternalCode: uiConfig.InternalCode,
      IsDefault: uiConfig.IsDefault,
      Parameters: JSON.stringify(viewsConfig.value)
    }) };

    if (response.data) {
      // 应用当前视图的配置
      applySettings(viewsConfig.value[currentViewIndex.value].config);
      window.$message?.success('配置信息保存成功');

      // 不再重新加载所有配置，避免覆盖其他视图的更改
      // handleGetSettings();
    }
  } catch (error) {
    // console.error('保存配置失败:', error);
    window.$message?.error('保存配置失败');
  }
};

// 导出方法供外部使用
defineExpose({
  getAllSettings,
  applySettings,
  handleGetSettings,
  handleViewSelect,
  viewsConfig,
  currentViewIndex,
  currentViewName
});

// 将这些变量暴露给tableState
tableState.dialogWidth = dialogWidth;
tableState.dialogHeight = dialogHeight;
tableState.editDialogWidth = editDialogWidth;
tableState.editDialogHeight = editDialogHeight;

// 添加新建视图的方法（暂时注释掉）
/*
const createNewView = async () => {
  try {
    // 获取当前日期时间作为ID
    const now = new Date();
    const id = `view_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    // 先保存当前视图的配置
    if (viewsConfig.value.length > 0 && currentViewIndex.value >= 0) {
      const currentConfig = getAllSettings();
      console.log('📝 保存当前视图配置:', currentViewName.value);
      viewsConfig.value[currentViewIndex.value].config = currentConfig;
    }

    // 生成新视图名称
    const newViewName = `视图 ${viewsConfig.value.length + 1}`;

    // 获取当前配置
    const currentConfig = getAllSettings();

    // 创建新的视图配置
    const newView = {
      id,
      name: newViewName,
      config: currentConfig
    };

    // 更新viewsConfig - 如果是空数组，先初始化一个默认视图
    if (viewsConfig.value.length === 0) {
      viewsConfig.value = [
        {
          id: 'default',
          name: '默认视图',
          config: currentConfig
        }
      ];
    }

    // 添加新视图到配置数组中
    viewsConfig.value.push(newView);

    // 设置当前视图为新创建的视图
    currentViewIndex.value = viewsConfig.value.length - 1;
    currentViewName.value = newViewName;

    // 同步更新全局视图配置（如果存在）
    if (tableState.viewsConfig) {
      console.log('✅ 同步更新全局视图配置');
      tableState.viewsConfig.value = [...viewsConfig.value];
      tableState.currentViewIndex.value = currentViewIndex.value;
    }

    // 保存视图配置到服务器
    const response = { data: await tableApi.setSettings({
      Type: uiConfig.Type,
      InternalCode: uiConfig.InternalCode,
      IsDefault: uiConfig.IsDefault,
      Parameters: JSON.stringify(viewsConfig.value)
    }) };

    if (response.data) {
      window.$message?.success('新视图创建成功');
      console.log('✅ 新视图创建成功:', newView.name);
    }
  } catch (error) {
    window.$message?.error('创建视图失败');
    console.error('❌ 创建视图失败:', error);
  }
};
*/

// 删除视图功能
const deleteCurrentView = async () => {
  try {
    // 确保至少保留一个视图
    if (viewsConfig.value.length <= 1) {
      window.$message?.warning('至少需要保留一个视图');
      return false;
    }

    // 记录要删除的视图索引
    const indexToDelete = currentViewIndex.value;

    // 确定删除后的新索引
    // 如果删除的是最后一个，切换到前一个；否则保持当前索引（会自动指向下一个视图）
    const newIndex = indexToDelete === viewsConfig.value.length - 1 ? indexToDelete - 1 : indexToDelete;

    // 保存当前视图配置
    const currentConfig = getAllSettings();
    viewsConfig.value[currentViewIndex.value].config = currentConfig;

    // 删除视图
    viewsConfig.value.splice(indexToDelete, 1);

    // 更新当前视图索引和名称
    currentViewIndex.value = newIndex;
    currentViewName.value = viewsConfig.value[newIndex].name;

    // 应用新视图的配置
    settings.value = viewsConfig.value[newIndex].config;
    applySettings(settings.value);

    // 同步更新全局视图配置（如果存在）
    if (tableState.viewsConfig) {
      //console.log('✅ 同步更新全局视图配置');
      tableState.viewsConfig.value = [...viewsConfig.value];
      tableState.currentViewIndex.value = currentViewIndex.value;
    }

    // 保存到服务器
    const response = { data: await tableApi.setSettings({
      Type: uiConfig.Type,
      InternalCode: uiConfig.InternalCode,
      IsDefault: uiConfig.IsDefault,
      Parameters: JSON.stringify(viewsConfig.value)
    }) };

    if (response.data) {
      window.$message?.success('视图已删除');
      return true;
    }

    return false;
  } catch (error) {
    // console.error('❌ 删除视图失败:', error);
    window.$message?.error('删除视图失败');
    return false;
  }
};
</script>

<template>
  <NDrawer v-model:show="showSettingDrawer" :width="580" placement="right">
    <NDrawerContent>
      <!-- 自定义头部 -->
      <template #header>
        <div class="drawer-header">
          <div class="header-left">
            <!-- 动态显示不同类型的图标 -->
            <template v-if="iconType === 'fontawesome'">
              <i :class="currentIcon" style="margin-right: 8px; cursor: pointer; font-size: 26px"
                @click="openIconModal"></i>
            </template>
            <template v-else-if="iconType === 'image'">
              <img :src="currentIcon" alt="icon" style="width: 26px; height: 26px; margin-right: 8px; cursor: pointer"
                @click="openIconModal" />
            </template>
            <template v-else>
              <NIcon size="26" style="margin-right: 8px; cursor: pointer" @click="openIconModal">
                <i :class="currentIcon"></i>
              </NIcon>
            </template>

            <!-- 视图选择下拉框 -->
            <NInput v-if="isEditingViewName" v-model:value="tempViewName" size="small" placeholder="请输入视图名称"
              style="max-width: 200px" autofocus @keydown="handleKeyDown" @blur="saveViewName" />
            <span v-else class="view-name" @click="startEditViewName">
              {{ currentViewName }}
            </span>
          </div>
          <div class="header-right">
            <!-- <NButton type="info" size="small" style="margin-right: 8px" @click="createNewView">新建视图</NButton> -->
            <NButton v-if="viewsConfig.length > 1" type="warning" size="small" style="margin-right: 8px"
              @click="deleteCurrentView">
              删除视图
            </NButton>
            <NButton type="primary" size="small" style="margin-right: 8px" @click="handleSetSettings">保存</NButton>
            <NButton size="small" @click="showSettingDrawer = false">关闭</NButton>
          </div>
        </div>
      </template>

      <div class="custom-settings-container">
        <!-- 左侧分类菜单 -->
        <div class="sidebar-menu">
          <div v-for="category in menuCategories" :key="category.key" class="menu-category">
            <div class="category-title">{{ category.title }}</div>
            <div class="category-items">
              <div v-for="item in category.children" :key="item.key" class="menu-item"
                :class="{ active: activeTab === item.key }" :style="{
                  color: activeTab === item.key ? themeColor : undefined
                  // color: activeTab === item.key ? 'white' : undefined
                }" @click="selectMenuItem(item.key)">
                <NIcon size="16" class="item-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path :d="item.icon" fill="currentColor" />
                  </svg>
                </NIcon>
                <span class="item-label">{{ item.label }}</span>
              </div>
            </div>
            <NDivider style="margin: 0"></NDivider>
          </div>
        </div>

        <!-- 右侧内容区域 -->
        <div class="content-area">
          <div v-if="activeTab === 'table'" class="tab-content">
            <TableBasicSettings v-if="tabLoadingStates.table" />
            <div v-else class="tab-loading">
              <NSpin size="small" />
              <span>加载中...</span>
            </div>
          </div>

          <div v-else-if="activeTab === 'columns'" class="tab-content">
            <ColumnSettings v-if="tabLoadingStates.columns" />
            <div v-else class="tab-loading">
              <NSpin size="small" />
              <span>加载中...</span>
            </div>
          </div>

          <div v-else-if="activeTab === 'buttons'" class="tab-content">
            <SearchFieldSettings v-if="tabLoadingStates.buttons" />
            <div v-else class="tab-loading">
              <NSpin size="small" />
              <span>加载中...</span>
            </div>
          </div>

          <div v-else-if="activeTab === 'transform'" class="tab-content">
            <DataTransform v-if="tabLoadingStates.transform" />
            <div v-else class="tab-loading">
              <NSpin size="small" />
              <span>加载中...</span>
            </div>
          </div>

          <div v-else-if="activeTab === 'dialog'" class="tab-content">
            <DialogSettings v-if="tabLoadingStates.dialog" />
            <div v-else class="tab-loading">
              <NSpin size="small" />
              <span>加载中...</span>
            </div>
          </div>

          <div v-else-if="activeTab === 'custom'" class="tab-content">
            <CustomActions v-if="tabLoadingStates.custom" ref="customActionsRef" />
            <div v-else class="tab-loading">
              <NSpin size="small" />
              <span>加载中...</span>
            </div>
          </div>
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>

  <!-- 图标选择弹窗 -->
  <NModal v-model:show="showIconModal" preset="dialog" title="选择图标" style="width: 500px">
    <div class="icon-selector">
      <NForm>
        <NFormItem label="图标类型">
          <NRadioGroup v-model:value="tempIconType">
            <NRadio value="fontawesome">字体图标</NRadio>
            <NRadio value="image">图片地址</NRadio>
          </NRadioGroup>
        </NFormItem>

        <NFormItem :label="tempIconType === 'fontawesome' ? '字体图标类名' : '图片地址'">
          <NInput v-model:value="tempIconContent" :type="tempIconType === 'image' ? 'textarea' : 'text'" :placeholder="tempIconType === 'fontawesome' ? '例如：fa fa-table, fa fa-user, fa fa-home' : '请输入图片的完整 URL 地址'
            " :rows="tempIconType === 'image' ? 3 : 1" />
          <div v-if="tempIconType === 'fontawesome'" style="margin-top: 8px; font-size: 12px; color: #999">
            支持 Font Awesome 4.7.0 图标，请输入完整的类名，如：fa fa-table
          </div>
        </NFormItem>

        <!-- 预览区域 -->
        <NFormItem label="预览">
          <div style="padding: 20px; border: 1px dashed #d9d9d9; border-radius: 6px; text-align: center">
            <template v-if="tempIconContent">
              <template v-if="tempIconType === 'fontawesome'">
                <i :class="tempIconContent" style="font-size: 32px"></i>
              </template>
              <template v-else-if="tempIconType === 'image'">
                <img :src="tempIconContent" alt="preview" style="width: 32px; height: 32px" />
              </template>
            </template>
            <div v-else style="color: #999">请输入图标内容查看预览</div>
          </div>
        </NFormItem>
      </NForm>
    </div>

    <template #action>
      <NSpace>
        <NButton @click="closeIconModal">取消</NButton>
        <NButton type="primary" @click="saveIcon">确定</NButton>
      </NSpace>
    </template>
  </NModal>
</template>

<style scoped>
/* 自定义头部样式 - 无背景色 */
.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  /* border-bottom: 1px solid #e8e8e8; */
  background: #fff;
}

.header-left {
  display: flex;
  align-items: center;
}

.view-name {
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  color: #262626;
  min-width: 300px;
}

.view-name:hover {
  background-color: #f5f5f5;
}

.view-name :deep(.n-input) {
  font-size: 16px;
  font-weight: 600;
}

.view-name :deep(.n-input__input-el) {
  font-size: 16px;
  font-weight: 600;
  padding: 4px 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 主容器布局 - 去掉所有外边距 */
.custom-settings-container {
  display: flex;
  overflow: hidden;
  height: 100%;
  background: #fff;
}

/* 左侧菜单样式 - 无外边距 */
.sidebar-menu {
  width: 200px;
  flex-shrink: 0;
  background: #fafafa;
  border-right: 1px solid #e8e8e8;
  padding: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.menu-category {
  margin-bottom: 0;
}

.menu-category:last-child {
  margin-bottom: 0;
}

.category-title {
  font-size: 12px;
  color: #595959;
  padding: 12px 16px 8px 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  position: relative;
}

.category-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  background: #1890ff;
  border-radius: 0;
}

.category-items {
  padding-bottom: 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 16px 12px 24px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #595959;
  margin: 0;
  border-radius: 0;
  position: relative;
  /* border-bottom: 1px solid #f0f0f0; */
}

.menu-item:hover {
  background: #e6f7ff;
  color: #1890ff;
}

.menu-item.active {
  background: #e6f7ff;
  color: #1890ff;
  font-weight: 500;
}

.item-icon {
  margin-right: 8px;
  min-width: 16px;
  font-size: 14px;
  flex-shrink: 0;
}

.item-label {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 右侧内容区域 - 无外边距 */
.content-area {
  flex: 1;
  background-color: white;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-content {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.tab-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  color: var(--n-text-color-3);
}

/* 覆盖默认的抽屉样式 - 添加5px padding */
:deep(.n-drawer-content) {
  padding: 0px !important;
}

:deep(.n-drawer-header) {
  display: none;
}

:deep(.n-drawer-body-content-wrapper) {
  padding: 0px !important;
}

/* 搜索配置内特殊样式 */
.custom-settings-container .tab-content :deep(.n-form) {
  max-width: none;
}

.custom-settings-container .tab-content :deep(.search-field-item) {
  background: #fafafa;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid #f0f0f0;
  transition: all 0.2s ease;
}

.custom-settings-container .tab-content :deep(.search-field-item:hover) {
  border-color: #d9d9d9;
}

.n-drawer .n-drawer-content.n-drawer-content--native-scrollbar :deep(.n-drawer-body-content-wrapper) {
  height: 100% !important;
  padding: 5px !important;
}

:deep(.n-drawer-header__main) {
  width: 100%;
}
</style>
