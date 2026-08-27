<script lang="ts">
import { defineComponent, h, inject, toRefs } from 'vue';
import { NDivider, NSpace, NCard, NGrid, NGridItem, NFormItem, NSelect, NAlert, NIcon } from 'naive-ui';

export default defineComponent({
  name: 'DialogSettings',
  components: {
    NDivider, NSpace, NCard, NGrid, NGridItem, NFormItem, NSelect, NAlert, NIcon
  },
  setup() {
    // 从主组件注入状态
    const tableState: any = inject('tableState');

    // 检查 tableState 是否是响应式对象，如果是则使用 toRefs，否则直接使用其属性
    const dialogWidth = tableState?.dialogWidth;
    const dialogHeight = tableState?.dialogHeight;
    const editDialogWidth = tableState?.editDialogWidth;
    const editDialogHeight = tableState?.editDialogHeight;

    // 宽度选项
    const widthOptions = [
      { label: '10%', value: '10%' },
      { label: '20%', value: '20%' },
      { label: '30%', value: '30%' },
      { label: '40%', value: '40%' },
      { label: '50%', value: '50%' },
      { label: '60%', value: '60%' },
      { label: '70%', value: '70%' },
      { label: '80%', value: '80%' },
      { label: '90% (默认)', value: '90%' },
      { label: '100%', value: '100%' },
      { label: '200px', value: '200px' },
      { label: '400px', value: '400px' },
      { label: '600px', value: '600px' },
      { label: '800px', value: '800px' },
      { label: '1000px', value: '1000px' },
      { label: '1200px', value: '1200px' }
    ];

    // 高度选项
    const heightOptions = [
      { label: '自动 (默认)', value: 'auto' },
      { label: '10vh', value: '10vh' },
      { label: '20vh', value: '20vh' },
      { label: '30vh', value: '30vh' },
      { label: '40vh', value: '40vh' },
      { label: '50vh', value: '50vh' },
      { label: '60vh', value: '60vh' },
      { label: '70vh', value: '70vh' },
      { label: '80vh', value: '80vh' },
      { label: '90vh', value: '90vh' },
      { label: '100vh', value: '100vh' },
      { label: '200px', value: '200px' },
      { label: '300px', value: '300px' },
      { label: '400px', value: '400px' },
      { label: '600px', value: '600px' },
      { label: '800px', value: '800px' }
    ];

    return {
      dialogWidth,
      dialogHeight,
      editDialogWidth,
      editDialogHeight,
      widthOptions,
      heightOptions,
    };
  }
});
</script>

<template>
  <div class="dialog-settings">
    <NDivider>弹出框尺寸设置</NDivider>
    <div class="settings-description">配置新建和编辑弹出框的尺寸，设置将自动应用到对应的弹出框组件</div>

    <NSpace vertical size="large" style="margin: 20px 0">
      <NCard title="新建弹出框尺寸" size="small">
        <NGrid :cols="24" :x-gap="12">
          <NGridItem :span="12">
            <NFormItem label="宽度">
              <NSelect v-model:value="dialogWidth" :options="widthOptions" placeholder="选择宽度" />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="12">
            <NFormItem label="高度">
              <NSelect v-model:value="dialogHeight" :options="heightOptions" placeholder="选择高度" />
            </NFormItem>
          </NGridItem>
        </NGrid>
      </NCard>

      <NCard title="编辑弹出框尺寸" size="small">
        <NGrid :cols="24" :x-gap="12">
          <NGridItem :span="12">
            <NFormItem label="宽度">
              <NSelect v-model:value="editDialogWidth" :options="widthOptions" placeholder="选择宽度" />
            </NFormItem>
          </NGridItem>
          <NGridItem :span="12">
            <NFormItem label="高度">
              <NSelect v-model:value="editDialogHeight" :options="heightOptions" placeholder="选择高度" />
            </NFormItem>
          </NGridItem>
        </NGrid>
      </NCard>
    </NSpace>

    <div class="note-section">
      <NAlert type="info">
        <template #icon>
          <NIcon>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </NIcon>
        </template>
        <p>设置将在点击抽屉顶部的"保存"按钮后保存到服务器</p>
      </NAlert>
    </div>
  </div>
</template>

<style scoped>
.dialog-settings {
  padding: 16px;
}

.settings-description {
  margin-bottom: 16px;
  color: #666;
  font-size: 14px;
}

.note-section {
  margin-top: 24px;
}
</style>
