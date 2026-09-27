import { AnimatePresence, motion } from 'framer-motion'
import type { ComponentType } from 'react'
import { useStore } from '../store'
import { XIcon } from './icons'
import {
  BookOpenIcon,
  CalendarIcon,
  CodeIcon,
  FileIcon,
  ListChecksIcon,
  NotebookIcon,
  PlaneIcon,
  TrendingUpIcon,
  UsersIcon,
} from './icons'
import { templates } from '../utils/templates'
import type { IconProps } from './icons'

/** 每个模板的专属图标 */
const templateIcons: Record<string, ComponentType<IconProps>> = {
  blank: FileIcon,
  todo: ListChecksIcon,
  meeting: UsersIcon,
  diary: NotebookIcon,
  tech: CodeIcon,
  note: BookOpenIcon,
  weekly: CalendarIcon,
  travel: PlaneIcon,
  retro: TrendingUpIcon,
}

/** 新建文档：选择 Markdown 模板 */
export function TemplateSheet() {
  const open = useStore((s) => s.templateOpen)
  const toggleTemplate = useStore((s) => s.toggleTemplate)
  const enterEditor = useStore((s) => s.enterEditor)

  function pick(id: string) {
    const t = templates.find((x) => x.id === id)
    if (!t) return
    toggleTemplate(false)
    enterEditor({ id: '', name: '未命名.md', content: t.content })
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end bg-black/40 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => toggleTemplate(false)}
        >
          <motion.div
            className="w-full rounded-t-2xl bg-surface p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">选择模板</h2>
              <button
                onClick={() => toggleTemplate(false)}
                className="rounded-lg p-1.5 text-mute transition hover:bg-[var(--hover)] hover:text-ink"
                aria-label="关闭"
              >
                <XIcon size={18} />
              </button>
            </div>

            <ul className="max-h-[60vh] space-y-1 overflow-y-auto">
              {templates.map((t) => {
                const Icon = templateIcons[t.id] ?? FileIcon
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => pick(t.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-[var(--hover)] active:bg-[var(--active)]"
                    >
                      <span className="shrink-0 rounded-lg bg-[var(--accent-soft)] p-2 text-accent">
                        <Icon size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">{t.name}</span>
                        <span className="block truncate text-xs text-mute">{t.desc}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
