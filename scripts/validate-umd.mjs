import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as Vue from "vue";
import projectConfig from "../project.config.js";

const outputUrl = new URL(`../dist/${projectConfig.fileName}`, import.meta.url);
const source = await readFile(outputUrl, "utf8");
const testPage = await readFile(
  new URL("../umd-test.html", import.meta.url),
  "utf8",
);

assert.ok(
  testPage.includes(`./dist/${projectConfig.fileName}`),
  `umd-test.html 未加载 ${projectConfig.fileName}`,
);
const testPageGlobalName = testPage.match(
  /const\s+ComponentLibrary\s*=\s*window\.([A-Za-z_$][\w$]*)/,
)?.[1];

if (testPageGlobalName !== projectConfig.libraryName) {
  console.warn(
    `⚠ UMD 暴露 window.${projectConfig.libraryName}，但测试页读取 window.${testPageGlobalName ?? "unknown"}；保留该差异用于全局变量不匹配测试`,
  );
}

const injectedStyles = [];
const scriptUrl = `https://example.test/components/${projectConfig.fileName}`;
const context = vm.createContext({
  Vue,
  console,
  Event: class Event {},
  navigator: { userAgent: "node" },
  location: { href: "https://example.test/" },
  URL,
  document: {
    currentScript: { src: scriptUrl },
    documentElement: { style: {} },
    createElement: () => ({
      textContent: "",
      style: {},
      children: [],
      appendChild(child) {
        this.children.push(child);
      },
    }),
    createTextNode: (text) => ({ text }),
    head: {
      appendChild: (style) => injectedStyles.push(style),
    },
    getElementsByTagName: () => [{ appendChild: (style) => injectedStyles.push(style) }],
  },
});
context.window = context;

new vm.Script(source, { filename: projectConfig.fileName }).runInContext(context);

const library = context[projectConfig.libraryName];
assert.ok(library, `未找到全局变量 ${projectConfig.libraryName}`);
assert.equal(
  context.__KIVII_UMD_REGISTRY__?.byUrl?.[scriptUrl],
  library,
  "UMD 未按脚本 URL 注册到 __KIVII_UMD_REGISTRY__",
);
assert.equal(
  context.__KIVII_UMD_REGISTRY__?.byFileName?.[projectConfig.fileName],
  library,
  "UMD 未按文件名注册到 __KIVII_UMD_REGISTRY__",
);
assert.equal(typeof library.install, "function", "UMD 缺少 install()");
assert.equal(library.manifest.fileName, projectConfig.fileName);
assert.equal(library.manifest.wrapperClass, projectConfig.wrapperClass);
assert.deepEqual(
  Array.from(library.manifest.components),
  ["TableIndex"],
  "manifest 组件清单异常",
);
assert.ok(injectedStyles.length > 0, "UMD 未注入组件样式");

const registered = [];
library.install({
  component: (name, component) => registered.push({ name, component }),
});
assert.deepEqual(
  registered.map(({ name }) => name),
  ["TableIndex"],
  "install() 注册组件异常",
);

assert.ok(library.TableIndex, "UMD 未导出 TableIndex");

console.log(
  `✓ UMD validated: ${projectConfig.fileName} → window.${projectConfig.libraryName}`,
);
