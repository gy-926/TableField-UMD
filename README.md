# Kivii 动态表格 UMD

从 `kivii-public-components` 独立交付的 Vue 3 动态表格。包括查询、分页、列配置、多视图、数据转换以及新建/编辑弹窗；交付物为一个 UMD 文件。

## 构建与交付

```bash
pnpm install
pnpm type-check
pnpm build
```

交付 [dist/kivii-tablefield.umd.js](./dist/kivii-tablefield.umd.js)。构建会同时执行 UMD 产物校验；本地预览使用 `pnpm dev`。

| 依赖 | 提供方 |
| --- | --- |
| Vue 3 | 宿主页面，必须提供 `window.Vue` |
| Naive UI、Axios、vue3-sfc-loader | UMD 已内置 |

## 宿主加载

```html
<script src="/vendor/vue.global.prod.js"></script>
<script src="/components/kivii-tablefield.umd.js"></script>
```

```js
const app = Vue.createApp(App)
app.use(window.KiviiTableField)
app.mount('#app')
```

UMD 全局名为 `window.KiviiTableField`，注册后的组件名为 `TableIndex`。也可从 `window.__KIVII_UMD_REGISTRY__.byFileName['kivii-tablefield.umd.js']` 取得库。

## 基本使用

```vue
<TableIndex :ui-config="tableConfig" :http-client="httpClient" />
```

模板中 Props 使用 kebab-case。纯 HTML 页面不能把对象直接写成字符串属性；应在 `createApp` 的 `setup()` 中返回 `tableConfig`，再使用 `:ui-config="tableConfig"`。

`httpClient` 可选。建议传入宿主已配置 Token、拦截器和 `baseURL` 的 Axios 实例；不传时 UMD 使用内置 Axios，以相对路径请求当前域名。

## `uiConfig`

真实接口示例：

```ts
const tableConfig = {
  Type: 'Kivii.Finances.Entities.Invoice',
  InternalCode: '发票管理(tableField)',
  IsDefault: true,
  InitQuery: '/Restful/Kivii.Finances.Entities.Invoice/Query.json',
  GetUrl: '/Restful/Kivii.Basic.Entities.UiConfig/Get.json',
  SetUrl: '/Restful/Kivii.Basic.Entities.UiConfig/Set.json',
  InitDelete: '/Restful/Kivii.Finances.Entities.Invoice/Delete.json',
  // 可选：真实模式的新建、编辑动态表单
  CreateVueUrl: '/codet/invoiceContent.vue',
}
```

| 字段 | 用途 |
| --- | --- |
| `Type` | 实体类型，用于字段映射 |
| `InternalCode` / `IsDefault` | 视图配置标识 |
| `InitQuery` | 表格查询接口 |
| `GetUrl` / `SetUrl` | 读取、保存视图配置接口 |
| `InitDelete` | 删除当前行的接口 |
| `CreateVueUrl` | 可选；外部 `.vue`、`.html` 或 `component://组件名` 表单 |

### 真实接口契约

| 操作 | 请求 | 关键结构 |
| --- | --- | --- |
| 字段映射 | `GET /Server/Entity/{Type}` | `{ Results: [{ Name, DisplayName, Type, Length }] }` |
| 查询 | `POST InitQuery?Skip=0&Take=20` | `{ Offset, Total, Results: [{ Kvid, ... }] }` |
| 读取视图 | `POST GetUrl` | 请求 `{ Type, InternalCode, IsDefault }`；响应含 `Parameters` JSON 字符串 |
| 保存视图 | `POST SetUrl` | 请求增加 `Parameters: JSON.stringify(views)` |
| 删除 | `POST InitDelete` | 请求 `{ Kvids: ['...'] }` |

每行应有稳定的 `Kvid`，用于选择、编辑和删除。

## 模拟接口模式

只通过 `uiConfig.mock` 开启模拟模式；无需传入单独的 `mock-data`。当 `mock.enabled` 为 `true` 时，组件**不会调用任何正式接口**，字段映射、查询、Get、Set、删除、新建和编辑都在内存中完成。

```ts
const tableConfig = {
  Type: 'Kivii.Finances.Entities.Invoice',
  InternalCode: '发票管理(tableField)',
  IsDefault: true,
  // 正式地址可保留；模拟模式不会调用。
  InitQuery: '/Restful/Kivii.Finances.Entities.Invoice/Query.json',
  GetUrl: '/Restful/Kivii.Basic.Entities.UiConfig/Get.json',
  SetUrl: '/Restful/Kivii.Basic.Entities.UiConfig/Set.json',
  InitDelete: '/Restful/Kivii.Finances.Entities.Invoice/Delete.json',
  mock: {
    enabled: true,
    data: [
      {
        Kvid: 'mock-invoice-001',
        OwnerName: '事业发展科',
        Amount: 1472,
        AmountTax: 83.32,
        AmountUntaxed: 1388.68,
        Category: 'Debit',
        CreateTime: '2025-04-23T17:13:02+08:00',
        PayerName: '扬州中金大网络科技有限公司',
        PayerTaxNumber: '91320803MA660A1099',
        SerialNumber: '2532200000434866',
      },
    ],
    // 可选；省略时从 data 第一条记录推导列。
    fields: [
      { Name: 'OwnerName', DisplayName: '所属人', Type: 'String', Length: 500 },
      { Name: 'Amount', DisplayName: '金额', Type: 'Decimal' },
    ],
    // 可选：初始多视图配置。
    settings: [],
  },
}
```

模拟数据和视图配置仅保存在组件内存。新建、编辑、删除和视图保存会立即更新表格；刷新页面后恢复 `uiConfig.mock` 中的初始值。移除 `mock` 或将 `enabled` 改为 `false`，即可切回正式接口。

## 新建与编辑

| 场景 | 弹窗行为 |
| --- | --- |
| 模拟模式 | 内置表单，保存到内存 |
| 真实模式且有 `CreateVueUrl` | 动态加载指定表单 |
| 真实模式未配置 `CreateVueUrl` | 显示内置表单；实际持久化应由宿主动态表单实现 |

内置表单按实际数据类型选择控件；税号、流水号等文本编号不会被识别为数字。

## 全局对象与主题

为兼容历史表格代码，组件挂载后会提供 `window.$message` 和 `window.$dialog`，用于提示与确认弹窗。不要将它们作为业务 API；若宿主也使用同名变量，后挂载组件会覆盖前者。网络请求不会写入 `window.$axios`。

暗色模式跟随宿主 `<html class="dark">`；主色从 `localStorage['kivii-theme']` 中的 `primaryColor` 读取，并监听 `kivii-theme-change` 事件。

## 代码位置

```text
src/build.ts                            UMD 入口、安装函数与 manifest
src/build/components/tablefield/        表格模块和子组件
src/build/composables/useTheme.ts       主题同步逻辑
src/dev/                                本地模拟预览
scripts/validate-umd.mjs                UMD 产物校验
project.config.js                       UMD 名称、文件名与样式作用域
```

## 发布前检查

```bash
pnpm type-check
pnpm build
```

人工验证应至少覆盖真实接口查询、模拟模式新建/编辑/删除、视图保存、分页、亮暗主题与 `CreateVueUrl` 动态表单加载。
