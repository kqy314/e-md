import { Capacitor } from '@capacitor/core'

/** 是否运行在原生容器（Android WebView）中 */
export const isNative = Capacitor.isNativePlatform()

/** 原生桥接对象是否可用 */
export function hasNativeBridge(): boolean {
  return isNative && typeof window !== 'undefined' && !!(window as Window).MarkdownBridge
}
