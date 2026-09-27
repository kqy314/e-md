/** 将时间戳格式化为简洁的本地时间展示 */
export function formatOpenedAt(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`

  if (d.toDateString() === now.toDateString()) return `今天 ${hhmm}`
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${hhmm}`
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** 统计文档字数/行数：中文字符按字、英文与数字按单词、CJK 标点并入字数 */
export function countStats(content: string): { words: number; chars: number; lines: number } {
  const chars = content.length
  const cjk = (content.match(/[\u4e00-\u9fff]/g) ?? []).length
  const latin = (content.match(/[A-Za-z0-9]+/g) ?? []).length
  const lines = content === '' ? 0 : content.split('\n').length
  return { words: cjk + latin, chars, lines }
}
