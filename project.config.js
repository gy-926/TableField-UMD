/**
 * 单项目 UMD 的唯一配置源。
 *
 * 复制模板后，优先修改这里；构建文件名、浏览器全局变量、
 * Tailwind 隔离类名和运行时 manifest 都会同步更新。
 */
export default Object.freeze({
  libraryName: "vueComponent3",
  fileName: "vue-component-test.umd.js",
  wrapperClass: "vue-component-test-wrapper",
  displayName: "Vue UMD 集成测试组件",
  description: "用于验证主项目动态加载、注册和调用 Vue UMD 组件的测试包。",
  author: "Kivii UMD Team",
  version: "0.1.0",
});
