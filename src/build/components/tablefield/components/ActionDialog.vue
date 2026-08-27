<script setup lang="ts">
import * as Vue from 'vue';
import * as vue3SfcLoaderPkg from 'vue3-sfc-loader';
import { computed, defineAsyncComponent, getCurrentInstance, h, inject, ref, resolveComponent, shallowRef, watch } from 'vue';

const tableState: any = inject('tableState');
const tableMethods: any = inject('tableMethods');

interface Props {
  show?: boolean;
  url?: string;
  data?: any;
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
  url: '',
  data: null
});

const emit = defineEmits<{
  'update:show': [value: boolean];
  close: [];
}>();

const isMultipleSelection = computed(() => Array.isArray(props.data));

const DynamicComponent = shallowRef<any>(null);

function resolveComponentByName(name: string) {
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

const getExt = (url: string) => url.split('?')[0].split('.').pop()?.toLowerCase() ?? '';

const loadViaSfcLoader = async (url: string, ext: string) => {
  const bundledMod = vue3SfcLoaderPkg as any;
  const bundledLoader = bundledMod?.loadModule ? bundledMod : bundledMod?.default;
  const sfcLoader =
    (window as any)['vue3-sfc-loader'] ??
    (window as any).Vue3SfcLoader ??
    (window as any).vue3SfcLoader ??
    bundledLoader;

  if (!sfcLoader?.loadModule) {
    throw new Error('[ActionDialog] vue3-sfc-loader 初始化失败');
  }

  const options = {
    moduleCache: { vue: Vue },
    async getFile(fileUrl: string) {
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`请求失败 ${res.status}：${fileUrl}`);
      const text = await res.text();
      const content = ext === 'html' ? `<template>${text}</template>` : text;
      return { getContentData: (_asBinary: boolean) => content };
    },
    addStyle(textContent: string) {
      const style = document.createElement('style');
      style.textContent = textContent;
      document.head.appendChild(style);
    }
  };

  return sfcLoader.loadModule(url, options);
};

const loadDynamicComponent = (url: string) => {
  if (!url) {
    DynamicComponent.value = null;
    return;
  }

  if (url.startsWith('component://')) {
    const compName = url.replace('component://', '');
    const preResolved = resolveComponentByName(compName);
    DynamicComponent.value = {
      name: 'ActionCompWrapper',
      inheritAttrs: false,
      setup(_props: any, { attrs, slots }: any) {
        const comp = preResolved ?? resolveComponent(compName);
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
    timeout: 15000
  });
};

const handleShowChange = (val: boolean) => {
  if (val && props.url) {
    loadDynamicComponent(props.url);
  }
  if (!val) {
    DynamicComponent.value = null;
  }
};

// props.show 从外部变为 true 时触发加载
watch(() => props.show, handleShowChange);

const handleClose = () => {
  emit('update:show', false);
  emit('close');
  tableMethods?.fetchData?.();
};

const handleSubmit = () => {
  handleClose();
};

const dialogStyle = computed(() => ({
  width: tableState?.dialogWidth?.value || '90%',
  height: tableState?.dialogHeight?.value || 'auto'
}));

defineOptions({ name: 'ActionDialog' });
</script>

<template>
  <NModal
    :show="props.show"
    preset="card"
    :style="dialogStyle"
    :mask-closable="false"
    :trap-focus="false"
    @update:show="(val) => { emit('update:show', val); handleShowChange(val); }"
  >
    <template #header>
      <div class="dialog-header">
        <span>自定义动作</span>
        <span class="selection-badge">{{ isMultipleSelection ? '多选' : '单选' }}</span>
      </div>
    </template>

    <div class="dialog-content">
      <component
        :is="DynamicComponent"
        v-if="props.show && DynamicComponent !== null"
        :edit-data="props.data"
        :is-multiple="isMultipleSelection"
        @close="handleClose"
        @submit="handleSubmit"
      />
      <div v-else-if="props.show && !props.url" style="padding:20px;color:#999;">
        未配置URL地址
      </div>
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

.selection-badge {
  background-color: var(--n-primary-color);
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.dialog-content {
  width: 100%;
  height: 100%;
}
</style>
