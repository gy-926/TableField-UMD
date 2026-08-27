<script setup lang="ts">
/* eslint-disable no-underscore-dangle */
import { computed, h, onActivated, onMounted, onUnmounted, provide, ref, watch } from 'vue';
import SearchForm from './components/SearchForm.vue';
import DataTable from './components/DataTable.vue';
import TableSettingsDrawer from './components/TableSettingsDrawer.vue';
import ColumnEditDrawer from './components/ColumnEditDrawer.vue';
import SearchFieldEditDrawer from './components/SearchFieldEditDrawer.vue';
import AddFieldDrawer from './components/AddFieldDrawer.vue';
import DataTransform from './components/DataTransform.vue';
import CreateDialog from './components/CreateDialog.vue';
import CustomActions from './components/CustomActions.vue';
import axios, { type AxiosInstance } from 'axios';
import { useMessage, useDialog } from 'naive-ui';

// 提供默认主题色以防获取不到
const themeColor = ref('#18a058');
provide('themeColor', themeColor);

// 使用 naive-ui 的 hooks 获取全局组件实例
const message = useMessage();
const dialog = useDialog();

// 提供全局实例
provide('message', message);
provide('dialog', dialog);

// 兼容原模块中尚未迁移的通知/确认调用；网络请求已全部改为 httpClient 注入，
// 不再写入或覆盖 window.$axios。
window.$message = message as any;
window.$dialog = dialog as any;

// 定义组件名称，避免与HTML元素冲突
defineOptions({
  name: 'TableView'
});

const tableData = ref([]);
const loading = ref(false);

// 在 script setup 中添加响应式变量
const tableSize = ref('small'); // 表格大小
const showBorder = ref(true); // 表格纵向边框
const showStripe = ref(true); // 表格隔行换色
const enableSingleSelect = ref(false); // 是否开启序号
const showFirstColumn = ref(true); // 是否显示首列（序号或复选框）
const showActionColumn = ref(true); // 是否显示操作栏
const firstColumnType = ref('checkbox'); // 首列类型：'checkbox' 或 'index'
const checkedRowKeys = ref<(string | number)[]>([]); // 选中的行keys

// 初始化firstColumnType，确保与enableSingleSelect状态一致
if (enableSingleSelect.value) {
  firstColumnType.value = 'index';
}
const activeTab = ref('table'); // 当前激活的标签页
// 定义props
export interface Props {
  uiConfig?: Record<string, any>;
  /** 宿主可传入已配置鉴权、拦截器及 baseURL 的 Axios 实例。 */
  httpClient?: AxiosInstance;
  /** @deprecated 请改为 uiConfig.mock.data；保留以兼容早期模拟接入。 */
  mockData?: Record<string, any>[];
  /** 模拟数据的总条数；省略时使用 mockData.length。 */
  mockTotal?: number;
  /** 可选字段元数据，格式与 /Server/Entity/{Type} 的 Results 一致。 */
  mockFieldConfigs?: Record<string, any>[];
}

const props = withDefaults(defineProps<Props>(), {
  uiConfig: () => ({
    Type: 'Kivii.Finances.Entities.Invoice',
    InternalCode: '发票管理(tableField)',
    IsDefault: true,
    InitQuery: '/Restful/Kivii.Finances.Entities.Invoice/Query.json',
    GetUrl: '/Restful/Kivii.Basic.Entities.UiConfig/Get.json',
    SetUrl: '/Restful/Kivii.Basic.Entities.UiConfig/Set.json',
    CreateVueUrl: '/codet/invoiceContent.vue'
  })
  // uiConfig: () => ({
  //   Type: 'Kivii.Bim.Entities.Model',
  //   InternalCode: '模型管理(tableField)',
  //   IsDefault: true,
  //   InitQuery: '/Restful/Kivii.Bim.Entities.Model/Query.json?OrderBy=SortId',
  //   GetUrl: '/Restful/Kivii.Basic.Entities.UiConfig/Get.json',
  //   SetUrl: '/Restful/Kivii.Basic.Entities.UiConfig/Set.json',
  //   CreateVueUrl: '/codet/newActionForm.vue',
  //   InitDelete: '/Restful/Kivii.Bim.Entities.Model/Delete.json'
  // })
});

// 所有网络请求通过上下文传递，避免 UMD 覆盖宿主的 window.$axios。
const httpClient = props.httpClient ?? axios;
provide('httpClient', httpClient);
const mockConfig = computed(() => props.uiConfig.mock);
const isMockMode = computed(() => mockConfig.value?.enabled === true || props.mockData !== undefined);
const mockRows = ref<Record<string, any>[]>([...(mockConfig.value?.data ?? props.mockData ?? [])]);
const mockSettings = ref<any>(mockConfig.value?.settings ?? []);
watch(
  () => mockConfig.value?.data ?? props.mockData,
  value => {
    if (value !== undefined) mockRows.value = [...value];
  },
  { deep: true },
);
provide('mockMode', isMockMode);

/**
 * 所有表格接口的唯一入口。uiConfig.mock.enabled 为 true 时完全在内存中工作，
 * 不触发 Query / Entity / Get / Set / Delete 的正式网络请求。
 */
const tableApi = {
  get isMock() {
    return isMockMode.value;
  },
  async getFields() {
    if (isMockMode.value) return mockConfig.value?.fields ?? props.mockFieldConfigs ?? [];
    const response = await httpClient.get(`/Server/Entity/${props.uiConfig.Type}`);
    return response.data?.Results ?? [];
  },
  async query(params: any) {
    if (isMockMode.value) {
      return {
        Offset: params.Skip,
        Total: mockConfig.value?.total ?? props.mockTotal ?? mockRows.value.length,
        Results: mockRows.value.slice(params.Skip, params.Skip + params.Take),
      };
    }
    return (await httpClient.request({
      method: 'POST', url: props.uiConfig.InitQuery, params,
      paramsSerializer: (values: any) => Object.entries(values)
        .filter(([, value]) => value !== undefined && value !== null && (!Array.isArray(value) || value.length > 0))
        .map(([key, value]) => Array.isArray(value)
          ? `${encodeURIComponent(`${key}s`)}=${encodeURIComponent(JSON.stringify(value))}`
          : `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&'),
    })).data;
  },
  async getSettings() {
    if (isMockMode.value) return { Parameters: JSON.stringify(mockSettings.value) };
    return (await httpClient.post(props.uiConfig.GetUrl, {
      Type: props.uiConfig.Type, InternalCode: props.uiConfig.InternalCode, IsDefault: props.uiConfig.IsDefault,
    })).data;
  },
  async setSettings(payload: any) {
    if (isMockMode.value) {
      mockSettings.value = typeof payload.Parameters === 'string' ? JSON.parse(payload.Parameters) : payload.Parameters;
      return { success: true };
    }
    return (await httpClient.post(props.uiConfig.SetUrl, payload)).data;
  },
  async deleteRows(kvids: string[]) {
    if (isMockMode.value) {
      mockRows.value = mockRows.value.filter(row => !kvids.includes(row.Kvid));
      return { success: true };
    }
    return (await httpClient.post(props.uiConfig.InitDelete, { Kvids: kvids })).data;
  },
};
provide('tableApi', tableApi);
// 分页配置
const pagination = ref({
  page: 1,
  pageSize: 20,
  itemCount: 0,
  showSizePicker: true,
  pageSizes: [20, 30, 40, 50],
  prefix: ({ itemCount }: { itemCount: number }) => `共 ${itemCount} 条`
});

// 定义列的类型
interface TableColumn {
  title: string;
  key: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  fixed?: 'left' | 'right' | boolean;
  render?: (row: any, index?: number) => any; // 修改render函数类型定义
  ellipsis?: {
    tooltip: boolean;
  };
  resizable?: boolean;
  align?: 'left' | 'center' | 'right';
  titleAlign?: 'left' | 'center' | 'right';
  sortable?: boolean;
  sorter?: (row1: any, row2: any) => number;
  filter?: boolean;
  filterOptions?: { label: string; value: string }[];
  filterOptionValues?: string[] | null; // 用于存储当前选中的筛选值
  __originalRender?: (row: any, index?: number) => any; // 备份原始渲染函数
}
// 接口类型定义
interface SearchFieldOption {
  label: string;
  value: string;
}

interface SearchField {
  label: string;
  key: string;
  type: string;
  visible: boolean;
  defaultValue: string;
  placeholder: string;
  options: SearchFieldOption[];
  order: number;
  operatorName?: string; // 添加值类型选择属性
}

interface TagMapping {
  value: string;
  label: string;
  color: string;
}

interface TransformRule {
  field: string;
  fieldLabel: string;
  type: string;
  typeLabel: string;
  params: {
    mappings: TagMapping[];
  };
}
// 原始列配置
const rawColumns = ref<TableColumn[]>([]);

// 添加列配置相关的响应式变量
const visibleColumns = ref<string[]>([]);

// 当前筛选状态
const currentFilters = ref<Record<string, any>>({});

// 获取当前所有列的筛选状态
const getFiltersState = () => {
  const filters: Record<string, string[]> = {};

  rawColumns.value.forEach(col => {
    if (col.filter && col.filterOptionValues && col.filterOptionValues.length) {
      filters[col.key] = col.filterOptionValues;
    }
  });

  return filters;
};

// 筛选改变
const handleFiltersChange = (filters: any) => {
  // 保存当前筛选状态到currentFilters
  // 格式化筛选参数，确保数组标识在冒号后面，值在数组里
  const formattedFilters: Record<string, any> = {};

  for (const key in filters) {
    if (filters[key] && filters[key].length) {
      // 移除可能存在的数组标记
      const cleanKey = key.replace('[]', '');
      // 将值作为数组存储
      formattedFilters[cleanKey] = filters[key];
    }
  }

  currentFilters.value = formattedFilters;
  pagination.value.page = 1;
  fetchData();
};

// 修改 generateColumns 函数
const generateColumns = (data: any): TableColumn[] => {
  if (!data) return [];
  const columns: TableColumn[] = [];

  // 添加序号列
  if (enableSingleSelect.value) {
    columns.push({
      title: '序号',
      key: 'index',
      width: 80,
      minWidth: 50,
      render: (_, index = 0) => index + 1 + (pagination.value.page - 1) * pagination.value.pageSize
    });
  }

  const processField = (obj: any, prefix = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      // 过滤掉 Metadata 字段和包含 Kvid 的字段
      if (key === 'Metadata' || key.toLowerCase().includes('kvid')) {
        return; // 跳过这些字段
      }

      // 处理数组类型字段
      if (Array.isArray(value)) {
        const columnKey = prefix + key;
        // 查找原有列的配置
        const existingColumn = rawColumns.value.find(col => col.key === columnKey);

        columns.push({
          title: key,
          key: columnKey,
          width: 200,
          minWidth: 150,
          ellipsis: existingColumn?.ellipsis ?? {
            tooltip: true
          },
          resizable: true,
          sortable: false, // 数组类型字段不支持排序
          render: (row: any) => {
            const arrayValue = row[key];
            if (Array.isArray(arrayValue)) {
              return arrayValue
                .map(item => {
                  if (typeof item === 'object') {
                    return Object.entries(item)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ');
                  }
                  return String(item);
                })
                .join('; ');
            }
            return '';
          }
        });
      }
      // 处理嵌套对象
      else if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value as object).forEach(([nestedKey, _]) => {
          // 也过滤嵌套对象中的 Metadata 和 Kvid 字段
          if (nestedKey === 'Metadata' || nestedKey.toLowerCase().includes('kvid')) {
            return; // 跳过这些字段
          }

          const columnKey = `${key}.${nestedKey}`;
          // 查找原有列的配置
          const existingColumn = rawColumns.value.find(col => col.key === columnKey);

          columns.push({
            title: nestedKey,
            key: columnKey,
            width: key.includes('Time') ? 200 : 150,
            minWidth: 100,
            ellipsis: existingColumn?.ellipsis ?? {
              tooltip: true
            },
            resizable: true,
            sortable: existingColumn?.sortable ?? false,
            ...(existingColumn?.filter
              ? {
                filter: existingColumn.filter,
                filterOptions: existingColumn.filterOptions,
                filterOptionValues: existingColumn.filterOptionValues
              }
              : {}),
            render: undefined, // 移除日期格式化，直接显示原始数据
            sorter: (row1: any, row2: any) => {
              const val1 = row1[key]?.[nestedKey];
              const val2 = row2[key]?.[nestedKey];
              if (val1 > val2) return 1;
              if (val1 < val2) return -1;
              return 0;
            }
          });
        });
      }
      // 处理普通字段
      else {
        const columnKey = prefix + key;
        // 查找原有列的配置
        const existingColumn = rawColumns.value.find(col => col.key === columnKey);

        columns.push({
          title: key,
          key: columnKey,
          width: key.includes('Time') ? 200 : 150,
          minWidth: 100,
          ellipsis: existingColumn?.ellipsis ?? {
            tooltip: true
          },
          resizable: true,
          sortable: existingColumn?.sortable ?? false,
          ...(existingColumn?.filter
            ? {
              filter: existingColumn.filter,
              filterOptions: existingColumn.filterOptions,
              filterOptionValues: existingColumn.filterOptionValues
            }
            : {}),
          render: undefined, // 移除日期格式化，直接显示原始数据
          sorter: (row1: any, row2: any) => {
            const val1 = row1[key];
            const val2 = row2[key];
            if (val1 > val2) return 1;
            if (val1 < val2) return -1;
            return 0;
          }
        });
      }
    });
  };

  processField(data);

  // 更新 rawColumns，但保留原有的排序设置
  rawColumns.value = columns;

  // 初始化 visibleColumns
  if (visibleColumns.value.length === 0) {
    visibleColumns.value = columns.map(col => col.key);
  }

  return columns;
};

// 修改计算属性，根据 visibleColumns 过滤显示的列
const columns = computed(() => {
  return rawColumns.value
    .filter(col => visibleColumns.value.includes(col.key))
    .map(col => ({
      ...col,
      title: col.title,
      width: col.width,
      minWidth: col.minWidth,
      maxWidth: col.maxWidth,
      fixed: col.fixed,
      align: col.align,
      titleAlign: col.titleAlign,
      sortable: col.sortable,
      sorter: col.sortable
        ? (row1: any, row2: any) => {
          const val1 = col.key.includes('.') ? row1[col.key.split('.')[0]]?.[col.key.split('.')[1]] : row1[col.key];
          const val2 = col.key.includes('.') ? row2[col.key.split('.')[0]]?.[col.key.split('.')[1]] : row2[col.key];

          // 处理数字类型
          if (!Number.isNaN(Number(val1)) && !Number.isNaN(Number(val2))) {
            return Number(val1) - Number(val2);
          }
          // 处理日期类型 - 直接比较原始日期值
          if (col.key.includes('Time') || col.key.includes('Date')) {
            // 直接比较日期时间戳
            return new Date(val1).getTime() - new Date(val2).getTime();
          }
          // 处理字符串类型
          return String(val1).localeCompare(String(val2));
        }
        : undefined,
      // 处理筛选相关属性
      ...(col.filter
        ? {
          filter: true,
          filterOptions: col.filterOptions,
          filterOptionValues: col.filterOptionValues,
          // 添加筛选变化处理函数
          onFilterChange: (values: string[]) => {
            const columnIndex = rawColumns.value.findIndex(c => c.key === col.key);
            if (columnIndex !== -1) {
              // 保存筛选值到列配置
              rawColumns.value[columnIndex].filterOptionValues = values.length ? values : null;

              // 生成筛选状态并触发表格刷新
              handleFiltersChange(getFiltersState());
            }
          }
        }
        : {})
    }));
});

// 添加一个标志来避免循环调用
const isApplyingSettings = ref(false);

// 添加 watch 以在首列类型变化时重新生成列
watch([enableSingleSelect, firstColumnType], async () => {
  // 如果正在应用配置，则跳过此次watch触发
  if (isApplyingSettings.value) {
    return;
  }

  // 移除现有的序号列
  const indexColumnExists = rawColumns.value.some(col => col.key === 'index');
  if (indexColumnExists) {
    rawColumns.value = rawColumns.value.filter(col => col.key !== 'index');
    visibleColumns.value = visibleColumns.value.filter(key => key !== 'index');
  }

  // 根据首列类型添加相应的列
  if (firstColumnType.value === 'index') {
    // 添加序号列到第一位
    const indexColumn: TableColumn = {
      title: '序号',
      key: 'index',
      width: 60,
      minWidth: 30,
      render: (_, index = 0) => index + 1 + (pagination.value.page - 1) * pagination.value.pageSize
    };

    rawColumns.value.unshift(indexColumn);
    // 序号列默认可见
    if (!visibleColumns.value.includes('index')) {
      visibleColumns.value.unshift('index');
    }
  }
});

// 监听enableSingleSelect变化，同步firstColumnType
watch(enableSingleSelect, newValue => {
  // 只有当当前是索引模式，且enableSingleSelect变为false时，才切换到复选框模式
  // 或者当当前是复选框模式，且用户明确选择索引时，才切换到索引模式
  // 在复选框模式下，enableSingleSelect的变化不应该影响firstColumnType
  if (firstColumnType.value === 'index' && !newValue) {
    firstColumnType.value = 'checkbox';
  }
  // 移除强制切换逻辑，让用户通过下拉框来控制首列类型
});

// 当前排序状态
const currentSorter = ref();

// 添加搜索表单的展开状态
const isExpanded = ref(true);
// 在 script setup 部分添加以下代码
const searchFields = ref<SearchField[]>([]);

// 在 script setup 部分添加以下代码
const searchForm = ref<Record<string, any>>({});

// 修改 watch searchFields 的处理
watch(
  searchFields,
  newFields => {
    // 更新 searchForm 结构
    const newSearchForm: Record<string, any> = {};
    newFields.forEach(field => {
      // 根据不同类型设置不同的初始值,优先使用默认值
      if (field.type === 'date') {
        newSearchForm[field.key] = field.defaultValue || null;
      } else if (field.type === 'select') {
        newSearchForm[field.key] = field.defaultValue || undefined;
      } else {
        newSearchForm[field.key] = field.defaultValue || '';
      }
    });
    searchForm.value = newSearchForm;
  },
  { deep: true }
);

// 处理搜索
const handleSearch = () => {
  pagination.value.page = 1;
  fetchData();
};

// 重置搜索表单
const resetSearch = () => {
  // 根据searchFields重置所有搜索字段为初始值
  const newSearchForm: Record<string, any> = {};

  searchFields.value.forEach(field => {
    // 根据不同类型设置不同的初始值
    if (field.type === 'date') {
      newSearchForm[field.key] = null;
    } else if (field.type === 'select') {
      newSearchForm[field.key] = undefined;
    } else {
      newSearchForm[field.key] = '';
    }
  });

  // 设置分页参数
  newSearchForm.Skip = 0; // 重置到第一页
  newSearchForm.Take = pagination.value.pageSize;

  searchForm.value = newSearchForm;

  // 重置分页到第一页
  pagination.value.page = 1;

  // 执行搜索
  handleSearch();
};

// 添加 CreateDialog 的引用
const createDialogRef = ref();

// 添加一个标志来追踪配置是否已加载
const isConfigLoaded = ref(false);

// 添加 TableSettingsDrawer 的引用
const tableSettingsDrawerRef = ref();

// 添加 CustomActions 的引用
const customActionsRef = ref();

// 自定义动作列表 - 主要数据源
const customActions = ref<any[]>([]);

// 字段配置
const fieldConfigs = ref<any[]>([]);

// 添加筛选功能相关配置
const newFilterLabel = ref('');
const newFilterValue = ref('');

// 添加获取所有设置的方法

// 处理新建
const handleCreate = (row?: any) => {
  if (row) {
    // 打开编辑弹窗并传递当前行数据
    createDialogRef.value?.open(row);
  } else {
    // 打开新建弹窗
    createDialogRef.value?.open();
  }
};

/** 模拟模式下由内置新建/编辑表单调用，不触发任何网络请求。 */
const saveMockRecord = async (record: Record<string, any>, isEdit: boolean) => {
  if (!isMockMode.value) return;

  if (isEdit && record.Kvid) {
    const index = mockRows.value.findIndex(item => item.Kvid === record.Kvid);
    if (index >= 0) mockRows.value[index] = { ...mockRows.value[index], ...record };
  } else {
    mockRows.value.unshift({
      ...record,
      Kvid: record.Kvid || `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
  }
  pagination.value.itemCount = mockRows.value.length;
  await fetchData();
};

// 处理搜索参数
const buildSearchParams = () => {
  const searchParams: any = {
    Skip: (pagination.value.page - 1) * pagination.value.pageSize,
    Take: pagination.value.pageSize,
    OrderBy: currentSorter.value
      ? (currentSorter.value.order === 'descend' ? '-' : '') + currentSorter.value.columnKey
      : undefined
  };

  // 处理搜索表单的值，结合值类型选择
  for (const key in searchForm.value) {
    const value = searchForm.value[key];

    // 跳过空值
    if (value === '' || value === null || value === undefined) {
      continue;
    }

    // 查找对应的搜索字段配置
    const searchField = searchFields.value.find(field => field.key === key);

    // 日期类型格式化处理
    if (searchField && (searchField.type === 'date' || searchField.type === 'date-range')) {
      // 单日期
      if (searchField.type === 'date') {
        const dateVal = Array.isArray(value) ? value[0] : value;
        const formatted = formatDateByPattern(dateVal, 'YYYY-MM-DD');
        if (searchField.operatorName) {
          const paramKey = `${key}${searchField.operatorName}`;
          searchParams[paramKey] = formatted;
        } else {
          searchParams[key] = formatted;
        }
        continue;
      }
      // 日期范围
      if (searchField.type === 'date-range' && Array.isArray(value)) {
        const [start, end] = value;
        const startKey = searchField.operatorName ? `${key}Start${searchField.operatorName}` : `${key}Start`;
        const endKey = searchField.operatorName ? `${key}End${searchField.operatorName}` : `${key}End`;
        searchParams[startKey] = formatDateByPattern(start, 'YYYY-MM-DD');
        searchParams[endKey] = formatDateByPattern(end, 'YYYY-MM-DD');
        continue;
      }
    }

    if (searchField && searchField.operatorName) {
      // 如果搜索字段有值类型选择，直接将值类型拼接到属性名后面
      const paramKey = `${key}${searchField.operatorName}`;
      searchParams[paramKey] = value;
    } else {
      // 如果没有值类型选择，使用原来的属性名
      searchParams[key] = value;
    }
  }

  // 处理筛选参数
  if (Object.keys(currentFilters.value).length) {
    for (const key in currentFilters.value) {
      if (
        currentFilters.value[key] &&
        Array.isArray(currentFilters.value[key]) &&
        currentFilters.value[key].length > 0
      ) {
        searchParams[key] = currentFilters.value[key];
      }
    }
  }

  // 处理日期范围
  if (searchForm.value.下单时间) {
    searchParams.下单时间开始 = searchForm.value.下单时间[0];
    searchParams.下单时间结束 = searchForm.value.下单时间[1];
    delete searchParams.下单时间;
  }

  return searchParams;
};

// 获取数据（不获取配置，用于搜索、分页等数据刷新）
async function fetchData() {
  await fetchDataInternal(false);
}

// 获取数据并加载配置（用于首次加载）
async function fetchDataWithConfig() {
  await fetchDataInternal(true);
}

// 生成带配置的列
const generateColumnsWithConfig = (data: any, configs: any[]): TableColumn[] => {
  if (!data) return [];
  const newColumns: TableColumn[] = [];

  // 添加序号列
  if (enableSingleSelect.value) {
    newColumns.push({
      title: '序号',
      key: 'index',
      width: 60,
      minWidth: 30,
      render: (_, index = 0) => index + 1 + (pagination.value.page - 1) * pagination.value.pageSize
    });
  }

  const processField = (obj: any, prefix = '') => {
    Object.entries(obj).forEach(([key, value]) => {
      // 过滤掉 Metadata 字段和包含 Kvid 的字段
      if (key === 'Metadata' || key.toLowerCase().includes('kvid')) {
        return; // 跳过这些字段
      }

      const fieldConfig = configs.find(field => field.Name === key);
      const displayName = fieldConfig?.DisplayName || key;

      if (Array.isArray(value)) {
        const columnKey = prefix + key;
        const existingColumn = rawColumns.value.find(col => col.key === columnKey);

        newColumns.push({
          title: displayName,
          key: columnKey,
          width: 200,
          minWidth: 150,
          ellipsis: existingColumn?.ellipsis ?? { tooltip: true },
          resizable: true,
          sortable: false,
          render: (row: any) => {
            const arrayValue = row[key];
            if (Array.isArray(arrayValue)) {
              return arrayValue
                .map(item => {
                  if (typeof item === 'object') {
                    return Object.entries(item)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ');
                  }
                  return String(item);
                })
                .join('; ');
            }
            return '';
          }
        });
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.entries(value as object).forEach(([nestedKey, _]) => {
          // 也过滤嵌套对象中的 Metadata 和 Kvid 字段
          if (nestedKey === 'Metadata' || nestedKey.toLowerCase().includes('kvid')) {
            return; // 跳过这些字段
          }

          const columnKey = `${key}.${nestedKey}`;
          const existingColumn = rawColumns.value.find(col => col.key === columnKey);
          const nestedFieldConfig = configs.find(field => field.Name === nestedKey);
          const nestedDisplayName = nestedFieldConfig?.DisplayName || nestedKey;

          newColumns.push({
            title: nestedDisplayName,
            key: columnKey,
            width: key.includes('Time') ? 200 : 150,
            minWidth: 100,
            ellipsis: existingColumn?.ellipsis ?? { tooltip: true },
            resizable: true,
            sortable: existingColumn?.sortable ?? false,
            ...(existingColumn?.filter
              ? {
                filter: existingColumn.filter,
                filterOptions: existingColumn.filterOptions,
                filterOptionValues: existingColumn.filterOptionValues
              }
              : {}),
            render: undefined, // 移除日期格式化，直接显示原始数据
            sorter: (row1: any, row2: any) => {
              const val1 = row1[key]?.[nestedKey];
              const val2 = row2[key]?.[nestedKey];
              if (val1 > val2) return 1;
              if (val1 < val2) return -1;
              return 0;
            }
          });
        });
      } else {
        const columnKey = prefix + key;
        const existingColumn = rawColumns.value.find(col => col.key === columnKey);

        newColumns.push({
          title: displayName,
          key: columnKey,
          width: key.includes('Time') ? 200 : 150,
          minWidth: 100,
          ellipsis: existingColumn?.ellipsis ?? { tooltip: true },
          resizable: true,
          sortable: existingColumn?.sortable ?? false,
          ...(existingColumn?.filter
            ? {
              filter: existingColumn.filter,
              filterOptions: existingColumn.filterOptions,
              filterOptionValues: existingColumn.filterOptionValues
            }
            : {}),
          render: undefined, // 移除日期格式化，直接显示原始数据
          sorter: (row1: any, row2: any) => {
            const val1 = row1[key];
            const val2 = row2[key];
            if (val1 > val2) return 1;
            if (val1 < val2) return -1;
            return 0;
          }
        });
      }
    });
  };

  processField(data);
  return newColumns;
};

// 加载字段配置
const loadFieldConfigs = async () => {
  fieldConfigs.value = await tableApi.getFields();
};

// 处理列配置生成和恢复
const handleColumnGeneration = (response: any, shouldLoadConfig: boolean, currentFilterState: Record<string, any>) => {
  if (shouldLoadConfig) {
    // 首次加载时生成完整的列配置
    rawColumns.value = generateColumnsWithConfig(response.Results[0], fieldConfigs.value);
    visibleColumns.value = rawColumns.value.map(col => col.key);

    // 恢复筛选状态
    if (Object.keys(currentFilterState).length > 0) {
      rawColumns.value.forEach(col => {
        const savedState = currentFilterState[col.key];
        if (savedState) {
          col.filter = savedState.filter;
          col.filterOptions = savedState.filterOptions;
          col.filterOptionValues = savedState.filterOptionValues;
        }
      });
    }
  } else if (rawColumns.value.length === 0) {
    // 如果没有列配置但有数据，可能是刷新后的第一次数据获取，需要生成基础列
    rawColumns.value = generateColumnsWithConfig(response.Results[0], fieldConfigs.value || []);
  }
};

// 内部数据获取函数
async function fetchDataInternal(shouldLoadConfig: boolean = false) {
  loading.value = true;
  try {
    const searchParams = buildSearchParams();

    const responseData = await tableApi.query(searchParams);

    // 检查数据结构
    if (responseData?.Results?.length) {
      // 保存当前的filter状态
      const currentFilterState: Record<string, any> = rawColumns.value.reduce((acc: Record<string, any>, col) => {
        if (col.filter && col.filterOptionValues) {
          acc[col.key] = {
            filter: col.filter,
            filterOptions: col.filterOptions,
            filterOptionValues: col.filterOptionValues
          };
        }
        return acc;
      }, {});

      // ✅ 只在需要加载配置时才获取字段配置
      if (shouldLoadConfig) {
        await loadFieldConfigs();
      }

      // 处理列配置生成
      handleColumnGeneration(responseData, shouldLoadConfig, currentFilterState);

      // ✅ 使用正确的数据结构设置表格数据
      tableData.value = responseData.Results;
      pagination.value.itemCount = responseData.Total || 0;

      // ✅ 只在需要加载配置时才应用保存的配置
      if (shouldLoadConfig && tableSettingsDrawerRef.value?.handleGetSettings) {
        await tableSettingsDrawerRef.value.handleGetSettings();
        // await 后检查组件是否已卸载
        if (isUnmounted) return;
      }

      // 标记配置已加载（用于其他逻辑判断）
      if (shouldLoadConfig && !isConfigLoaded.value) {
        isConfigLoaded.value = true;
      }
    } else {
      // 没有数据的情况
      tableData.value = [];
      pagination.value.itemCount = responseData?.Total || 0;
    }
  } catch (error) {
    if (isUnmounted) return;
    tableData.value = [];
    pagination.value.itemCount = 0;
  } finally {
    if (!isUnmounted) loading.value = false;
  }
}

// 添加删除后的数据刷新处理方法
const handleDeleteRefresh = async () => {
  // 记录删除前的数据条数
  const beforeDeleteCount = tableData.value.length;
  const currentPage = pagination.value.page;

  // 先刷新数据获取最新的总数
  await fetchData();

  // 如果当前页没有数据了，且不是第一页，则跳转到前一页
  if (tableData.value.length === 0 && currentPage > 1) {
    // console.log('当前页无数据，跳转到前一页');
    pagination.value.page = currentPage - 1;
    await fetchData();
  }
  // 如果删除后当前页还有数据，但数据条数减少了，说明删除成功
  else if (beforeDeleteCount > tableData.value.length || tableData.value.length === 0) {
    // console.log('删除成功，数据已更新');
  }
};

// 页码改变
const handlePageChange = (page: number) => {
  pagination.value.page = page;
  fetchData();
};

// 每页条数改变
const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize;
  pagination.value.page = 1;
  fetchData();
};

// 排序改变
const handleSorterChange = (sorter: { columnKey: string; order: 'ascend' | 'descend' | false }) => {
  currentSorter.value = sorter;
  fetchData();
};

const showSettingDrawer = ref(false);
const tableHeight = ref(600);
const tableScrollWidth = ref(0); // 设置一个默认值

// 添加列配置相关的响应式变量
const showEditDrawer = ref(false);
const currentEditColumn = ref<TableColumn | null>(null);

// 修改拖拽排序相关的方法
const handleDragStart = (e: DragEvent, index: number) => {
  e.dataTransfer?.setData('text/plain', index.toString());
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const handleDrop = (e: DragEvent, toIndex: number) => {
  e.preventDefault();
  const fromIndex = Number(e.dataTransfer?.getData('text/plain'));
  if (!Number.isNaN(fromIndex)) {
    const reorderedColumns = [...rawColumns.value];
    const [movedColumn] = reorderedColumns.splice(fromIndex, 1);
    reorderedColumns.splice(toIndex, 0, movedColumn);
    rawColumns.value = reorderedColumns;
  }
};

// 添加计算属性判断是否为 index 字段
const isIndexColumn = computed(() => {
  if (!currentEditColumn.value) return false;
  return currentEditColumn.value.key === 'index' || currentEditColumn.value.key.toLowerCase().includes('index');
});

// 修改编辑列的方法
const handleEditColumn = (column: TableColumn) => {
  currentEditColumn.value = {
    ...column,
    align: (column as any).align || 'left',
    titleAlign: (column as any).titleAlign || 'left',
    sortable: isIndexColumn.value ? false : column.sortable || false,
    // 保持原有的 ellipsis 配置，如果没有则不设置
    ...(column.ellipsis ? { ellipsis: { ...column.ellipsis } } : {}),
    // 保持原有的筛选配置
    ...(column.filter
      ? {
        filter: true,
        filterOptions: [...(column.filterOptions || [])]
      }
      : {})
  };
  showEditDrawer.value = true;

  // 重置添加筛选选项输入框
  newFilterLabel.value = '';
  newFilterValue.value = '';
};

// 修改 saveColumnEdit 方法
const saveColumnEdit = () => {
  if (!currentEditColumn.value) return;

  const index = rawColumns.value.findIndex(col => col.key === currentEditColumn.value?.key);
  if (index > -1) {
    const updatedColumn = {
      ...rawColumns.value[index],
      title: currentEditColumn.value.title,
      align: currentEditColumn.value.align,
      titleAlign: currentEditColumn.value.titleAlign,
      sortable: currentEditColumn.value.sortable,
      // 保存列宽和固定列配置
      width: currentEditColumn.value.width,
      minWidth: currentEditColumn.value.minWidth,
      fixed: currentEditColumn.value.fixed
    };

    // 只在存在 ellipsis 时添加该属性
    if (currentEditColumn.value.ellipsis) {
      updatedColumn.ellipsis = {
        tooltip: currentEditColumn.value.ellipsis.tooltip
      };
    } else {
      // 确保删除 ellipsis 属性
      delete updatedColumn.ellipsis;
    }

    // 保存筛选相关设置
    if (currentEditColumn.value.filter) {
      updatedColumn.filter = true;
      updatedColumn.filterOptions = currentEditColumn.value.filterOptions || [];

      // 添加筛选处理函数
      updatedColumn.filterOptionValues = null; // 初始时没有选中的筛选值
    } else {
      // 删除筛选相关属性
      delete updatedColumn.filter;
      delete updatedColumn.filterOptions;
      delete updatedColumn.filterOptionValues;
    }

    rawColumns.value[index] = updatedColumn;
  }

  showEditDrawer.value = false;
  currentEditColumn.value = null;
};

// 添加列显示状态变化的处理方法
const handleColumnVisibleChange = (checked: boolean, column: TableColumn) => {
  if (checked) {
    if (!visibleColumns.value.includes(column.key)) {
      visibleColumns.value = [...visibleColumns.value, column.key];
    }
  } else {
    visibleColumns.value = visibleColumns.value.filter(key => key !== column.key);
  }
};

// 添加列搜索相关的响应式变量
const columnSearchText = ref('');

// 添加列搜索的计算属性
const filteredColumns = computed(() => {
  const searchText = columnSearchText.value.toLowerCase().trim();
  if (!searchText) return rawColumns.value;

  return rawColumns.value.filter(column => {
    const title = column.title.toLowerCase();
    const key = column.key.toLowerCase();
    return title.includes(searchText) || key.includes(searchText);
  });
});

// 添加搜索框清空方法
const clearColumnSearch = () => {
  columnSearchText.value = '';
};

// 将formItems改为响应式变量，避免在搜索时重新计算导致表单重置
const formItems = ref<any[]>([]);

// 添加一个函数来更新formItems，只在必要时调用
const updateFormItems = () => {
  const items = searchFields.value
    .filter(field => field.visible)
    .sort((a, b) => a.order - b.order)
    .map(field => ({
      label: field.label,
      key: field.key,
      type: field.type,
      // 使用字段自身的 placeholder,如果没有则使用默认值
      placeholder: field.placeholder || (field.type === 'select' ? `请选择${field.label}` : `请输入${field.label}`),
      defaultValue: field.defaultValue, // 添加默认值
      options: field.options
    }));

  formItems.value = items;
};

// 修改添加搜索字段的方法
const showAddFieldDrawer = ref(false);
const selectedColumns = ref<string[]>([]);

const confirmAddFields = () => {
  const newFields = selectedColumns.value.map(key => {
    const column = rawColumns.value.find(col => col.key === key);
    const isDateField = column?.key.toLowerCase().includes('time') || column?.key.toLowerCase().includes('date');

    return {
      label: column?.title || '',
      key: column?.key || '',
      type: isDateField ? 'date' : 'input',
      visible: true,
      defaultValue: '',
      placeholder: isDateField ? `请选择${column?.title || ''}` : `请输入${column?.title || ''}`,
      order: searchFields.value.length + 1,
      options: [],
      operatorName: '' // 添加operatorName属性，确保响应式追踪
    };
  });

  searchFields.value = [...searchFields.value, ...newFields];
  updateFormItems(); // 更新表单项
  showAddFieldDrawer.value = false;
};

// 添加搜索字段编辑抽屉
const showSearchFieldDrawer = ref(false);

const currentSearchField = ref<SearchField>({
  label: '',
  key: '',
  type: 'input',
  visible: true,
  defaultValue: '',
  placeholder: '请输入占位提示',
  options: [],
  order: 0,
  operatorName: '' // 添加值类型选择字段
});

// 修改 saveSearchField 方法
const saveSearchField = () => {
  const index = searchFields.value.findIndex(field => field.key === currentSearchField.value.key);
  if (index > -1) {
    const oldType = searchFields.value[index].type;
    const newType = currentSearchField.value.type;

    searchFields.value[index] = {
      ...searchFields.value[index],
      ...currentSearchField.value,
      placeholder: currentSearchField.value.placeholder,
      options: currentSearchField.value.type === 'select' ? currentSearchField.value.options : []
    };

    // 如果类型改变为 select，重置对应的表单值为 undefined
    if (oldType !== 'select' && newType === 'select') {
      searchForm.value[currentSearchField.value.key] = undefined;
    }

    updateFormItems(); // 更新表单项
  }
  showSearchFieldDrawer.value = false;
};

// 添加搜索字段编辑方法
const addSearchField = () => {
  selectedColumns.value = [];
  showAddFieldDrawer.value = true;
};

// 编辑搜索字段
const editSearchField = (field: any) => {
  // 使用Object.assign确保响应式追踪，而不是直接赋值新对象
  Object.assign(currentSearchField.value, {
    label: field.label || '',
    key: field.key || '',
    type: field.type || 'input',
    visible: field.visible !== undefined ? field.visible : true,
    defaultValue: field.defaultValue || '',
    placeholder: field.placeholder || '',
    options: field.options || [],
    order: field.order || 0,
    operatorName: field.operatorName || '' // 确保 operatorName 属性存在
  });

  showSearchFieldDrawer.value = true;
};

// 移除搜索字段
const removeSearchField = (field: any) => {
  searchFields.value = searchFields.value.filter(f => f.key !== field.key);
  updateFormItems(); // 更新表单项
};

// 更新字段可见性
const updateFieldVisibility = (field: any, visible: boolean) => {
  field.visible = visible;
  updateFormItems(); // 更新表单项
};

// 获取可选择的列
const availableColumns = computed(() => {
  const existingKeys = searchFields.value.map(f => f.key);
  return rawColumns.value.filter(col => {
    // 过滤掉已存在的字段、Metadata 字段和包含 Kvid 的字段
    return !existingKeys.includes(col.key) && col.key !== 'Metadata' && !col.key.toLowerCase().includes('kvid');
  });
});

// 在 script setup 部分添加以下响应式变量
const newOptionKey = ref('');
const newOptionValue = ref('');

// 添加一个方法来处理添加新选项
const addOption = () => {
  if (!currentSearchField.value.options) {
    currentSearchField.value.options = [];
  }

  if (newOptionKey.value && newOptionValue.value) {
    currentSearchField.value.options.push({
      label: newOptionKey.value,
      value: newOptionValue.value
    });
    // 清空输入
    newOptionKey.value = '';
    newOptionValue.value = '';
  }
};

// 添加删除选项的方法
const removeOption = (index: number) => {
  if (currentSearchField.value.options) {
    currentSearchField.value.options.splice(index, 1);
  }
};

// 添加拖拽排序相关方法
const handleSearchFieldDragStart = (e: DragEvent, field: any) => {
  e.dataTransfer?.setData('text/plain', field.key);
};

const handleSearchFieldDragOver = (e: DragEvent) => {
  e.preventDefault();
};

const handleSearchFieldDrop = (e: DragEvent, targetField: any) => {
  e.preventDefault();
  const sourceKey = e.dataTransfer?.getData('text/plain');
  if (!sourceKey) return;

  const sourceField = searchFields.value.find(f => f.key === sourceKey);
  const targetOrder = targetField.order;

  if (sourceField) {
    // 交换order值
    const sourceOrder = sourceField.order;
    sourceField.order = targetOrder;
    targetField.order = sourceOrder;

    // 重新排序数组
    searchFields.value.sort((a, b) => a.order - b.order);
    updateFormItems(); // 更新表单项
  }
};

// 添加筛选选项
const addFilterOption = () => {
  if (!currentEditColumn.value) return;

  if (!currentEditColumn.value.filterOptions) {
    currentEditColumn.value.filterOptions = [];
  }

  // 检查是否已存在相同的值，避免重复
  const isDuplicate = currentEditColumn.value.filterOptions.some(option => option.value === newFilterValue.value);

  if (!isDuplicate) {
    currentEditColumn.value.filterOptions.push({
      label: newFilterLabel.value,
      value: newFilterValue.value
    });

    // 清空输入
    newFilterLabel.value = '';
    newFilterValue.value = '';
  } else {
    // 可以在这里添加重复选项的提示
    // alert('该筛选值已存在，请勿重复添加');
  }
};

// 移除筛选选项
const removeFilterOption = (index: number) => {
  if (currentEditColumn.value?.filterOptions) {
    currentEditColumn.value.filterOptions.splice(index, 1);
  }
};

// 从当前数据生成选项
const generateFilterOptions = (column: TableColumn) => {
  if (!column || !tableData.value.length) return;

  // 获取当前列的所有唯一值
  const uniqueValues = new Set<string>();
  const key = column.key;

  tableData.value.forEach(row => {
    let value;

    // 处理嵌套属性 (如 'user.name')
    if (key.includes('.')) {
      const [parentKey, childKey] = key.split('.');
      value = row[parentKey]?.[childKey];
    } else {
      value = row[key];
    }

    // 值存在时添加到集合中
    if (value !== undefined && value !== null) {
      uniqueValues.add(String(value));
    }
  });

  // 将唯一值转换为筛选选项
  const options = Array.from(uniqueValues).map(value => ({
    label: value,
    value
  }));

  // 更新当前编辑列的筛选选项
  if (currentEditColumn.value) {
    currentEditColumn.value.filterOptions = options;
  }

  // 提供用户反馈
  if (options.length > 0) {
    // alert(`成功生成 ${options.length} 个筛选选项!`);
  } else {
    // alert('未能从当前数据中找到任何值，请检查数据是否已加载。');
  }
};
// 数据转换相关的状态

const selectedField = ref('');
const availableFields = computed(() => {
  return rawColumns.value
    .filter(column => {
      // 过滤掉 Metadata 字段和包含 Kvid 的字段
      return column.key !== 'Metadata' && !column.key.toLowerCase().includes('kvid');
    })
    .map((column: TableColumn) => ({
      label: column.title,
      value: column.key
    }));
});
const tagMappings = ref<TagMapping[]>([{ value: '', label: '', color: '' }]);
const transformRules = ref<TransformRule[]>([]);
const transformedData = ref<any[]>([]);

// 添加转换配置存储
const transformConfigurations = ref<Record<string, any>>({});

// 添加获取标签颜色的辅助函数
const getTagColor = (color: string) => {
  if (color?.startsWith('#')) return color;
  const colorMap: Record<string, string> = {
    default: '#909399',
    primary: '#409EFF',
    success: '#67C23A',
    warning: '#E6A23C',
    error: '#F56C6C',
    info: '#909399'
  };

  return colorMap[color] || colorMap.default;
};

// 日期格式化函数
const formatDateByPattern = (dateStr: string, pattern: string) => {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  switch (pattern) {
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM-DD':
      return `${month}-${day}`;
    case 'YYYY-MM':
      return `${year}-${month}`;
    case 'HH:mm:ss':
      return `${hours}:${minutes}:${seconds}`;
    default:
      return dateStr;
  }
};

// 添加更新列渲染函数的方法
const updateTransformedColumnRenders = () => {
  // 遍历所有列，为有转换配置的列添加自定义渲染函数
  rawColumns.value.forEach(column => {
    const config = transformConfigurations.value[column.key];

    if (config && config.type === 'tag') {
      // 只在第一次时备份真正的原始 render
      if (!column.__originalRender && column.render) {
        column.__originalRender = column.render;
      }
      // 快照当前 originalRender，避免闭包运行时动态查找导致递归
      const originalRender = column.__originalRender;
      // 保存 column.key 避免闭包引用可能变化的对象属性
      const columnKey = column.key;

      column.render = (row, index) => {
        // 动态读取最新配置，确保用户修改映射后立即生效
        const currentConfig = transformConfigurations.value[columnKey];
        let value;

        if (columnKey.includes('.')) {
          const [parentKey, childKey] = columnKey.split('.');
          value = row[parentKey]?.[childKey];
        } else {
          value = row[columnKey];
        }

        if (value !== undefined && value !== null) {
          const stringValue = String(value);
          const mapping = currentConfig?.mappings?.find((m: any) => String(m.value) === stringValue);

          if (mapping) {
            return h(
              'span',
              {
                class: `tag tag-${mapping.color || 'default'}`,
                style: {
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: getTagColor(mapping.color),
                  color: '#fff',
                  fontSize: '12px'
                }
              },
              mapping.label
            );
          }
          // No mapping found for this value - show original value
          if (originalRender) {
            return originalRender(row, index);
          }
          return stringValue;
        }

        if (originalRender) {
          return originalRender(row, index);
        }
        return value ?? null;
      };
    } else if (config && config.type === 'date') {
      // 只在第一次时备份真正的原始 render
      if (!column.__originalRender && column.render) {
        column.__originalRender = column.render;
      }
      // 快照当前 originalRender，避免闭包运行时动态查找导致递归
      const originalRender = column.__originalRender;
      const columnKey = column.key;

      column.render = (row, index) => {
        // 动态读取最新配置，确保用户修改格式后立即生效
        const currentConfig = transformConfigurations.value[columnKey];
        let value;

        if (columnKey.includes('.')) {
          const [parentKey, childKey] = columnKey.split('.');
          value = row[parentKey]?.[childKey];
        } else {
          value = row[columnKey];
        }

        if (value !== undefined && value !== null) {
          return formatDateByPattern(String(value), currentConfig?.dateFormat || 'YYYY-MM-DD HH:mm:ss');
        }

        if (originalRender) {
          return originalRender(row, index);
        }
        return value;
      };
    } else if (config && config.type === 'text') {
      if (!column.__originalRender && column.render) {
        column.__originalRender = column.render;
      }
      const originalRender = column.__originalRender;
      const columnKey = column.key;

      column.render = (row, index) => {
        const currentConfig = transformConfigurations.value[columnKey];
        let value;

        if (columnKey.includes('.')) {
          const [parentKey, childKey] = columnKey.split('.');
          value = row[parentKey]?.[childKey];
        } else {
          value = row[columnKey];
        }

        if (value !== undefined && value !== null) {
          const stringValue = String(value);
          const mapping = currentConfig?.mappings?.find((m: any) => String(m.value) === stringValue);

          if (mapping) {
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
          }

          if (originalRender) {
            return originalRender(row, index);
          }
          return stringValue;
        }

        if (originalRender) {
          return originalRender(row, index);
        }
        return value ?? null;
      };
    } else if (!config && column.__originalRender) {
      // 如果列没有转换配置但有原始渲染函数，恢复原始渲染
      column.render = column.__originalRender;
      column.__originalRender = undefined;
    }
  });
};

const applyTransformations = (silent = false) => {
  if (!tableData.value || tableData.value.length === 0) {
    // 如果是静默模式（配置恢复时），不显示错误信息
    if (!silent) {
      window.$message?.error('没有可转换的数据');
    }
    return;
  }

  try {
    // 刷新表格视图
    updateTransformedColumnRenders();
  } catch (error: any) {
    if (!silent) {
      window.$message?.error(`转换过程中出错: ${error.message}`);
    }
  }
};

// 添加设置应用标志的方法
const setApplyingSettings = (value: boolean) => {
  isApplyingSettings.value = value;
};

// 数据转换相关的方法
const addTagMapping = () => {
  tagMappings.value.push({ value: '', label: '', color: '' });
};

const removeTagMapping = (index: number) => {
  tagMappings.value.splice(index, 1);
};

const addTransformRule = (ruleData?: any) => {
  // 如果传入了规则数据，直接使用（新版本DataTransform组件调用）
  if (ruleData) {
    // 将转换规则添加到规则列表
    transformRules.value.push(ruleData);

    // 同时更新转换配置存储
    if (ruleData.type === 'date') {
      transformConfigurations.value[ruleData.field] = {
        type: ruleData.type,
        dateFormat: ruleData.params?.dateFormat || 'YYYY-MM-DD HH:mm:ss'
      };
    } else {
      transformConfigurations.value[ruleData.field] = {
        type: ruleData.type,
        mappings: ruleData.params?.mappings || []
      };
    }

    window.$message?.success('转换规则添加成功');
    return;
  }

  // 兼容旧版本的调用方式
  if (!selectedField.value) return;

  // 过滤掉空值映射
  const validMappings = tagMappings.value.filter(mapping => mapping.value !== '' && mapping.label !== '');

  if (validMappings.length === 0) {
    window.$message?.error('请添加至少一个有效的标记映射');
    return;
  }

  // 将转换规则添加到规则列表
  transformRules.value.push({
    field: selectedField.value,
    fieldLabel: availableFields.value.find(f => f.value === selectedField.value)?.label || selectedField.value,
    type: 'tag',
    typeLabel: '转换标记',
    params: { mappings: validMappings }
  });

  // 同时更新转换配置存储
  transformConfigurations.value[selectedField.value] = {
    type: 'tag',
    mappings: validMappings
  };

  // 重置输入
  selectedField.value = '';
  tagMappings.value = [{ value: '', label: '', color: '' }];
};

const removeTransformRule = (index: number) => {
  // 获取要删除的规则
  const removedRule = transformRules.value[index];

  // 从规则列表中删除
  transformRules.value.splice(index, 1);

  // 从转换配置中删除
  if (removedRule && removedRule.field) {
    transformConfigurations.value[removedRule.field] = undefined;
  }

  // 刷新表格以移除转换效果
  applyTransformations();
};

// 添加恢复原始数据的方法
const restoreOriginalData = () => {
  // 恢复所有列的原始渲染函数
  rawColumns.value.forEach(column => {
    if ((column as any).__originalRender) {
      column.render = (column as any).__originalRender;
      (column as any).__originalRender = undefined;
    }
  });

  // 清空转换配置
  transformConfigurations.value = {};
  transformRules.value = [];

  window.$message?.success('已恢复原始数据显示');
};

// 添加一个标志来追踪数据是否已经准备好
const isDataReady = ref(false);

// 监听数据变化
watch([tableData, rawColumns], ([newTableData, newRawColumns]) => {
  if (newTableData.length > 0 && newRawColumns.length > 0) {
    isDataReady.value = true;
  }
});

// 监听数据准备状态 - 不再自动加载配置
watch(isDataReady, newValue => {
  if (newValue) {
  }
});

// 添加全局视图配置状态
const globalViewsConfig = ref<Array<{ id: string; name: string; config: any }>>([]);
const globalCurrentViewIndex = ref(0);

// 监听全局视图索引变化
watch(globalCurrentViewIndex, (newIndex, oldIndex) => {
  if (newIndex !== oldIndex && globalViewsConfig.value.length > 0) {
    // 确保表格数据刷新
    setTimeout(() => {
      fetchData();
    }, 100);
  }
});

// 监听checkedRowKeys变化
watch(
  checkedRowKeys,
  async newKeys => {
    // 确保自定义动作组件被正确初始化和引用
    if (newKeys && newKeys.length > 0) {
      await loadCustomActions();
    }
  },
  { deep: true }
);

// 加载自定义动作
const loadCustomActions = async () => {
  try {
    // 确保customActionsRef存在
    if (!customActionsRef.value) {
      return false;
    }
    // 调用组件的加载方法
    if (customActionsRef.value.loadCustomActions) {
      const result = await customActionsRef.value.loadCustomActions();

      // 如果没有加载到动作，尝试初始化默认动作
      if (!customActionsRef.value.customActions || customActionsRef.value.customActions.length === 0) {
        if (customActionsRef.value.initDefaultActions) {
          customActionsRef.value.initDefaultActions();
        }
      }

      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

// 组件是否已卸载的标志，用于取消 onMounted 中未完成的异步操作
let isUnmounted = false;
onUnmounted(() => { isUnmounted = true; });

onMounted(async () => {
  // 优先初始化自定义动作组件，确保它在其他组件之前加载
  await loadCustomActions();
  if (isUnmounted) return;

  // 初始化表单项
  updateFormItems();

  // 确保视图配置已初始化
  if (tableSettingsDrawerRef.value?.handleGetSettings) {
    await tableSettingsDrawerRef.value.handleGetSettings();
    // await 期间组件可能已被卸载，需要检查
    if (isUnmounted || !tableSettingsDrawerRef.value) return;

    // 直接检查视图配置
    const viewsConfig = tableSettingsDrawerRef.value.viewsConfig;
    const currentViewIndex = tableSettingsDrawerRef.value.currentViewIndex;

    if (viewsConfig && viewsConfig.value) {
      // 将视图配置同步到全局状态
      globalViewsConfig.value = [...viewsConfig.value];
      globalCurrentViewIndex.value = currentViewIndex.value || 0;
    } else {
      // 创建默认视图配置
      globalViewsConfig.value = [
        {
          id: 'default',
          name: '默认视图',
          config: {}
        }
      ];
      globalCurrentViewIndex.value = 0;
    }
  }

  if (isUnmounted) return;
  // 在组件挂载时加载数据和配置
  fetchDataWithConfig();
});

onActivated(() => {
  // console.log('组件被激活');
  // 组件激活时只获取数据，不重新加载配置
  fetchData();
});

// 提供共享状态和方法给子组件
provide('tableState', {
  tableData,
  loading,
  columns,
  pagination,
  rawColumns,
  visibleColumns,
  tableSize,
  showBorder,
  showStripe,
  tableHeight,
  tableScrollWidth,
  searchForm,
  searchFields,
  formItems,
  isExpanded,
  enableSingleSelect,
  showFirstColumn,
  showActionColumn,
  firstColumnType,
  checkedRowKeys,
  filteredColumns,
  showSettingDrawer,
  showEditDrawer,
  showSearchFieldDrawer,
  showAddFieldDrawer,
  currentEditColumn,
  currentSearchField,
  activeTab,
  columnSearchText,
  selectedColumns,
  newFilterLabel,
  newFilterValue,
  newOptionKey,
  newOptionValue,
  isIndexColumn,
  availableColumns,
  uiConfig: props.uiConfig,
  tagMappings,
  transformRules,
  transformedData,
  selectedField,
  availableFields,
  transformConfigurations,
  tableSettingsDrawerRef,
  customActionsRef, // 确保引用传递给子组件
  customActions, // 添加自定义动作状态
  // 添加全局视图配置
  viewsConfig: globalViewsConfig,
  currentViewIndex: globalCurrentViewIndex
});

// 提供方法
provide('tableMethods', {
  fetchData,
  fetchDataWithConfig,
  handleSearch,
  resetSearch,
  handlePageChange,
  handlePageSizeChange,
  handleSorterChange,
  handleFiltersChange,
  handleEditColumn,
  saveColumnEdit,
  handleColumnVisibleChange,
  clearColumnSearch,
  handleDragStart,
  handleDragOver,
  handleDrop,
  addSearchField,
  editSearchField,
  removeSearchField,
  updateFieldVisibility,
  updateFormItems,
  confirmAddFields,
  saveSearchField,
  addOption,
  removeOption,
  handleSearchFieldDragStart,
  handleSearchFieldDragOver,
  handleSearchFieldDrop,
  addFilterOption,
  removeFilterOption,
  generateFilterOptions,
  // formatDate, // 已移除日期格式化函数
  addTagMapping,
  removeTagMapping,
  addTransformRule,
  removeTransformRule,
  applyTransformations,
  restoreOriginalData,
  updateTransformedColumnRenders,
  handleCreate,
  saveMockRecord,
  handleDeleteRefresh,
  setApplyingSettings
});
</script>

<template>
  <div class="table-container">
    <!--<KiviiCard></KiviiCard>-->
    <!-- 搜索表单组件 -->
    <SearchForm></SearchForm>
    <!--<SearchForm></SearchForm>-->

    <!-- 数据表格组件 -->
    <DataTable></DataTable>

    <!-- 表格设置抽屉组件 -->
    <TableSettingsDrawer ref="tableSettingsDrawerRef"></TableSettingsDrawer>

    <!-- 列编辑抽屉 -->
    <ColumnEditDrawer></ColumnEditDrawer>

    <!-- 搜索字段编辑抽屉 -->
    <SearchFieldEditDrawer></SearchFieldEditDrawer>

    <!-- 添加字段抽屉 -->
    <AddFieldDrawer></AddFieldDrawer>

    <!-- 新建弹窗 -->
    <CreateDialog ref="createDialogRef"></CreateDialog>

    <!-- 自定义动作组件（隐藏，仅用于逻辑处理） -->
    <CustomActions ref="customActionsRef" style="display: none"></CustomActions>
  </div>
</template>

<style scoped>
.table-container {
  width: 100%;
  position: relative;
}
</style>
