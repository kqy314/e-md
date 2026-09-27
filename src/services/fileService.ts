import type { FileInfo } from '../types'
import { isNative } from './platform'

/** 用户取消选择文件（非错误，静默处理） */
export class UserCanceledError extends Error {}

const MARKDOWN_ACCEPT = {
  description: 'Markdown 文件',
  accept: {
    'text/markdown': ['.md', '.markdown', '.mdown', '.mkd'],
    'text/plain': ['.txt'],
  },
}

// 浏览器端文件句柄缓存（File System Access API 的句柄无法持久化，仅存内存）
const handleMap = new Map<string, FileSystemFileHandle>()

/* ---------------- 原生桥接（Android SAF） ---------------- */

interface BridgeResult {
  ok: boolean
  id?: string
  name?: string
  content?: string
  error?: string
  canceled?: boolean
}

declare global {
  interface Window {
    MarkdownBridge?: {
      openFile: (cb: string) => void
      openById: (cb: string, id: string) => void
      saveFile: (cb: string, id: string, content: string) => void
      saveAs: (cb: string, content: string, suggestedName: string) => void
    }
    __onMarkdownBridgeResult?: (cb: string, json: unknown) => void
  }
}

let seq = 0
const pending = new Map<string, (r: BridgeResult) => void>()

window.__onMarkdownBridgeResult = (cb, json) => {
  const resolve = pending.get(cb)
  if (!resolve) return
  pending.delete(cb)
  try {
    // 兼容字符串（JSON 文本）与对象两种传入
    const data = typeof json === 'string' ? (JSON.parse(json) as BridgeResult) : (json as BridgeResult)
    resolve(data)
  } catch {
    resolve({ ok: false, error: '原生响应解析失败' })
  }
}

function callNative(method: 'openFile' | 'openById' | 'saveFile' | 'saveAs', ...args: unknown[]): Promise<BridgeResult> {
  return new Promise((resolve) => {
    const bridge = window.MarkdownBridge
    if (!bridge) {
      resolve({ ok: false, error: '原生桥接不可用' })
      return
    }
    const cb = `emd_${++seq}`
    pending.set(cb, resolve)
    // 原生端超时兜底，避免挂起
    setTimeout(() => {
      if (pending.delete(cb)) resolve({ ok: false, error: '操作超时' })
    }, 60000)
    ;(bridge[method] as (cb: string, ...rest: unknown[]) => void)(cb, ...args)
  })
}

/* ---------------- 公开 API ---------------- */

/** 打开一个文件（系统选择器） */
export async function pickAndOpen(): Promise<FileInfo> {
  if (isNative) return nativeOpen()
  return browserOpen()
}

/** 保存内容回原文件 */
export async function saveFile(info: FileInfo, content: string): Promise<void> {
  if (isNative) {
    await nativeSave(info.id, content)
    return
  }
  const handle = handleMap.get(info.id)
  if (!handle) {
    throw new Error('无法定位文件句柄，请尝试另存为')
  }
  const perm = await handle.requestPermission({ mode: 'readwrite' })
  if (perm !== 'granted') {
    throw new Error('没有该文件的写入权限')
  }
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

/** 另存为（浏览器返回 null 表示走了下载降级） */
export async function saveAs(content: string, suggestedName: string): Promise<FileInfo | null> {
  if (isNative) return nativeSaveAs(content, suggestedName)

  const savePicker = window.showSaveFilePicker as
    | ((opts: {
        suggestedName?: string
        types?: { description: string; accept: Record<string, string[]> }[]
      }) => Promise<FileSystemFileHandle>)
    | undefined

  if (typeof savePicker === 'function') {
    const handle = await savePicker({ suggestedName, types: [MARKDOWN_ACCEPT] })
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
    const id = crypto.randomUUID()
    handleMap.set(id, handle)
    return { id, name: handle.name, content }
  }

  downloadFile(content, suggestedName)
  return null
}

/** 按 id 重新打开（最近文件，原生端可直读，浏览器端仅内存句柄） */
export async function openById(id: string): Promise<FileInfo | null> {
  if (isNative) return nativeOpenById(id)
  const handle = handleMap.get(id)
  if (!handle) return null
  const file = await handle.getFile()
  return { id, name: file.name, content: await file.text() }
}

/* ---------------- 浏览器实现 ---------------- */

async function browserOpen(): Promise<FileInfo> {
  const openPicker = window.showOpenFilePicker as
    | ((opts: {
        types?: { description: string; accept: Record<string, string[]> }[]
        multiple?: boolean
        excludeAcceptAllOption?: boolean
      }) => Promise<FileSystemFileHandle[]>)
    | undefined

  if (typeof openPicker === 'function') {
    try {
      const [handle] = await openPicker({
        types: [MARKDOWN_ACCEPT],
        multiple: false,
        excludeAcceptAllOption: false,
      })
      const file = await handle.getFile()
      const id = crypto.randomUUID()
      handleMap.set(id, handle)
      return { id, name: file.name, content: await file.text() }
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw new UserCanceledError()
      throw e
    }
  }

  return inputOpen()
}

function inputOpen(): Promise<FileInfo> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain'
    input.onchange = async () => {
      const f = input.files?.[0]
      if (!f) {
        reject(new UserCanceledError())
        return
      }
      resolve({ id: `input-${Date.now()}`, name: f.name, content: await f.text() })
    }
    input.click()
  })
}

function downloadFile(content: string, name: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name.endsWith('.md') ? name : `${name}.md`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/* ---------------- 原生实现 ---------------- */

async function nativeOpen(): Promise<FileInfo> {
  const r = await callNative('openFile')
  if (!r.ok) {
    if (r.canceled) throw new UserCanceledError()
    throw new Error(r.error || '打开文件失败')
  }
  return { id: r.id!, name: r.name!, content: r.content! }
}

async function nativeOpenById(id: string): Promise<FileInfo | null> {
  const r = await callNative('openById', id)
  if (!r.ok) {
    if (r.canceled) return null
    throw new Error(r.error || '打开文件失败')
  }
  return { id: r.id!, name: r.name!, content: r.content! }
}

async function nativeSave(id: string, content: string) {
  const r = await callNative('saveFile', id, content)
  if (!r.ok) throw new Error(r.error || '保存失败')
}

async function nativeSaveAs(content: string, suggestedName: string): Promise<FileInfo | null> {
  const r = await callNative('saveAs', content, suggestedName)
  if (!r.ok) {
    if (r.canceled) return null
    throw new Error(r.error || '保存失败')
  }
  return { id: r.id!, name: r.name!, content }
}
