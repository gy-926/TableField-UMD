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
  font-family: inherit;
  color: var(--color-text);
}
</style>
