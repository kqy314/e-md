import type { EditorView } from '@codemirror/view'
import { redo, undo } from '@codemirror/commands'
import { insertActions } from '../utils/markdown'
import { RedoIcon, UndoIcon } from './icons'

type ActionKey = keyof typeof insertActions

const items: { label: string; action: ActionKey; title: string }[] = [
  { label: 'B', action: 'bold', title: '加粗' },
  { label: 'I', action: 'italic', title: '斜体' },
  { label: 'S', action: 'strike', title: '删除线' },
  { label: 'H1', action: 'h1', title: '标题 1' },
  { label: 'H2', action: 'h2', title: '标题 2' },
  { label: 'H3', action: 'h3', title: '标题 3' },
  { label: '• 列表', action: 'ul', title: '无序列表' },
  { label: '1. 排序', action: 'ol', title: '有序列表' },
  { label: '☑ 任务', action: 'task', title: '任务列表' },
  { label: '> 引用', action: 'quote', title: '引用' },
  { label: '<> 代码', action: 'inlineCode', title: '行内代码' },
  { label: '代码块', action: 'codeBlock', title: '代码块' },
  { label: '链接', action: 'link', title: '链接' },
  { label: '图片', action: 'image', title: '图片' },
  { label: '表格', action: 'table', title: '表格' },
  { label: '---', action: 'hr', title: '分隔线' },
]

const btnCls =
  'flex shrink-0 min-h-10 items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-medium text-mute transition hover:bg-[var(--hover)] hover:text-ink active:bg-[var(--active)]'

export function InsertToolbar({ getView }: { getView: () => EditorView | null }) {
  return (
    <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto border-b border-edge bg-surface px-1.5 py-1">
      <button
        title="撤销"
        className={btnCls}
        onClick={() => {
          const view = getView()
          if (view) undo(view)
        }}
      >
        <UndoIcon size={17} />
      </button>
      <button
        title="重做"
        className={btnCls}
        onClick={() => {
          const view = getView()
          if (view) redo(view)
        }}
      >
        <RedoIcon size={17} />
      </button>
      <span className="mx-0.5 h-5 w-px shrink-0 bg-edge" />
      {items.map((it) => (
        <button
          key={it.action}
          title={it.title}
          onClick={() => {
            const view = getView()
            if (view) insertActions[it.action](view)
          }}
          className={btnCls}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
