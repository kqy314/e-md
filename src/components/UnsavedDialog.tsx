import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useStore } from '../store'
import { saveFile, saveAs } from '../services/fileService'
import { errMsg } from '../utils/error'

export function UnsavedDialog() {
  const open = useStore((s) => s.unsavedDialog)
  const file = useStore((s) => s.file)
  const confirmLeave = useStore((s) => s.confirmLeave)
  const setUnsavedDialog = useStore((s) => s.setUnsavedDialog)
  const markSaved = useStore((s) => s.markSaved)
  const showToast = useStore((s) => s.showToast)
  const [saving, setSaving] = useState(false)

  async function handleSaveAndLeave() {
    if (!file || saving) return
    setSaving(true)
    try {
      if (file.id === '') {
        const res = await saveAs(file.content, file.name)
        if (res) {
          showToast('已保存')
          confirmLeave()
        } else {
          showToast('文件已下载到本地')
          confirmLeave()
        }
      } else {
        await saveFile(file, file.content)
        markSaved()
        showToast('已保存')
        confirmLeave()
      }
    } catch (e) {
      setUnsavedDialog(false)
      showToast(errMsg(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-6 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setUnsavedDialog(false)}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-[var(--shadow)]"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold">有未保存的修改</h2>
            <p className="mt-1.5 text-sm text-mute">
              是否保存对「{file?.name ?? ''}」的修改？
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={handleSaveAndLeave}
                disabled={saving}
                className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
              >
                {saving ? '保存中…' : '保存并退出'}
              </button>
              <button
                onClick={() => {
                  setUnsavedDialog(false)
                  confirmLeave()
                }}
                className="w-full rounded-xl px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-[var(--hover)] active:scale-[0.99]"
              >
                不保存，直接退出
              </button>
              <button
                onClick={() => setUnsavedDialog(false)}
                className="w-full rounded-xl px-4 py-2 text-sm text-mute transition hover:bg-[var(--hover)] active:scale-[0.99]"
              >
                取消
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
