import type { Plugin } from 'vite';
import { readFileSync, existsSync, unlinkSync, writeFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

/**
 * Vite 插件：将 CSS 内联到 JS 文件中
 */
export function inlineCss(): Plugin {
  return {
    name: 'inline-css',
    closeBundle() {
      const outDir = resolve(process.cwd(), 'dist');
      const cssFile = resolve(outDir, 'style.css');

      // 检查 CSS 文件是否存在
      if (!existsSync(cssFile)) {
        return;
      }

      // 自动查找 .umd.js 文件
      const files = readdirSync(outDir);
      const umdFile = files.find(file => file.endsWith('.umd.js'));

      if (!umdFile) {
        console.warn('[inline-css] 未找到 .umd.js 文件，跳过 CSS 内联');
        return;
      }

      const jsFile = resolve(outDir, umdFile);

      // 读取 CSS 和 JS 文件内容
      const cssContent = readFileSync(cssFile, 'utf-8');
      let jsContent = readFileSync(jsFile, 'utf-8');

      // 将 CSS 注入到 JS 中
      // 创建一个函数来动态注入样式
      const cssInjectionCode = `
(function() {
  if (typeof document !== 'undefined') {
    var style = document.createElement('style');
    style.textContent = ${JSON.stringify(cssContent)};
    document.head.appendChild(style);
  }
})();
`;

      // 将 CSS 注入代码添加到 JS 文件的开头（在 UMD 包装器之后）
      // 查找 UMD 包装器的结束位置，在函数体开始后注入
      const umdPattern = /\(function\s*\([^)]*\)\s*\{/;
      const match = jsContent.match(umdPattern);

      if (match) {
        // 在 UMD 包装器开始后立即注入
        const insertIndex = match.index! + match[0].length;
        jsContent =
          jsContent.slice(0, insertIndex) +
          cssInjectionCode +
          jsContent.slice(insertIndex);
      } else {
        // 如果找不到 UMD 模式，就在文件开头注入
        jsContent = cssInjectionCode + jsContent;
      }

      // 写回 JS 文件
      writeFileSync(jsFile, jsContent, 'utf-8');

      // 删除 CSS 文件
      unlinkSync(cssFile);
    },
  };
}