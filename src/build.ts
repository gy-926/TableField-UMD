/**
 * 打包配置文件
 */
import "./style.css";
import type { App, Component, ComponentPublicInstance } from "vue";
import { h, defineComponent, ref } from "vue";
import { UmdIntegrationTest as _UmdIntegrationTest } from "@/build/components";
import projectConfig from "../project.config.js";

// 组件类型定义（只有需要传递参数的组件才需要定义类型）
export type { Props as UmdIntegrationTestProps } from "@/build/components/UmdIntegrationTest.vue";

// 导出组件
export { UmdIntegrationTest, install };

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

const UmdIntegrationTest = withWrapper(_UmdIntegrationTest);

const components = {
  UmdIntegrationTest,
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
    UmdIntegrationTest: "Test module for verifying UMD loading, event forwarding, and theme switching.",
  },
  componentsDetailed: [
    { name: "UmdIntegrationTest", zhName: "UMD 集成测试", icon: "fas fa-vial", description: "Test module for verifying UMD loading, event forwarding, and theme switching." },
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
