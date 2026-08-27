<script setup lang="ts">
import { inject, watch } from 'vue';

// 从主组件注入状态和方法
const tableState: any = inject('tableState');

const {
  tableSize,
  showBorder,
  showStripe,
  enableSingleSelect,
  showActionColumn,
  pagination,
  tableScrollWidth,
  tableHeight,
  firstColumnType,
  checkedRowKeys
} = tableState;

// 首列选择类型选项
const firstColumnOptions = [
  { label: '复选框', value: 'checkbox' },
  { label: '索引', value: 'index' }
];

// 监听首列类型变化，同步到enableSingleSelect
watch(firstColumnType, newType => {
  //console.log('🔄 首列类型切换为:', newType);

  // 清空选中状态
  checkedRowKeys.value = [];
  //console.log('🧹 已清空选中状态');

  if (newType === 'index') {
    // 索引类型：显示序号
    enableSingleSelect.value = true;
  }
  // 复选框模式下不强制修改enableSingleSelect的值，保持用户的选择
});

// 监听单选/多选切换，清空选中状态
watch(enableSingleSelect, () => {
  // 清空选中状态
  checkedRowKeys.value = [];
  //console.log('🧹 单选/多选切换，已清空选中状态');
});
</script>

<template>
  <div>
    <!-- 表格大小设置 -->
    <div class="setting-item">
      <div class="setting-label">表格的大小</div>
      <div class="setting-control">
        <NRadioGroup v-model:value="tableSize" name="tableSize" class="size-group" size="small">
          <NRadioButton value="small">紧凑</NRadioButton>
          <NRadioButton value="medium">默认</NRadioButton>
          <NRadioButton value="large">宽松</NRadioButton>
        </NRadioGroup>
      </div>
    </div>

    <!-- 表格纵向边框 -->
    <div class="setting-item">
      <div class="setting-label">表格纵向边框</div>
      <div class="setting-control">
        <NSwitch v-model:value="showBorder"></NSwitch>
      </div>
    </div>

    <!-- 表格隔行换色 -->
    <div class="setting-item">
      <div class="setting-label">表格条纹</div>
      <div class="setting-control">
        <NSpace align="center">
          <NSwitch v-model:value="showStripe"></NSwitch>
        </NSpace>
      </div>
    </div>

    <!-- 是否开启单选 -->
    <div class="setting-item">
      <div class="setting-label">首列的选择类型</div>
      <div class="setting-control">
        <NSelect
          v-model:value="firstColumnType"
          :options="firstColumnOptions"
          placeholder="复选框"
          style="width: 120px"
        />
      </div>
    </div>

    <!-- 复选框单选开关 -->
    <div v-if="firstColumnType === 'checkbox'" class="setting-item">
      <div class="setting-label">是否开启单选</div>
      <div class="setting-control">
        <NSwitch v-model:value="enableSingleSelect"></NSwitch>
      </div>
    </div>

    <!-- 是否显示操作栏 -->
    <div class="setting-item">
      <div class="setting-label">是否显示操作栏</div>
      <div class="setting-control">
        <NSwitch v-model:value="showActionColumn"></NSwitch>
      </div>
    </div>

    <!-- 每页显示条数 -->
    <div class="setting-item">
      <div class="setting-label">每页显示条数</div>
      <div class="setting-control">
        <NInputNumber v-model:value="pagination.pageSize"></NInputNumber>
      </div>
    </div>

    <!-- 表格宽度 -->
    <div class="setting-item">
      <div class="setting-label">表格宽度</div>
      <div class="setting-control">
        <NInputNumber v-model:value="tableScrollWidth"></NInputNumber>
      </div>
    </div>

    <!-- 表格高度 -->
    <div class="setting-item">
      <div class="setting-label">表格高度</div>
      <div class="setting-control">
        <NInputNumber v-model:value="tableHeight"></NInputNumber>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  padding: 10px 0;
  border-bottom: 1px solid var(--n-border-color);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  flex: 0 0 120px;
  color: var(--n-text-color-2);
  font-size: 14px;
}

.setting-control {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.size-group {
  width: 100%;
}

:deep(.n-radio-group) {
  display: flex;
  gap: 8px;
}

:deep(.n-radio-button) {
  flex: 1;
  text-align: center;
}

:deep(.n-select),
:deep(.n-input),
:deep(.n-input-number) {
  width: 100%;
}
</style>
