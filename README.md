# Kivii 单项目 UMD 模板

本项目用于开发一个独立的 Vue 业务组件项目，并构建为单个 UMD 文件，由主项目在运行时加载、注册和渲染。

它不是面向 npm 的通用组件库。交付物是 `dist` 中的一个 UMD 文件，Vue、ECharts 和 Kivii Bridge 由主项目提供。

## 快速开始

```bash
pnpm install
pnpm dev
pnpm run type-check
pnpm build
```

`pnpm build` 会完成 UMD 构建、CSS 注入、旧产物清理和产物级验证。独立浏览器验证可打开 `umd-test.html`。

## 新项目必改配置

所有项目身份配置集中在 [`project.config.js`](./project.config.js)：

```js
export default {
  libraryName: 'vueComponent3',
  fileName: 'vue-component-test.umd.js',
  wrapperClass: 'vue-component-test-wrapper',
  displayName: 'Vue UMD 集成测试组件',
  description: '用于验证主项目动态加载、注册和调用 Vue UMD 组件的测试包。',
  author: 'Kivii UMD Team',
  version: '0.1.0',
}
```

- `libraryName`：浏览器全局变量，例如 `window.vueComponent3`。
- `fileName`：最终 UMD 文件名。
- `wrapperClass`：Tailwind 样式隔离作用域，多个 UMD 项目必须唯一。
- 其他字段会写入运行时 `manifest`。

修改 `libraryName` 或 `fileName` 后，也要同步调整静态测试页 `umd-test.html` 的脚本路径和全局变量引用。

## 目录职责

```text
src/build.ts                 UMD 正式入口、组件注册与 manifest
src/build/components/        对外交付的业务组件
src/build/types/             公共类型
src/build/composables/       公共组合式函数
src/build/utils/             公共工具函数
src/dev/                     本地开发预览
scripts/validate-umd.mjs     最终产物集成验证
project.config.js            单项目 UMD 身份配置
vite.config.ts               UMD 构建配置
tailwind.config.js           Tailwind 与样式隔离配置
umd-test.html                独立 HTML 加载示例
```

## 添加组件

1. 在 `src/build/components` 创建 Vue 组件。
2. 从 `src/build/components/index.ts` 导出。
3. 在 `src/build.ts` 中使用 `withWrapper()` 包装并加入 `components`。
4. 在库级 `manifest.componentsMap` 和 `componentsDetailed` 中补充元数据。
5. 在 `src/dev` 中引用 `@/build` 导出的正式组件，不要直接引用裸 `.vue` 文件。
6. 扩展 `scripts/validate-umd.mjs`，覆盖新组件最关键的 Props 和 Events。

组件必须使用 Vue 3、TypeScript 和 Tailwind，并同时适配亮色与暗色模式。

## 主项目加载契约

主项目必须先提供外部依赖，再加载 UMD：

```html
<script src="/vendor/vue.global.js"></script>
<script src="/vendor/echarts.min.js"></script>
<script src="/vendor/kivii.bridge.min.js"></script>
<script src="/components/vue-component-test.umd.js"></script>
```

注册组件：

```js
const library = window.vueComponent3

app.use(library)
console.log(library.manifest)
```

| 外部模块 | 主项目全局变量 |
| --- | --- |
| `vue` | `window.Vue` |
| `echarts` | `window.echarts` |
| `@kivii.com/bridge` | `window.kivii` |

主项目应保证所有 UMD 使用兼容的外部依赖版本，尤其不能让 UMD 再携带第二份 Vue。

新构建产物会在保留 `window[libraryName]` 的同时，自动注册到：

```js
window.__KIVII_UMD_REGISTRY__.byUrl[scriptUrl]
window.__KIVII_UMD_REGISTRY__.byFileName[fileName]
```

主项目可以优先通过 Registry 按 URL 或文件名解析，新项目不再要求后端保存 `GlobalName`；原全局变量继续保留，用于兼容旧加载方式。

## 包装器公开能力

正式导出的组件会自动增加 Tailwind 隔离 wrapper，并透传 Props、Events 和 Slots。

通过组件 ref 可访问：

```ts
componentRef.value.getManifest()
componentRef.value.getComponentInstance()
```

`getManifest()` 返回内部组件通过 `defineExpose({ manifest })` 暴露的元数据；`getComponentInstance()` 用于确实需要访问内部公开方法的场景。模板自带的验证组件名为 `UmdIntegrationTest`。

## 样式隔离边界

项目关闭 Tailwind Preflight，并使用 selector strategy 把工具类限制在唯一 wrapper 下。这能显著降低 UMD 与主项目互相污染，但不是 Shadow DOM 级别的绝对隔离。

- 主项目的高权重选择器或 `!important` 仍可能覆盖组件样式。
- Font Awesome 图标 CSS 由主项目加载。
- 多个 UMD 项目的 `wrapperClass` 不得重复。
- 全局 CSS 变量仍会遵循浏览器级联规则。

新人请从 [`doc/README.md`](./doc/README.md) 开始，按需查阅开发、样式、AI 提示词和 UMD 接入专题。
