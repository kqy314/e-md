/// <reference types="vite/client" />

// File System Access API 补充类型（部分浏览器实现未完整纳入 TS lib.dom）
interface FileSystemFileHandle {
  requestPermission(descriptor?: {
    mode?: 'read' | 'readwrite'
  }): Promise<'granted' | 'denied' | 'prompt'>
  createWritable(): Promise<FileSystemWritableFileStream>
}

interface FileSystemWritableFileStream {
  write(data: string | Blob | ArrayBuffer | ArrayBufferView): Promise<void>
  close(): Promise<void>
}

interface Window {
  showOpenFilePicker(options?: {
    types?: { description?: string; accept: Record<string, string[]> }[]
    multiple?: boolean
    excludeAcceptAllOption?: boolean
  }): Promise<FileSystemFileHandle[]>
  showSaveFilePicker(options?: {
    suggestedName?: string
    types?: { description?: string; accept: Record<string, string[]> }[]
  }): Promise<FileSystemFileHandle>
}
