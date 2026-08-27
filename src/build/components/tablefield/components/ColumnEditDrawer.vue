<script setup lang="ts">
import { inject } from 'vue';

// 从主组件注入状态和方法
const tableState: any = inject('tableState');
const tableMethods: any = inject('tableMethods');

const { showEditDrawer, currentEditColumn, isIndexColumn, newFilterLabel, newFilterValue } = tableState;

const { saveColumnEdit, addFilterOption, removeFilterOption, generateFilterOptions } = tableMethods;

defineOptions({
  name: 'ColumnEditDrawer'
});
</script>

<template>
  <NDrawer v-model:show="showEditDrawer" :width="400" placement="right">
    <NDrawerContent title="编辑列">
      <NForm label-placement="left" label-width="100" label-align="left">
        <NFormItem label="显示名称">
          <NInput
            :value="currentEditColumn?.title"
            :disabled="!currentEditColumn"
            @update:value="val => currentEditColumn && (currentEditColumn.title = val)"
          ></NInput>
        </NFormItem>

        <NFormItem label="字段名">
          <NInput :value="currentEditColumn?.key" disabled></NInput>
        </NFormItem>

        <NFormItem label="表头对齐">
          <NRadioGroup
            :value="currentEditColumn?.titleAlign"
            @update:value="val => currentEditColumn && (currentEditColumn.titleAlign = val)"
          >
            <NRadioButton value="left">左对齐</NRadioButton>
            <NRadioButton value="center">居中</NRadioButton>
            <NRadioButton value="right">右对齐</NRadioButton>
          </NRadioGroup>
        </NFormItem>

        <NFormItem label="内容对齐">
          <NRadioGroup
            :value="currentEditColumn?.align"
            @update:value="val => currentEditColumn && (currentEditColumn.align = val)"
          >
            <NRadioButton value="left">左对齐</NRadioButton>
            <NRadioButton value="center">居中</NRadioButton>
            <NRadioButton value="right">右对齐</NRadioButton>
          </NRadioGroup>
        </NFormItem>

        <!-- 列宽设置 -->
        <NFormItem label="列宽">
          <NInputNumber
            :value="currentEditColumn?.width"
            :min="50"
            :max="800"
            :step="10"
            placeholder="请输入列宽"
            @update:value="val => currentEditColumn && (currentEditColumn.width = val)"
          >
            <template #suffix>px</template>
          </NInputNumber>
        </NFormItem>

        <!-- 最小宽度设置 -->
        <NFormItem label="最小宽度">
          <NInputNumber
            :value="currentEditColumn?.minWidth"
            :min="30"
            :max="500"
            :step="10"
            placeholder="请输入最小宽度"
            @update:value="val => currentEditColumn && (currentEditColumn.minWidth = val)"
          >
            <template #suffix>px</template>
          </NInputNumber>
        </NFormItem>

        <!-- 固定列设置 -->
        <NFormItem label="固定列">
          <NRadioGroup
            :value="currentEditColumn?.fixed || 'none'"
            @update:value="val => currentEditColumn && (currentEditColumn.fixed = val === 'none' ? undefined : val)"
          >
            <NRadioButton value="none">不固定</NRadioButton>
            <NRadioButton value="left">固定左侧</NRadioButton>
            <NRadioButton value="right">固定右侧</NRadioButton>
          </NRadioGroup>
        </NFormItem>

        <!-- 只在非 index 字段时显示排序开关 -->
        <NFormItem v-if="!isIndexColumn" label="开启排序">
          <NSwitch
            :value="currentEditColumn?.sortable"
            @update:value="val => currentEditColumn && (currentEditColumn.sortable = val)"
          ></NSwitch>
        </NFormItem>

        <!-- 添加筛选功能相关配置 -->
        <NFormItem v-if="!isIndexColumn" label="开启筛选">
          <NSwitch
            :value="!!currentEditColumn?.filter"
            @update:value="
              val => {
                if (currentEditColumn) {
                  if (val) {
                    // 启用筛选时，初始化筛选相关属性
                    currentEditColumn.filter = true;
                    currentEditColumn.filterOptions = currentEditColumn.filterOptions || [];
                  } else {
                    // 禁用筛选时，清除筛选相关属性
                    delete currentEditColumn.filter;
                    delete currentEditColumn.filterOptions;
                  }
                }
              }
            "
          ></NSwitch>
        </NFormItem>

        <!-- 筛选选项管理，仅在开启筛选时显示 -->
        <template v-if="currentEditColumn?.filter">
          <NDivider>筛选选项管理</NDivider>

          <NFormItem label="自动获取选项">
            <NButton size="small" @click="generateFilterOptions(currentEditColumn)">从当前数据生成选项</NButton>
          </NFormItem>

          <!-- 添加新筛选选项 -->
          <NSpace vertical>
            <NInputGroup>
              <NInput v-model:value="newFilterLabel" placeholder="显示文本"></NInput>
              <NInput v-model:value="newFilterValue" placeholder="筛选值"></NInput>
              <NButton type="primary" :disabled="!newFilterLabel || !newFilterValue" @click="addFilterOption">
                添加
              </NButton>
            </NInputGroup>
          </NSpace>

          <!-- 筛选选项列表 -->
          <NSpace vertical style="margin-top: 12px; max-height: 200px; overflow-y: auto">
            <div
              v-for="(option, index) in currentEditColumn.filterOptions"
              :key="index"
              style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0"
            >
              <span>{{ option.label }}</span>
              <NButton text type="error" @click="removeFilterOption(index)">
                <template #icon>
                  <NIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                        fill="currentColor"
                      />
                    </svg>
                  </NIcon>
                </template>
              </NButton>
            </div>
          </NSpace>
        </template>

        <!-- 添加 ellipsis 开关 -->
        <NFormItem v-if="!isIndexColumn" label="文本省略">
          <NSwitch
            :value="!!currentEditColumn?.ellipsis"
            @update:value="
              val => {
                if (currentEditColumn) {
                  if (val) {
                    currentEditColumn.ellipsis = { tooltip: true };
                  } else {
                    delete currentEditColumn.ellipsis;
                  }
                }
              }
            "
          ></NSwitch>
        </NFormItem>

        <!-- 只在启用 ellipsis 时显示 tooltip 开关 -->
        <NFormItem v-if="currentEditColumn?.ellipsis" label="显示tooltip">
          <NSwitch
            :value="currentEditColumn?.ellipsis?.tooltip"
            @update:value="
              val => {
                if (currentEditColumn?.ellipsis) {
                  currentEditColumn.ellipsis.tooltip = val;
                }
              }
            "
          ></NSwitch>
        </NFormItem>
      </NForm>

      <template #footer>
        <NSpace justify="end">
          <NButton @click="showEditDrawer = false">取消</NButton>
          <NButton type="primary" :disabled="!currentEditColumn" @click="saveColumnEdit">保存</NButton>
        </NSpace>
      </template>
    </NDrawerContent>
  </NDrawer>
</template>

<style>
:deep(.n-drawer .n-form-item) {
  margin-bottom: 16px;
}

:deep(.n-drawer .n-radio-group) {
  width: 100%;
  display: flex;
  gap: 8px;
}

:deep(.n-drawer .n-radio-button) {
  flex: 1;
  text-align: center;
}

.n-input-group {
  display: flex;
  gap: 8px;
}

.n-input-group .n-input {
  flex: 1;
}

.n-divider {
  margin: 16px 0;
}

/* 统一滚动条样式 - 与列设置保持一致 */
/* 针对抽屉整体滚动条 */
:deep(.n-drawer) ::-webkit-scrollbar {
  width: 6px;
}

:deep(.n-drawer) ::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

:deep(.n-drawer) ::-webkit-scrollbar-thumb {
  background: var(--n-scrollbar-color, #d1d5db);
  border-radius: 3px;
  transition: all 0.2s ease;
  opacity: 0.6;
}

:deep(.n-drawer) ::-webkit-scrollbar-thumb:hover {
  background: var(--n-scrollbar-color-hover, #9ca3af);
  opacity: 1;
}

/* 针对抽屉内容区域 */
:deep(.n-drawer-content) ::-webkit-scrollbar {
  width: 6px;
}

:deep(.n-drawer-content) ::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

:deep(.n-drawer-content) ::-webkit-scrollbar-thumb {
  background: var(--n-scrollbar-color, #d1d5db);
  border-radius: 3px;
  transition: all 0.2s ease;
  opacity: 0.6;
}

:deep(.n-drawer-content) ::-webkit-scrollbar-thumb:hover {
  background: var(--n-scrollbar-color-hover, #9ca3af);
  opacity: 1;
}

/* 针对抽屉内容主体 */
:deep(.n-drawer-content__body) ::-webkit-scrollbar {
  width: 6px;
}

:deep(.n-drawer-content__body) ::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 3px;
}

:deep(.n-drawer-content__body) ::-webkit-scrollbar-thumb {
  background: var(--n-scrollbar-color, #d1d5db);
  border-radius: 3px;
  transition: all 0.2s ease;
  opacity: 0.6;
}

:deep(.n-drawer-content__body) ::-webkit-scrollbar-thumb:hover {
  background: var(--n-scrollbar-color-hover, #9ca3af);
  opacity: 1;
}

/* 针对NScrollbar组件的样式覆盖 */
:deep(.n-scrollbar-rail) {
  right: 2px !important;
  width: 6px !important;
  border-radius: 3px !important;
}

:deep(.n-scrollbar-rail .n-scrollbar-rail__scrollbar) {
  width: 6px !important;
  border-radius: 3px !important;
  background: var(--n-scrollbar-color, #d1d5db) !important;
  transition: all 0.2s ease !important;
  opacity: 0.6 !important;
}

:deep(.n-scrollbar-rail .n-scrollbar-rail__scrollbar:hover) {
  background: var(--n-scrollbar-color-hover, #9ca3af) !important;
  opacity: 1 !important;
}

/* 隐藏默认的滚动条轨道背景 */
:deep(.n-scrollbar-track) {
  background: transparent !important;
}

/* 滚动条容器悬停时显示 */
:deep(.n-drawer):hover ::-webkit-scrollbar-thumb {
  opacity: 0.8 !important;
}

/* 更具体的抽屉滚动条样式 */
.n-drawer-container ::-webkit-scrollbar {
  width: 6px !important;
}

.n-drawer-container ::-webkit-scrollbar-track {
  background: transparent !important;
  border-radius: 3px !important;
}

.n-drawer-container ::-webkit-scrollbar-thumb {
  background: var(--n-scrollbar-color, #d1d5db) !important;
  border-radius: 3px !important;
  transition: all 0.2s ease !important;
  opacity: 0.6 !important;
}

.n-drawer-container ::-webkit-scrollbar-thumb:hover {
  background: var(--n-scrollbar-color-hover, #9ca3af) !important;
  opacity: 1 !important;
}

/* 针对具体的抽屉内容 */
.n-drawer .n-drawer-content .n-drawer-content__body ::-webkit-scrollbar {
  width: 6px !important;
}

.n-drawer .n-drawer-content .n-drawer-content__body ::-webkit-scrollbar-track {
  background: transparent !important;
  border-radius: 3px !important;
}

.n-drawer .n-drawer-content .n-drawer-content__body ::-webkit-scrollbar-thumb {
  background: var(--n-scrollbar-color, #d1d5db) !important;
  border-radius: 3px !important;
  transition: all 0.2s ease !important;
  opacity: 0.6 !important;
}

.n-drawer .n-drawer-content .n-drawer-content__body ::-webkit-scrollbar-thumb:hover {
  background: var(--n-scrollbar-color-hover, #9ca3af) !important;
  opacity: 1 !important;
}

/* 最终兜底方案 - 全局覆盖当前抽屉的滚动条 */
[data-v-inspector] .n-drawer ::-webkit-scrollbar,
div[style*="right"] ::-webkit-scrollbar {
  width: 6px !important;
}

[data-v-inspector] .n-drawer ::-webkit-scrollbar-track,
div[style*="right"] ::-webkit-scrollbar-track {
  background: transparent !important;
  border-radius: 3px !important;
}

[data-v-inspector] .n-drawer ::-webkit-scrollbar-thumb,
div[style*="right"] ::-webkit-scrollbar-thumb {
  background: var(--n-scrollbar-color, #d1d5db) !important;
  border-radius: 3px !important;
  transition: all 0.2s ease !important;
  opacity: 0.6 !important;
}

[data-v-inspector] .n-drawer ::-webkit-scrollbar-thumb:hover,
div[style*="right"] ::-webkit-scrollbar-thumb:hover {
  background: var(--n-scrollbar-color-hover, #9ca3af) !important;
  opacity: 1 !important;
}
</style>
