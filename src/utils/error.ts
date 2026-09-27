import { UserCanceledError } from '../services/fileService'

/** 将异常转为可展示的中文文案 */
export function errMsg(e: unknown): string {
  if (e instanceof UserCanceledError) return '已取消'
  if (e instanceof Error && e.message) return e.message
  return '操作失败，请重试'
}
