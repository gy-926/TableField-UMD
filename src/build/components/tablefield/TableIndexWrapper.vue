<template>
  <!--
    .kivii-demo-lib-wrapper：
    对应 tailwind.config.js 的 important: '.kivii-demo-lib-wrapper' 配置。
    所有 Tailwind utilities 均在此作用域内以高权重生效。
  -->
  <div class="kivii-demo-lib-wrapper">
    <n-config-provider
      :theme="naiveTheme"
      :theme-overrides="themeOverrides"
      :locale="zhCN"
      :date-locale="dateZhCN"
    >
      <n-message-provider>
        <n-dialog-provider>
          <TableIndex v-bind="$attrs" />
        </n-dialog-provider>
      </n-message-provider>
    </n-config-provider>
  </div>
</template>

<script setup lang="ts">
import { provide } from 'vue'
import {
  NConfigProvider, NMessageProvider, NDialogProvider,
  zhCN, dateZhCN
} from 'naive-ui'
import TableIndex from './TableIndex.vue'
import { useTheme } from '../../composables/useTheme'

defineOptions({ name: 'TableIndex', inheritAttrs: false })

const { isDark, primaryColor, naiveTheme, themeOverrides } = useTheme()

// 向所有子组件暴露
provide('isDark', isDark)
provide('primaryColor', primaryColor)
</script>

<style scoped>
.kivii-demo-lib-wrapper {
  --kivii-table-page-bg: #f5f7fb;
  --kivii-table-surface: #ffffff;
  --kivii-table-header-bg: #f5f7fa;
  --kivii-table-row-hover: #f5f7ff;
  --kivii-table-row-striped: #fafbfc;
  --kivii-table-border: #e5e7eb;
  --kivii-table-text: #374151;
  --kivii-table-muted: #6b7280;

  height: 100%;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
  font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  color: var(--kivii-table-text);
  background: var(--kivii-table-page-bg);
}

:global(.dark) .kivii-demo-lib-wrapper {
  --kivii-table-page-bg: #111827;
  --kivii-table-surface: #182235;
  --kivii-table-header-bg: #202c40;
  --kivii-table-row-hover: #22304a;
  --kivii-table-row-striped: #1c283d;
  --kivii-table-border: #344258;
  --kivii-table-text: #e5e7eb;
  --kivii-table-muted: #9ca3af;
}
</style>
