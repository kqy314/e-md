import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

function useDebounced<T>(value: T, delay: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

interface PreviewPaneProps {
  content: string
  fontSize: number
  /** 传入后，GFM 任务复选框可点击勾选（index 为文档中第几个任务项） */
  onToggleTask?: (index: number) => void
}

export function PreviewPane({ content, fontSize, onToggleTask }: PreviewPaneProps) {
  const debounced = useDebounced(content, 300)
  const isEmpty = debounced.trim() === ''

  return (
    <div className="md-scroll h-full overflow-y-auto">
      <div
        className="md-body mx-auto max-w-3xl px-5 py-6"
        style={{ fontSize }}
      >
        {isEmpty ? (
          <p className="text-mute">在编辑区输入 Markdown 内容后，这里会实时展示渲染结果。</p>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
            components={{
              a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
              input: ({ checked, type, disabled, ...props }) => {
                if (type !== 'checkbox') return <input type={type} {...props} />
                return (
                  <input
                    {...props}
                    type="checkbox"
                    checked={!!checked}
                    onChange={(e) => {
                      // 事件触发时按 DOM 顺序定位是第几个任务项，避免渲染时序问题
                      const el = e.currentTarget
                      const all = el.closest('.md-body')?.querySelectorAll('input[type="checkbox"]')
                      const idx = all ? Array.prototype.indexOf.call(all, el) : -1
                      if (idx >= 0) onToggleTask?.(idx)
                    }}
                  />
                )
              },
            }}
          >
            {debounced}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
}
