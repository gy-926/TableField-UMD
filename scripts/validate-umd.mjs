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
  document: {
    currentScript: { src: scriptUrl },
    createElement: () => ({
      textContent: "",
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
  ["UmdIntegrationTest"],
  "manifest 组件清单异常",
);
assert.ok(injectedStyles.length > 0, "UMD 未注入组件样式");

const registered = [];
library.install({
  component: (name, component) => registered.push({ name, component }),
});
assert.deepEqual(
  registered.map(({ name }) => name),
  ["UmdIntegrationTest"],
  "install() 注册组件异常",
);

let toggleCount = 0;
const componentRef = Vue.ref();
const Root = Vue.defineComponent({
  setup: () => () =>
    Vue.h(library.UmdIntegrationTest, {
      ref: componentRef,
      theme: "light",
      onToggleTheme: () => {
        toggleCount += 1;
      },
    }),
});

const renderer = Vue.createRenderer({
  createElement: (type) => ({ type, props: {}, children: [], parent: null }),
  createText: (text) => ({ type: "text", text, parent: null }),
  createComment: (text) => ({ type: "comment", text, parent: null }),
  setText: (node, text) => {
    node.text = text;
  },
  setElementText: (node, text) => {
    node.children = [{ type: "text", text, parent: node }];
  },
  parentNode: (node) => node.parent,
  nextSibling: (node) => {
    const siblings = node.parent?.children ?? [];
    return siblings[siblings.indexOf(node) + 1] ?? null;
  },
  insert: (child, parent, anchor) => {
    child.parent = parent;
    if (!anchor) {
      parent.children.push(child);
      return;
    }
    parent.children.splice(parent.children.indexOf(anchor), 0, child);
  },
  remove: (child) => {
    const siblings = child.parent?.children;
    if (siblings) siblings.splice(siblings.indexOf(child), 1);
  },
  patchProp: (node, key, _previous, value) => {
    node.props[key] = value;
  },
  querySelector: () => null,
  setScopeId: () => {},
  insertStaticContent: () => [null, null],
});

const root = { type: "root", props: {}, children: [], parent: null };
renderer.createApp(Root).mount(root);

const findNode = (node, predicate) => {
  if (predicate(node)) return node;
  for (const child of node.children ?? []) {
    const match = findNode(child, predicate);
    if (match) return match;
  }
};

const wrapper = findNode(
  root,
  (node) => node.props?.class === projectConfig.wrapperClass,
);
assert.ok(wrapper, "组件缺少 Tailwind 隔离 wrapper");

const button = findNode(root, (node) => node.type === "button");
assert.equal(typeof button?.props?.onClick, "function", "未渲染主题切换按钮");
button.props.onClick({ type: "click" });
assert.equal(toggleCount, 1, "包装器未正确透传 toggle-theme 事件");
assert.equal(
  componentRef.value.getManifest()?.name,
  "UmdIntegrationTest",
  "包装器未正确代理组件 manifest",
);

console.log(
  `✓ UMD validated: ${projectConfig.fileName} → window.${projectConfig.libraryName}`,
);
