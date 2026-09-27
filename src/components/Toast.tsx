import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store'

export function Toast() {
  const toast = useStore((s) => s.toast)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.key}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="max-w-full rounded-full bg-ink/90 px-4 py-2 text-sm text-bg shadow-lg backdrop-blur"
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
