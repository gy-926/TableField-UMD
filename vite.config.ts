import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import cssInjectedByJs from "vite-plugin-css-injected-by-js";
import projectConfig from "./project.config.js";

const registryFooter = `
;(function () {
  if (typeof window === "undefined") return;

  var library = window[${JSON.stringify(projectConfig.libraryName)}];
  if (!library) return;

  var registry = window.__KIVII_UMD_REGISTRY__ =
    window.__KIVII_UMD_REGISTRY__ || { byUrl: {}, byFileName: {} };

  registry.byUrl = registry.byUrl || {};
  registry.byFileName = registry.byFileName || {};
  registry.byFileName[${JSON.stringify(projectConfig.fileName)}] = library;

  if (typeof document !== "undefined" && document.currentScript && document.currentScript.src) {
    registry.byUrl[document.currentScript.src] = library;
  }
})();
`;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), cssInjectedByJs()],
  build: {
    // 输出目录
    outDir: resolve(__dirname, "./dist"),
    // 单项目只交付一个 UMD，避免改名后残留旧产物
    emptyOutDir: true,
    lib: {
      // 入口文件
      entry: resolve(__dirname, "src/build.ts"),
      name: projectConfig.libraryName,
      // 文件名
      fileName: () => projectConfig.fileName,
      // 输出格式
      formats: ["umd"],
    },
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: ["vue", "echarts", "@kivii.com/bridge"],
      output: {
        // 明确 UMD 暴露 named exports，避免 default + named 混用警告
        exports: "named",
        // 新协议：按 URL / 文件名注册；保留原 UMD 全局变量以兼容旧加载器
        footer: registryFooter,
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {
          vue: "Vue",
          echarts: "echarts",
          "@kivii.com/bridge": "kivii",
        },
      },
    },
    // 生成源码映射
    sourcemap: false,
    // 最小化输出
    minify: "terser",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
