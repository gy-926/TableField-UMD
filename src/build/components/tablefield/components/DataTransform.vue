<script setup lang="ts">
import { inject, ref } from 'vue';

// 从主组件注入状态和方法
const tableState: any = inject('tableState');
const tableMethods: any = inject('tableMethods');

// 获取表格数据和列
const { transformRules, availableFields } = tableState;

// 编辑状态管理
const editingRule = ref<any>(null);
const showEditDialog = ref(false);

// 编辑表单数据
const editForm = ref<{
  field: string | null;
  fieldLabel: string;
  type: string;
  mappings: { value: string; label: string; color: string }[];
  dateFormat: string;
  imageConfig: {
    width: number;
    height: number;
    previewable: boolean;
  };
}>({
  field: null,
  fieldLabel: '',
  type: 'tag',
  mappings: [{ value: '', label: '', color: 'default' }],
  dateFormat: 'YYYY-MM-DD HH:mm:ss', // 日期格式配置
  imageConfig: {
    width: 80,
    height: 80,
    previewable: true
  }
});

// 颜色选项
const colorOptions = [
  { label: '默认', value: 'default' },
  { label: '主要', value: 'primary' },
  { label: '信息', value: 'info' },
  { label: '成功', value: 'success' },
  { label: '警告', value: 'warning' },
  { label: '错误', value: 'error' },
  { label: '自定义', value: 'custom' }
];

// 判断颜色值是否为自定义 hex 颜色
const isCustomColor = (color: string) => !!color?.startsWith('#');

// 颜色模式切换：预设 → 预设名称；切换到自定义 → 初始化 hex
const onColorModeChange = (mapping: { value: string; label: string; color: string }, newMode: string) => {
  mapping.color = newMode === 'custom' ? '#409EFF' : newMode;
};

// 转换类型选项（等待具体内容补充）
const transformTypeOptions = [
  { label: '标记转换', value: 'tag' },
  { label: '日期转换', value: 'date' },
  { label: '数字转换', value: 'number' },
  { label: '文本转换', value: 'text' },
  { label: '图片转换', value: 'image' },
  { label: '其他转换', value: 'other' }
  // 这里等待补充更多转换类型
];

// 根据转换类型获取对应的标签
const getTypeLabel = (type: string) => {
  const typeOption = transformTypeOptions.find(option => option.value === type);
  return typeOption ? typeOption.label : type;
};

// 日期格式选项
const dateFormatOptions = [
  { label: '年-月-日 时:分:秒', value: 'YYYY-MM-DD HH:mm:ss' },
  { label: '年-月-日', value: 'YYYY-MM-DD' },
  { label: '月-日', value: 'MM-DD' },
  { label: '年-月', value: 'YYYY-MM' },
  { label: '时:分:秒', value: 'HH:mm:ss' }
];

// 添加新的转换规则
const addTransformRule = () => {
  editingRule.value = null;
  editForm.value = {
    field: null, // 使用 null 而不是空字符串
    fieldLabel: '',
    type: 'tag',
    mappings: [{ value: '', label: '', color: 'default' }],
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    imageConfig: {
      width: 80,
      height: 80,
      previewable: true
    }
  };
  showEditDialog.value = true;
};

// 编辑转换规则
const editTransformRule = (rule: any) => {
  editingRule.value = rule;
  editForm.value = {
    field: rule.field,
    fieldLabel: rule.fieldLabel,
    type: rule.type,
    mappings: rule.params?.mappings ? [...rule.params.mappings] : [{ value: '', label: '', color: 'default' }],
    dateFormat: rule.params?.dateFormat || 'YYYY-MM-DD HH:mm:ss',
    imageConfig: rule.params?.imageConfig
      ? { ...rule.params.imageConfig }
      : {
          width: 80,
          height: 80,
          previewable: true,
          defaultImage: ''
        }
  };
  showEditDialog.value = true;
};

// 删除转换规则
const removeTransformRule = (index: number) => {
  tableMethods.removeTransformRule(index);
};

// 添加映射项
const addMapping = () => {
  editForm.value.mappings.push({ value: '', label: '', color: 'default' });
};

// 删除映射项
const removeMapping = (index: number) => {
  if (editForm.value.mappings.length > 1) {
    editForm.value.mappings.splice(index, 1);
  }
};

// 字段选择变化处理
const handleFieldChange = (fieldValue: string | null) => {
  if (fieldValue) {
    const field = availableFields.value.find((f: any) => f.value === fieldValue);
    editForm.value.fieldLabel = field?.label || fieldValue;
  } else {
    editForm.value.fieldLabel = '';
  }
};

// 自动获取域名前缀
const getDomainPrefix = () => {
  // return 'http://datav.kivii.org';
  return `${window.location.protocol}//${window.location.host}`;
};

// 验证转换规则
const validateTransformRule = () => {
  if (!editForm.value.field) {
    window.$message?.error('请选择字段');
    return false;
  }

  if (!editForm.value.type) {
    window.$message?.error('请选择转换类型');
    return false;
  }

  // 对于标记转换，需要验证映射
  if (editForm.value.type === 'tag') {
    const validMappings = editForm.value.mappings.filter(mapping => mapping.value !== '' && mapping.label !== '');
    if (validMappings.length === 0) {
      window.$message?.error('请添加至少一个有效的标记映射');
      return false;
    }
  }

  // 对于文本转换，需要验证颜色映射
  if (editForm.value.type === 'text') {
    const validMappings = editForm.value.mappings.filter(mapping => mapping.value !== '');
    if (validMappings.length === 0) {
      window.$message?.error('请添加至少一个有效的文本颜色映射');
      return false;
    }
  }

  // 对于日期转换，需要验证日期格式
  if (editForm.value.type === 'date') {
    if (!editForm.value.dateFormat) {
      window.$message?.error('请选择日期格式');
      return false;
    }
  }

  // 对于图片转换，需要验证图片配置
  if (editForm.value.type === 'image') {
    if (editForm.value.imageConfig.width <= 0 || editForm.value.imageConfig.height <= 0) {
      window.$message?.error('图片宽高必须大于0');
      return false;
    }
  }

  return true;
};

// 构建转换规则参数
const buildTransformParams = () => {
  const validMappings = editForm.value.mappings.filter(mapping => mapping.value !== '' && mapping.label !== '');

  if (editForm.value.type === 'tag') {
    return { mappings: validMappings };
  } else if (editForm.value.type === 'text') {
    const validTextMappings = editForm.value.mappings.filter(mapping => mapping.value !== '');
    return { mappings: validTextMappings };
  } else if (editForm.value.type === 'date') {
    return { dateFormat: editForm.value.dateFormat };
  } else if (editForm.value.type === 'image') {
    return {
      imageConfig: {
        ...editForm.value.imageConfig,
        domainPrefix: getDomainPrefix()
      }
    };
  }

  return {};
};

// 保存转换规则
const saveTransformRule = () => {
  if (!validateTransformRule()) {
    return;
  }

  const params = buildTransformParams();

  const ruleData = {
    field: editForm.value.field!,
    fieldLabel:
      editForm.value.fieldLabel ||
      availableFields.value.find((f: any) => f.value === editForm.value.field)?.label ||
      editForm.value.field!,
    type: editForm.value.type,
    typeLabel: getTypeLabel(editForm.value.type),
    params
  };

  if (editingRule.value) {
    // 编辑模式：替换现有规则
    const index = transformRules.value.findIndex((rule: any) => rule === editingRule.value);
    if (index !== -1) {
      transformRules.value[index] = ruleData;
    }
  } else {
    // 新增模式：添加新规则
    tableMethods.addTransformRule(ruleData);
  }

  showEditDialog.value = false;
  editingRule.value = null;
};

// 取消编辑
const cancelEdit = () => {
  showEditDialog.value = false;
  editingRule.value = null;
};

// 应用转换规则
const applyTransforms = () => {
  tableMethods.applyTransformations();
};

// 重置数据转换
const resetData = () => {
  tableMethods.restoreOriginalData();
};

defineOptions({
  name: 'DataTransform'
});
</script>

<template>
  <div>
    <div class="transform-config-header">
      <!-- <span>数据转换配置</span> -->
      <div class="header-actions">
        <NButton size="small" type="primary" @click="addTransformRule">添加转换</NButton>
        <NButton v-if="transformRules.length > 0" size="small" @click="applyTransforms">应用转换</NButton>
        <NButton v-if="transformRules.length > 0" size="small" @click="resetData">重置数据</NButton>
      </div>
    </div>

    <div class="transform-rules-list">
      <NScrollbar style="max-height: calc(100vh - 200px)">
        <div class="transform-rules-container">
          <div v-for="(rule, index) in transformRules" :key="index" class="transform-rule-item">
            <div class="rule-item-content">
              <div class="rule-main-info">
                <span class="rule-field-label">{{ rule.fieldLabel }}</span>
                <span class="rule-field-key">({{ rule.field }})</span>
              </div>
              <div class="rule-sub-info">
                <span class="rule-type">{{ rule.typeLabel }}</span>
                <span v-if="rule.type === 'tag'" class="rule-mappings-count">
                  {{ rule.params?.mappings?.length || 0 }} 个映射
                </span>
                <span v-else-if="rule.type === 'date'" class="rule-format">
                  格式: {{ rule.params?.dateFormat || '未设置' }}
                </span>
                <span v-else-if="rule.type === 'text'" class="rule-mappings-count">
                  {{ rule.params?.mappings?.length || 0 }} 个颜色映射
                </span>
                <span v-else-if="rule.type === 'image'" class="rule-image-config">
                  尺寸: {{ rule.params?.imageConfig?.width || 80 }}×{{ rule.params?.imageConfig?.height || 80 }}
                  {{ rule.params?.imageConfig?.previewable ? '可预览' : '不可预览' }}
                  <span v-if="rule.params?.imageConfig?.domainPrefix" class="domain-prefix">
                    | 域名: {{ rule.params.imageConfig.domainPrefix }}
                  </span>
                </span>
                <span v-else class="rule-config">{{ rule.typeLabel }}配置</span>
              </div>
            </div>

            <div class="rule-item-right">
              <NButton text @click="editTransformRule(rule)">
                <template #icon>
                  <NIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path
                        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a.996.996 0 0 0 0-1.41l-2.34-2.34a.996.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                        fill="currentColor"
                      />
                    </svg>
                  </NIcon>
                </template>
              </NButton>
              <NButton text @click="removeTransformRule(Number(index))">
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
          </div>

          <div v-if="transformRules.length === 0" class="empty-state">
            <span>暂无数据转换规则</span>
            <NButton size="small" type="primary" @click="addTransformRule">添加第一个转换规则</NButton>
          </div>
        </div>
      </NScrollbar>
    </div>

    <!-- 编辑对话框 -->
    <NModal
      v-model:show="showEditDialog"
      preset="card"
      :title="editingRule ? '编辑转换规则' : '添加转换规则'"
      style="width: 600px"
      :mask-closable="false"
    >
      <div class="edit-form">
        <div class="form-item">
          <label>选择字段</label>
          <NSelect
            v-model:value="editForm.field"
            :options="availableFields"
            placeholder="请选择需要转换的字段"
            clearable
            filterable
            @update:value="handleFieldChange"
          />
        </div>

        <div class="form-item">
          <label>字段显示名称</label>
          <NInput v-model:value="editForm.fieldLabel" placeholder="字段显示名称" :disabled="true" />
        </div>

        <div class="form-item">
          <label>转换类型</label>
          <NSelect
            v-model:value="editForm.type"
            :options="transformTypeOptions"
            placeholder="请选择转换类型"
            clearable
          />
        </div>

        <!-- 标记转换配置 -->
        <div v-if="editForm.type === 'tag'" class="form-item">
          <label>转换映射</label>
          <div class="mappings-container">
            <div v-for="(mapping, index) in editForm.mappings" :key="index" class="mapping-item">
              <div class="mapping-row">
                <div class="mapping-field">
                  <label>原值</label>
                  <NInput v-model:value="mapping.value" placeholder="表格中的原始值" />
                </div>
                <div class="mapping-field">
                  <label>显示值</label>
                  <NInput v-model:value="mapping.label" placeholder="转换后显示的值" />
                </div>
                <div class="mapping-field">
                  <label>颜色</label>
                  <div class="color-select-wrapper">
                    <NSelect
                      :value="isCustomColor(mapping.color) ? 'custom' : mapping.color"
                      :options="colorOptions"
                      @update:value="onColorModeChange(mapping, $event)"
                    />
                    <NColorPicker
                      v-if="isCustomColor(mapping.color)"
                      v-model:value="mapping.color"
                      :show-alpha="false"
                      size="small"
                    />
                  </div>
                </div>
                <NButton
                  circle
                  type="error"
                  size="small"
                  class="remove-mapping-btn"
                  :disabled="editForm.mappings.length === 1"
                  @click="removeMapping(index)"
                >
                  <template #icon>
                    <NIcon>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M19 13H5v-2h14v2z" fill="currentColor" />
                      </svg>
                    </NIcon>
                  </template>
                </NButton>
              </div>
            </div>

            <div class="add-mapping">
              <NButton size="small" dashed @click="addMapping">
                <template #icon>
                  <NIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
                    </svg>
                  </NIcon>
                </template>
                添加映射
              </NButton>
            </div>
          </div>
        </div>

        <!-- 文本转换配置 -->
        <div v-if="editForm.type === 'text'" class="form-item">
          <label>颜色映射</label>
          <div class="mappings-container">
            <div v-for="(mapping, index) in editForm.mappings" :key="index" class="mapping-item">
              <div class="mapping-row">
                <div class="mapping-field">
                  <label>原值</label>
                  <NInput v-model:value="mapping.value" placeholder="表格中的原始值" />
                </div>
                <div class="mapping-field">
                  <label>文本颜色</label>
                  <div class="color-select-wrapper">
                    <NSelect
                      :value="isCustomColor(mapping.color) ? 'custom' : mapping.color"
                      :options="colorOptions"
                      @update:value="onColorModeChange(mapping, $event)"
                    />
                    <NColorPicker
                      v-if="isCustomColor(mapping.color)"
                      v-model:value="mapping.color"
                      :show-alpha="false"
                      size="small"
                    />
                  </div>
                </div>
                <NButton
                  circle
                  type="error"
                  size="small"
                  class="remove-mapping-btn"
                  :disabled="editForm.mappings.length === 1"
                  @click="removeMapping(index)"
                >
                  <template #icon>
                    <NIcon>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M19 13H5v-2h14v2z" fill="currentColor" />
                      </svg>
                    </NIcon>
                  </template>
                </NButton>
              </div>
            </div>

            <div class="add-mapping">
              <NButton size="small" dashed @click="addMapping">
                <template #icon>
                  <NIcon>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
                    </svg>
                  </NIcon>
                </template>
                添加映射
              </NButton>
            </div>
          </div>
        </div>

        <!-- 日期转换配置 -->
        <div v-if="editForm.type === 'date'" class="form-item">
          <label>日期格式</label>
          <NSelect
            v-model:value="editForm.dateFormat"
            :options="dateFormatOptions"
            placeholder="请选择日期格式"
            clearable
          />
        </div>

        <!-- 图片转换配置 -->
        <div v-if="editForm.type === 'image'" class="form-item">
          <label>图片配置</label>
          <div class="image-config">
            <div class="config-item">
              <label>宽度</label>
              <NInputNumber v-model:value="editForm.imageConfig.width" :min="1" :max="500" />
            </div>
            <div class="config-item">
              <label>高度</label>
              <NInputNumber v-model:value="editForm.imageConfig.height" :min="1" :max="500" />
            </div>
            <div class="config-item">
              <label>可预览</label>
              <NCheckbox v-model:checked="editForm.imageConfig.previewable">启用图片预览</NCheckbox>
            </div>
            <div class="config-item">
              <label>域名前缀</label>
              <NInput :value="getDomainPrefix()" disabled placeholder="自动获取当前域名" />
            </div>
          </div>
        </div>

        <!-- 其他转换类型的配置 -->
        <div
          v-if="editForm.type && editForm.type !== 'tag' && editForm.type !== 'text' && editForm.type !== 'date' && editForm.type !== 'image'"
          class="form-item"
        >
          <label>转换配置</label>
          <div class="config-placeholder">
            <NAlert type="info" :show-icon="false">{{ getTypeLabel(editForm.type) }}配置功能开发中...</NAlert>
          </div>
        </div>
      </div>

      <template #action>
        <div class="dialog-actions">
          <NButton @click="cancelEdit">取消</NButton>
          <NButton type="primary" @click="saveTransformRule">保存</NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
.transform-config-header {
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

.transform-rules-container {
  padding: 8px 0;
}

.transform-rule-item {
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
  margin-bottom: 4px;
}

.rule-field-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--n-text-color);
}

.rule-field-key {
  font-size: 12px;
  color: var(--n-text-color-3);
  margin-left: 8px;
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

.rule-mappings-count {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.rule-format {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.rule-config {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.rule-image-config {
  font-size: 12px;
  color: var(--n-text-color-3);
}

.domain-prefix {
  color: var(--n-primary-color);
  font-weight: 500;
}

.rule-item-right {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s;
}

.transform-rule-item:hover .rule-item-right {
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

.mappings-container {
  border: 1px solid var(--n-border-color);
  border-radius: 6px;
  padding: 12px;
}

.mapping-item {
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px dashed var(--n-border-color);
}

.mapping-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.mapping-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.mapping-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mapping-field label {
  font-size: 12px;
  color: var(--n-text-color-2);
}

.remove-mapping-btn {
  margin-bottom: 4px;
}

.color-select-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.color-select-wrapper .n-select {
  flex: 1;
}

.custom-color-row {
  margin-top: 6px;
}

.add-mapping {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.config-placeholder {
  padding: 12px;
}

.image-config {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 12px;
  background: var(--n-card-color);
  border-radius: 6px;
}

.image-config .config-item:last-child {
  grid-column: 1 / -1;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item label {
  font-size: 12px;
  color: var(--n-text-color-2);
  font-weight: 500;
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
