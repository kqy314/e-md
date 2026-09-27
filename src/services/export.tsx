import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

/**
 * 导出服务：把当前文档按不同格式导出。
 * 复用 react-markdown + GFM + highlight 管线渲染成 HTML，再转换为
 * PDF（打印）、Word（.doc，兼容 Word/WPS）、HTML、Markdown。
 */

/** 将 Markdown 渲染为纯 HTML 片段 */
export function renderMarkdownHtml(content: string): string {
  return renderToStaticMarkup(
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
      components={{
        a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
      }}
    >
      {content}
    </ReactMarkdown>,
  )
}

/** 导出自包含样式（浅色主题，中性排版） */
const EXPORT_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC",
      "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    font-size: 15px;
    line-height: 1.75;
    color: #18181b;
    word-break: break-word;
  }
  .wrap { max-width: 780px; margin: 0 auto; padding: 32px 24px; }
  h1, h2, h3, h4, h5, h6 { font-weight: 600; line-height: 1.35; margin: 1.5em 0 0.6em; color: #18181b; }
  h1 { font-size: 1.65em; padding-bottom: 0.3em; border-bottom: 1px solid #e6e6e9; }
  h2 { font-size: 1.4em; padding-bottom: 0.25em; border-bottom: 1px solid #e6e6e9; }
  h3 { font-size: 1.2em; }
  h4 { font-size: 1.05em; }
  h5 { font-size: 1em; }
  h6 { font-size: 0.9em; color: #71717a; }
  p { margin: 0.75em 0; }
  a { color: #4f46e5; text-decoration: none; }
  ul, ol { margin: 0.75em 0; padding-left: 1.6em; }
  ul { list-style: disc; }
  ol { list-style: decimal; }
  li { margin: 0.3em 0; }
  blockquote {
    margin: 0.9em 0; padding: 0.4em 1em;
    border-left: 3px solid #4f46e5; background: #eef0ff;
    border-radius: 0 8px 8px 0; color: #71717a;
  }
  code {
    font-family: ui-monospace, "SF Mono", "Cascadia Code", Consolas, monospace;
    font-size: 0.88em; background: #f2f2f4; padding: 0.15em 0.4em;
    border-radius: 5px; border: 1px solid #e6e6e9;
  }
  pre {
    margin: 1em 0; padding: 0.9em 1.1em; background: #f6f6f8;
    border: 1px solid #e6e6e9; border-radius: 10px; overflow-x: auto; line-height: 1.6;
  }
  pre code { background: transparent; border: none; padding: 0; font-size: 0.86em; }
  table { margin: 1em 0; border-collapse: collapse; width: 100%; font-size: 0.95em; }
  th, td { border: 1px solid #e6e6e9; padding: 0.5em 0.8em; text-align: left; }
  th { background: #f2f2f4; font-weight: 600; }
  img { max-width: 100%; border-radius: 10px; }
  hr { margin: 1.6em 0; border: none; border-top: 1px solid #e6e6e9; }
  del { color: #71717a; }
  input[type="checkbox"] { margin-right: 0.4em; accent-color: #4f46e5; }
  @media print {
    body { padding: 0; }
    .wrap { max-width: 100%; padding: 0; }
    pre, blockquote, table { break-inside: avoid; }
  }
`

/** 生成完整 HTML 文档字符串 */
function buildExportDoc(content: string, title: string): string {
  const body = renderMarkdownHtml(content)
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<style>${EXPORT_CSS}</style>
</head>
<body>
<div class="wrap">${body}</div>
</body>
</html>`
}

function downloadBlob(content: string, mime: string, name: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function baseName(name: string): string {
  return name.replace(/\.(md|markdown|mdown|mkd|txt)$/i, '') || 'e-md'
}

/** 导出为 HTML */
export function exportHtml(content: string, name: string) {
  downloadBlob(buildExportDoc(content, baseName(name)), 'text/html;charset=utf-8', `${baseName(name)}.html`)
}

/** 导出为 Word（HTML 包装的 .doc，Word/WPS 可直接打开） */
export function exportWord(content: string, name: string) {
  const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="UTF-8" /><title>${baseName(name)}</title><style>${EXPORT_CSS}</style></head><body><div class="wrap">${renderMarkdownHtml(content)}</div></body></html>`
  downloadBlob(doc, 'application/msword;charset=utf-8', `${baseName(name)}.doc`)
}

/** 导出为 Markdown 源文件 */
export function exportMarkdown(content: string, name: string) {
  downloadBlob(content, 'text/markdown;charset=utf-8', `${baseName(name)}.md`)
}

/** 导出为 PDF（通过新窗口打印，由系统打印对话框生成 PDF） */
export function exportPdf(content: string, name: string) {
  const html = buildExportDoc(content, baseName(name)).replace(
    '</body>',
    '<script>window.onload=function(){setTimeout(function(){window.print()},300)}<\/script></body>',
  )
  const w = window.open('', '_blank')
  if (!w) {
    // 弹窗被拦截时降级为下载 HTML
    downloadBlob(buildExportDoc(content, baseName(name)), 'text/html;charset=utf-8', `${baseName(name)}.html`)
    return false
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
  return true
}
