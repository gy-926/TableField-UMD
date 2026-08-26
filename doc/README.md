# 新人开发手册

这是组件开发的唯一规范文档，包含开发流程、样式限制、AI 提示词和发布检查。主项目接入人员只需另看 [UMD 加载指南](./UMD读取指南.md)。

文档与代码冲突时，以实际代码和 `project.config.js` 为准，并在同一提交中修正文档。不要再新增开发规范类 Markdown 文件。

## 1. 项目和交付物

一个仓库对应一个业务 UMD，最终只交付：

```text
dist/<project.config.js 中的 fileName>
```

Vue、ECharts 和 Kivii Bridge 由主项目提供，不打进 UMD。CSS 注入同一个 UMD 文件，不单独交付样式文件。

```text
project.config.js            项目身份、产物名和样式隔离名
src/build.ts                 UMD 入口、组件注册和 manifest
src/build/components/        对外交付的组件
src/build/composables/       可复用业务逻辑
src/build/types/             公共类型
src/build/utils/             无状态工具函数
src/dev/                     本地预览，不进入 UMD
scripts/validate-umd.mjs     构建产物自动验证
umd-test.html                独立加载测试页
```

## 2. 首次运行

统一使用 pnpm，不要混用 npm 或 yarn。

```bash
pnpm install
pnpm dev
```

复制模板后先修改 `project.config.js`：

```js
export default {
  libraryName: 'orderReview',
  fileName: 'order-review.umd.js',
  wrapperClass: 'order-review-wrapper',
  displayName: '订单审核',
  description: '订单审核业务组件',
  author: '团队名称',
  version: '0.1.0',
}
```

- `libraryName`：合法 JavaScript 标识符，供旧方式读取 `window[libraryName]`；
- `fileName`：小写 kebab-case，以 `.umd.js` 结尾；
- `wrapperClass`：小写 kebab-case，以 `-wrapper` 结尾，并在所有 UMD 中唯一。

修改 `fileName` 后同步修改 `umd-test.html` 的脚本路径。若测试页故意读取错误全局变量进行负向测试，必须保留说明注释。

## 3. 新增组件

### 创建组件

文件名和组件名使用 PascalCase，且至少两个单词，例如 `OrderReview.vue`。Props 使用 camelCase，模板事件使用 kebab-case。

```vue
<template>
  <section
    class="rounded-lg border border-slate-200 bg-white p-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
  >
    <h2 class="mb-4 text-base font-semibold">{{ title }}</h2>
    <slot />
    <button
      type="button"
      class="mt-4 rounded-md bg-[var(--color-primary)] px-3 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="loading"
      @click="emit('confirm')"
    >
      确认
    </button>
  </section>
</template>

<script setup lang="ts">
import type { Manifest } from '@/build/types'

export interface Props {
  title?: string
  loading?: boolean
}

withDefaults(defineProps<Props>(), {
  title: '默认标题',
  loading: false,
})

const emit = defineEmits<{ confirm: [] }>()

const manifest: Manifest = {
  name: 'OrderReview',
  type: 'component',
  description: '订单审核组件',
  version: '0.1.0',
  author: '团队名称',
}

defineExpose({ manifest })
</script>
```

组件必须：

- 使用 Vue 3、TypeScript 和 `<script setup>`；
- 为 Props、Emits、公开方法和业务数据定义类型；
- 同时提供亮色和 `dark:` 样式；
- 提供 hover、focus-visible、disabled、loading、空数据和错误状态；
- 业务组件通过 `defineExpose` 暴露 `manifest`；
- 默认使用 Tailwind，仅在无法表达时使用 `<style scoped>`。

### 导出、注册和预览

1. 从 `src/build/components/index.ts` 导出原始组件；
2. 在 `src/build.ts` 中通过 `withWrapper()` 包装并加入 `components`；
3. 更新 `manifest.componentsMap` 和 `componentsDetailed`；
4. 在 `src/dev` 中通过 `@/build` 的正式导出预览；
5. 为关键 Props、Events 和 manifest 扩展 `scripts/validate-umd.mjs`。

禁止从 UMD 正式入口导出未包装的业务组件，也禁止在预览页直接引用裸 `.vue` 文件。

## 4. 数据、图表和对外接口

数据请求统一通过 Bridge：

```ts
import { kivii } from '@kivii.com/bridge'

const response = await kivii.request.send({
  url: '/api/orders',
  method: 'GET',
})
```

- 禁止使用 `fetch`、`axios`、硬编码服务地址或密钥；
- 请求参数和业务数据必须有类型，并在边界校验响应结构；
- 图表统一使用 ECharts，尺寸变化时 `resize()`，卸载时 `dispose()`；
- 图标使用宿主提供的 Font Awesome，不打包整套图标库；
- Props 有合理默认值，且不修改传入对象；
- Events 只传必要数据，Slots 优先使用稳定的具名区域；
- 宿主 Ref 指向 wrapper，可调用 `getManifest()` 和 `getComponentInstance()`。

## 5. UI 和样式限制

### 颜色

品牌色优先使用：

```css
var(--color-primary)
var(--color-primary-hover)
var(--color-primary-light)
var(--color-primary-dark)
var(--color-primary-bg)
```

中性色只使用 Tailwind `slate`：

| 用途 | 亮色 | 暗色 |
| --- | --- | --- |
| 区域背景 | `bg-slate-50` | `dark:bg-slate-950` |
| 卡片背景 | `bg-white` | `dark:bg-slate-900` |
| 主文字 | `text-slate-900` | `dark:text-slate-100` |
| 次文字 | `text-slate-600` | `dark:text-slate-300` |
| 边框 | `border-slate-200` | `dark:border-slate-700` |

成功用 `emerald`、警告用 `amber`、错误用 `red`、信息用 `blue`，只用于对应状态。禁止自创无意义颜色、混用多套灰色、普通卡片使用高饱和渐变，或仅靠颜色表达状态。

### 尺寸和视觉层级

- 间距优先使用 `1`、`2`、`3`、`4`、`6`、`8`；
- 卡片使用 `p-4` 或 `p-6`、`rounded-lg`、无阴影或 `shadow-sm`；
- 按钮和输入框使用 `h-9`/`h-10`、`rounded-md`；
- 页面标题最多 `text-2xl font-semibold`，区块标题用 `text-base`/`text-lg`；
- 正文用 `text-sm`，辅助文字用 `text-xs`/`text-sm`；
- 弹层才可使用 `shadow-lg`。

禁止用 `p-[17px]`、`w-[413px]` 等任意值修补布局，禁止超大标题、多层阴影、玻璃拟态、霓虹和无业务意义的 3D 动效。

### 响应式和可访问性

- 默认先写窄屏，再用 `md:` 增强；
- Flex 长文本子项添加 `min-w-0`；表格外层添加 `overflow-x-auto`；
- 固定宽度必须提供 `max-w-full` 或窄屏替代；
- 图标按钮必须有 `aria-label`，表单输入必须关联 label；
- 不移除焦点样式，动画限制在 150–300ms；
- 主题由宿主控制，组件不得修改 `document.documentElement`。

### 样式隔离红线

Tailwind 使用 `project.config.js` 的 `wrapperClass` 作为 selector，并关闭 Preflight。`src/build.ts` 的 `withWrapper()` 会自动添加该 class。

禁止：

- 开启 Tailwind Preflight 或添加第二套 CSS Reset/UI 框架；
- 使用非 scoped `<style>`，选择 `html`、`body`、`#app` 或宿主 class；
- 用大量 `!important` 对抗宿主；
- 修改隔离机制、Registry 协议或其他 UMD 的 wrapper；
- 将弹层 Teleport 到未约定且不在 wrapper 内的节点。

该方案不是 Shadow DOM。字体、继承属性、CSS 变量和高权重宿主规则仍遵循浏览器级联。样式异常时依次检查 wrapper、正式导出、生成选择器、覆盖来源和 Teleport 目标。

## 6. AI 提示词

### 通用开发

```text
请在当前项目实现【业务目标】。开始前阅读 doc/README.md 和相关源码。

约束：使用 Vue 3、TypeScript、<script setup> 和 Tailwind；复用现有组件；支持亮色、暗色、窄屏和长文本；数据请求仅用 @kivii.com/bridge；不修改 UMD 协议、Vite/Tailwind 隔离配置或无关文件。新增组件时完成导出、withWrapper 注册、manifest、开发预览和产物验证。

完成后运行 pnpm run type-check 和 pnpm build，并说明修改文件、关键选择、验证结果和人工检查项。
```

### 新增组件

```text
请新增【ComponentName】，用于【业务场景】。
Props：【字段、类型、默认值】
Slots：【插槽】
Events：【事件和参数】
数据来源：【Bridge 接口或无请求】

必须遵守 doc/README.md，处理 loading、空数据、错误、暗色、窄屏和长文本；定义并暴露 manifest；完成正式导出、注册、预览和关键契约验证。除非这是全新 UMD 项目，否则不要修改 project.config.js。
```

### 修复或评审

```text
请诊断并修复【现象】，复现步骤是【步骤】，期望【结果】，实际【结果】。

先定位根因，检查 Props、Events、Slots、Ref、样式隔离和 Registry；做最小修复，不重构无关代码。依据 doc/README.md 检查配色、尺寸、亮暗主题、交互状态、窄屏、长文本和可访问性。完成后运行类型检查和构建，说明根因、修复点和回归风险。
```

AI 生成结果必须人工确认：没有虚构 API，没有直接请求或敏感信息，没有打包外部依赖，没有绕过 wrapper，没有无关重构，并且验证命令真实通过。

## 7. 发布检查

```bash
pnpm run type-check
pnpm build
```

- [ ] 构建输出包含 `✓ UMD validated`；
- [ ] 亮色、暗色、360px 窄屏、长文本和空值正常；
- [ ] hover、focus-visible、disabled、loading、空数据和错误状态清楚；
- [ ] 按钮有 `type="button"`，图标按钮有 `aria-label`；
- [ ] 没有全局 CSS、随意颜色、任意值堆砌或无意义动效；
- [ ] `manifest`、`project.config.js`、测试页和文档名称一致；
- [ ] 主项目样式不会明显覆盖组件，组件也不污染主项目；
- [ ] 没有新增职责重复的 Markdown 文件。
