/**
 * 打包配置文件
 */
import "./style.css";
import type { App, Component, ComponentPublicInstance } from "vue";
import { h, defineComponent, ref } from "vue";
import { TableIndex as _TableIndex } from "@/build/components";
import projectConfig from "../project.config.js";

// 组件类型定义（只有需要传递参数的组件才需要定义类型）
export type { Props as TableIndexProps } from "@/build/components/tablefield/TableIndex.vue";

// 导出组件
export { TableIndex, install };

// 组件列表
/**
 * 为 Tailwind selector strategy 增加运行时作用域。
 *
 * 包装器不重复声明内部组件的 props/emits：这样 props、事件监听器和
 * slots 都会留在 attrs 中并原样交给内部组件，避免事件被包装器截获。
 */
const withWrapper = (
  component: Component & { name?: string; __name?: string },
) =>
  defineComponent({
    name: `${component.name || component.__name || "Anonymous"}UmdWrapper`,
    inheritAttrs: false,
    setup(_, { attrs, slots, expose }) {
      const componentRef = ref<ComponentPublicInstance | null>(null);

      expose({
        getComponentInstance: () => componentRef.value,
        getManifest: () =>
          (componentRef.value as ComponentPublicInstance & {
            manifest?: unknown;
          } | null)?.manifest,
      });

      return () =>
        h(
          "div",
          { class: projectConfig.wrapperClass },
          [h(component, { ...attrs, ref: componentRef }, slots)]
        );
    },
  });

const TableIndex = withWrapper(_TableIndex);

const components = {
  TableIndex,
};

// 定义安装函数
const install = (app: App) => {
  // 注册所有组件
  Object.keys(components).forEach((key) => {
    const component = components[key as keyof typeof components];
    app.component(key, component);
  });
};

export const manifest = {
  libName: projectConfig.libraryName,
  format: "umd",
  fileName: projectConfig.fileName,
  wrapperClass: projectConfig.wrapperClass,
  zhName: projectConfig.displayName,
  author: projectConfig.author,
  version: projectConfig.version,
  description: projectConfig.description,
  components: Object.keys(components),
  componentsMap: {
    TableIndex: "可配置的 Kivii 数据表格，包含查询、列设置、操作与动态表单。",
  },
  componentsDetailed: [
    { name: "TableIndex", zhName: "动态表格", icon: "fas fa-table", description: "可配置的 Kivii 数据表格，包含查询、列设置、操作与动态表单。" },
  ],
};

// 支持按需引入
export default {
  install,
  ...components,
  manifest,
};

// 支持全局引入
export const VueDemoComponent = {
  install,
  ...components,
  manifest,
};
