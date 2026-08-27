<script setup lang="ts">
import * as Vue from 'vue';
import * as vue3SfcLoaderPkg from 'vue3-sfc-loader';
import { computed, defineAsyncComponent, getCurrentInstance, h, inject, ref, resolveComponent, shallowRef } from 'vue';

// 从主组件注入状态
const tableState: any = inject('tableState');
const tableMethods: any = inject('tableMethods');
const { uiConfig } = tableState;
const mockMode = inject<any>('mockMode', ref(false));
const message: any = inject('message', null);

const showDialog = ref(false);
const currentRow = ref<any>(null);
const isEditMode = ref(false);
const formModel = ref<Record<string, any>>({});

// 计算样式属性
const dialogStyle = computed(() => {
  const width = isEditMode.value ? tableState.editDialogWidth?.value || '90%' : tableState.dialogWidth?.value || '90%';
  const height = isEditMode.value
    ? tableState.editDialogHeight?.value || 'auto'
    : tableState.dialogHeight?.value || 'auto';
  return { width, height };
});

const DynamicComponent = shallowRef<any>(null);
const useBuiltinForm = computed(() => mockMode.value || !uiConfig.CreateVueUrl);
const editableFields = computed(() => {
  const configured = (tableState.columns?.value ?? [])
    .filter((column: any) => column.key && column.key !== 'Kvid' && column.key !== 'index')
    .map((column: any) => ({ key: column.key, label: column.title || column.key }));
  if (configured.length) return configured;
  return Object.keys(formModel.value)
    .filter(key => key !== 'Kvid' && key !== 'Metadata')
    .map(key => ({ key, label: key }));
});

const isNumericField = (key: string) => {
  // 编号、税号、流水号等即使由数字组成也是文本，不能根据字段名猜测类型。
  // 新建时从现有表格记录取样，以保留 Amount 等真正数值字段的输入控件。
  const value = formModel.value[key] ?? tableState.tableData?.value?.[0]?.[key];
  return typeof value === 'number';
};

// 解析 component:// 组件名：
// 1. 优先查 appContext.components（app.component() 注册的）
// 2. 兜底查 globalThis.VueComponent（UMD 场景），找到后自动注册到 app
function resolveComponentFromCreateVueUrl(name: string) {
  const instance = getCurrentInstance();
  const app = instance?.appContext.app;

  let comp = instance?.appContext.components?.[name];

  if (!comp) {
    const umd = (globalThis as any).VueComponent;
    const fromUmd = umd?.[name];
    if (fromUmd && app) {
      app.component(name, fromUmd);
      comp = fromUmd;
    }
  }

  return comp;
}

// 获取文件扩展名
const getExt = (url: string) => url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';

// 通过 vue3-sfc-loader 加载 .vue 或 .html 文件
const loadViaSfcLoader = async (url: string, ext: string) => {
  // 处理 CJS/ESM 互操作：loadModule 可能在 namespace 上或 namespace.default 上
  const bundledMod = vue3SfcLoaderPkg as any;
  const bundledLoader = bundledMod?.loadModule ? bundledMod : bundledMod?.default;

  // 优先使用宿主环境已挂载的全局实例（CDN 场景），否则使用打包内置的模块
  const sfcLoader = (window as any)['vue3-sfc-loader']
    ?? (window as any).Vue3SfcLoader
    ?? (window as any).vue3SfcLoader
    ?? bundledLoader;

  if (!sfcLoader?.loadModule) {
    throw new Error('[CreateDialog] vue3-sfc-loader 初始化失败，请检查包是否正确安装。');
  }

  console.log('[CreateDialog] 使用 vue3-sfc-loader 加载:', url);

  const options = {
    moduleCache: { vue: Vue },
    async getFile(fileUrl: string) {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`请求失败 ${res.status}：${fileUrl}`);
      const text = await res.text();
      // html 文件包裹成 vue template 格式交给 sfc-loader 编译
      const content = ext === 'html' ? `<template>${text}</template>` : text;
      return { getContentData: (_asBinary: boolean) => content };
    },
    addStyle(textContent: string) {
      const style = document.createElement('style');
      style.textContent = textContent;
      document.head.appendChild(style);
    },
  };

  return sfcLoader.loadModule(url, options);
};

const loadDynamicComponent = (url: string) => {
  if (url.startsWith('component://')) {
    const compName = url.replace('component://', '');
    // 先用 resolveComponentFromCreateVueUrl 在 setup 阶段查找并做 UMD 兜底注册，
    // 再在 wrapper 的 setup 里调用 resolveComponent 作为最终解析。
    const preResolved = resolveComponentFromCreateVueUrl(compName);
    DynamicComponent.value = {
      name: 'GlobalCompWrapper',
      inheritAttrs: false,
      setup(_props: any, { attrs, slots }: any) {
        // preResolved 有值时直接用，否则再走 Vue 的 resolveComponent
        const comp = preResolved ?? resolveComponent(compName);
        if (!preResolved && comp === compName) {
          console.warn(`[CreateDialog] 全局组件 "${compName}" 未找到，请确认已通过 app.component() 注册，或挂载到 globalThis.VueComponent`);
        }
        return () => h(comp as any, attrs, slots);
      }
    };
    return;
  }

  const ext = getExt(url);
  const needsSfcLoader = ext === 'vue' || ext === 'html';

  const loader = needsSfcLoader
    ? () => loadViaSfcLoader(url, ext)
    : () => import(/* @vite-ignore */ url);

  DynamicComponent.value = defineAsyncComponent({
    loader,
    loadingComponent: { render: () => h('div', { style: 'padding:20px;text-align:center;color:#888' }, '加载中...') },
    errorComponent: { render: () => h('div', { style: 'padding:20px;color:#d03050;font-size:13px' }, `组件加载失败：${url}`) },
    delay: 200,
    timeout: 15000,
  });
};

const handleClose = () => {
  showDialog.value = false;
  currentRow.value = null;
  isEditMode.value = false;
  tableMethods.fetchData();
};

const handleBuiltinSubmit = async () => {
  try {
    await tableMethods.saveMockRecord?.({ ...formModel.value }, isEditMode.value);
    message?.success(isEditMode.value ? '编辑已保存' : '新建已保存');
    handleSubmit();
  } catch (error) {
    message?.error('保存失败，请稍后重试');
  }
};

const handleSubmit = () => {
  showDialog.value = false;
  currentRow.value = null;
  isEditMode.value = false;
  tableMethods.fetchData();
};

const open = (row?: any) => {
  if (row) {
    currentRow.value = row;
    formModel.value = { ...row };
    isEditMode.value = true;
  } else {
    currentRow.value = null;
    formModel.value = {};
    isEditMode.value = false;
  }

  if (!useBuiltinForm.value && uiConfig.CreateVueUrl) {
    loadDynamicComponent(uiConfig.CreateVueUrl);
  } else {
    DynamicComponent.value = null;
  }

  showDialog.value = true;
};

defineExpose({ open });

defineOptions({ name: 'CreateDialog' });
</script>

<template>
  <NModal :show="showDialog" preset="card" :style="dialogStyle" :mask-closable="false" :trap-focus="false"
    @update:show="showDialog = $event">
    <template #header>
      <div class="dialog-header">
        <span>{{ isEditMode ? '编辑' : '新建' }}</span>
      </div>
    </template>
    <div class="dialog-content">
      <component :is="DynamicComponent" v-if="showDialog && DynamicComponent" :edit-data="currentRow"
        :is-edit="isEditMode" @close="handleClose" @submit="handleSubmit" />
      <NForm v-else-if="showDialog && useBuiltinForm" label-placement="left" label-width="130" class="builtin-form">
        <NFormItem v-for="field in editableFields" :key="field.key" :label="field.label">
          <NInputNumber v-if="isNumericField(field.key)" v-model:value="formModel[field.key]" :show-button="false" class="w-full" />
          <NInput v-else v-model:value="formModel[field.key]" :placeholder="`请输入${field.label}`" />
        </NFormItem>
        <NEmpty v-if="!editableFields.length" description="暂无可编辑字段" />
        <div class="dialog-actions">
          <NButton @click="handleClose">取消</NButton>
          <NButton type="primary" @click="handleBuiltinSubmit">保存</NButton>
        </div>
      </NForm>
    </div>
  </NModal>
</template>

<style scoped>
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.dialog-content {
  width: 100%;
  height: 100%;
}

.builtin-form {
  max-height: 65vh;
  overflow: auto;
  padding: 4px 8px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
}
</style>
