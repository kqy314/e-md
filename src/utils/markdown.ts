import type { EditorView } from '@codemirror/view'

/** 在光标处插入文本，若选中则替换选中内容 */
function replaceSelection(view: EditorView, insert: string, from?: number, to?: number) {
  const { state } = view
  const sel = state.selection.main
  const start = from ?? sel.from
  const end = to ?? sel.to
  view.dispatch({
    changes: { from: start, to: end, insert },
    selection: { anchor: start + insert.length },
  })
  view.focus()
}

/** 包裹选中文本：有选中则包裹，否则插入占位符并选中它 */
function wrapText(view: EditorView, before: string, after: string, placeholder: string) {
  const { state } = view
  const { from, to } = state.selection.main
  const selected = state.sliceDoc(from, to)
  if (selected) {
    replaceSelection(view, before + selected + after)
  } else {
    replaceSelection(view, before + placeholder + after)
    const anchor = from + before.length
    view.dispatch({
      selection: { anchor, head: anchor + placeholder.length },
    })
    view.focus()
  }
}

/** 给选中行统一加前缀 */
function prefixLines(view: EditorView, prefix: string) {
  const { state } = view
  const { from, to } = state.selection.main
  const startLine = state.doc.lineAt(from)
  const endLine = state.doc.lineAt(to)
  const text = state.sliceDoc(startLine.from, endLine.to)
  const next = text
    .split('\n')
    .map((l) => prefix + l)
    .join('\n')
  replaceSelection(view, next, startLine.from, endLine.to)
}

/** 设置标题级别：已同级则取消，否则设为目标级别 */
function setHeading(view: EditorView, level: number) {
  const { state } = view
  const { from, to } = state.selection.main
  const startLine = state.doc.lineAt(from)
  const endLine = state.doc.lineAt(to)
  const text = state.sliceDoc(startLine.from, endLine.to)
  const prefix = `${'#'.repeat(level)} `
  const next = text
    .split('\n')
    .map((l) => {
      const m = l.match(/^(#{1,6})\s/)
      if (!m) return prefix + l
      if (m[1].length === level) return l.replace(/^#{1,6}\s/, '')
      return prefix + l.replace(/^#{1,6}\s/, '')
    })
    .join('\n')
  replaceSelection(view, next, startLine.from, endLine.to)
}

export const insertActions = {
  bold: (v: EditorView) => wrapText(v, '**', '**', '加粗文本'),
  italic: (v: EditorView) => wrapText(v, '*', '*', '斜体文本'),
  strike: (v: EditorView) => wrapText(v, '~~', '~~', '删除文本'),
  h1: (v: EditorView) => setHeading(v, 1),
  h2: (v: EditorView) => setHeading(v, 2),
  h3: (v: EditorView) => setHeading(v, 3),
  ul: (v: EditorView) => prefixLines(v, '- '),
  ol: (v: EditorView) => prefixLines(v, '1. '),
  task: (v: EditorView) => prefixLines(v, '- [ ] '),
  quote: (v: EditorView) => prefixLines(v, '> '),
  inlineCode: (v: EditorView) => wrapText(v, '`', '`', 'code'),
  codeBlock: (v: EditorView) => wrapText(v, '```\n', '\n```', '代码片段'),
  link: (v: EditorView) => wrapText(v, '[', '](https://)', '链接文字'),
  image: (v: EditorView) => wrapText(v, '![', '](https://图片地址)', '图片描述'),
  table: (v: EditorView) => {
    const insert =
      '\n| 标题一 | 标题二 |\n| --- | --- |\n| 内容 | 内容 |\n'
    replaceSelection(v, insert)
  },
  hr: (v: EditorView) => replaceSelection(v, '\n---\n'),
}

/** 切换源文本中第 index 个任务复选框（[ ] ↔ [x]） */
export function toggleTaskInSource(src: string, index: number): string {
  let n = -1
  return src.replace(/\[([ x])\]/g, (m, c: string) => {
    n += 1
    if (n !== index) return m
    return `[${c === 'x' ? ' ' : 'x'}]`
  })
}
