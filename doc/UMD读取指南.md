# UMD 加载与运行时契约

本文只面向主项目接入人员。组件开发规范统一见 [新人开发手册](./README.md)。

## 构建产物

```bash
pnpm build
```

命令会清空 `dist`、生成 `project.config.js` 指定的单个 UMD 文件，并运行 `scripts/validate-umd.mjs`。验证失败时不得发布。

## 加载顺序

宿主先加载外部依赖，再加载业务 UMD：

```html
<script src="/vendor/vue.global.js"></script>
<script src="/vendor/echarts.min.js"></script>
<script src="/vendor/kivii.bridge.min.js"></script>
<script src="/components/vue-component-test.umd.js"></script>
```

| 模块 | 宿主全局变量 | 必需条件 |
| --- | --- | --- |
| `vue` | `window.Vue` | 始终必需 |
| `echarts` | `window.echarts` | 组件使用图表时 |
| `@kivii.com/bridge` | `window.kivii` | 组件请求数据时 |

宿主必须保证依赖版本兼容，不得让业务 UMD 再携带第二份 Vue。

## 查找和注册

推荐按 Registry 查找，旧系统可以继续使用全局变量：

```js
const fileName = 'vue-component-test.umd.js'
const library =
  window.__KIVII_UMD_REGISTRY__?.byFileName?.[fileName] ??
  window.vueComponent3

if (!library) throw new Error(`UMD 加载失败：${fileName}`)

app.use(library)
console.log(library.manifest)
```

UMD 会注册到：

```js
window.__KIVII_UMD_REGISTRY__.byUrl[document.currentScript.src]
window.__KIVII_UMD_REGISTRY__.byFileName[manifest.fileName]
```

主项目应对 URL 去重，避免重复执行脚本和重复注入 CSS。不要仅依赖后端保存的 `GlobalName`。

## Manifest

主项目至少校验以下字段：

```js
{
  libName: 'vueComponent3',
  format: 'umd',
  fileName: 'vue-component-test.umd.js',
  wrapperClass: 'vue-component-test-wrapper',
  version: '0.1.0',
  components: ['UmdIntegrationTest']
}
```

加载器应记录 URL、文件名、版本和失败原因。字段缺失或组件清单不符合预期时，不要继续静默渲染。

## Props、Events、Slots 和 Ref

组件经过 wrapper 后仍会透传 Props、Events 和 Slots：

```vue
<UmdIntegrationTest
  ref="componentRef"
  :theme="theme"
  @toggle-theme="toggleTheme"
>
  <template #default>内容</template>
</UmdIntegrationTest>
```

Ref 指向 wrapper 公开接口：

```js
componentRef.value.getManifest()
componentRef.value.getComponentInstance()
```

不要依赖内部 Vue 实例的私有字段。

## 多 UMD 共存

每个项目的 `libraryName`、`fileName` 和 `wrapperClass` 必须唯一。主项目还需负责：

- URL 去重和加载超时；
- Vue、ECharts 和 Bridge 版本兼容；
- 路由离开时卸载组件和释放图表、监听器、定时器；
- Registry 冲突提示；
- 脚本加载失败、组件渲染失败和 Bridge 请求失败的可见错误状态。

## 接入验收

- [ ] 网络中只下载一个业务 UMD，且没有第二份 Vue；
- [ ] Registry 能按 URL 和文件名读取同一个 library；
- [ ] `app.use(library)` 正确注册 manifest 中的组件；
- [ ] Props、Events、Slots 和 Ref 行为正确；
- [ ] 亮色、暗色与宿主全局样式共存；
- [ ] 路由反复进入离开后没有重复监听和图表实例；
- [ ] 两个不同 UMD 同时加载时不覆盖全局变量或 wrapper；
- [ ] 加载失败和依赖缺失时向用户显示可理解的提示。
