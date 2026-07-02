import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '../msw/server'
import { resetMockDb } from '../msw/db'

// 修复 jsdom 25.x AbortSignal 与 Node undici 不兼容：
// jsdom 的 AbortSignal 不是 undici 内部 AbortSignal 的实例，undici 的 Request 构造函数拒绝。
// patch Request 构造函数：strip 掉 signal（MSW mock 响应不需要 signal，测试无 AbortController 依赖）。
const OriginalRequest = globalThis.Request
class PatchedRequest extends OriginalRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (init?.signal) {
      const { signal: _signal, ...rest } = init
      super(input, rest as RequestInit)
    } else {
      super(input, init)
    }
  }
}
globalThis.Request = PatchedRequest as typeof Request

// MSW 全局 server 生命周期：所有测试统一拦截后端请求，无真实网络。
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
  // ch36：每个测试后重置 mock 内存表，保证 projects/samples 测试隔离
  resetMockDb()
})
afterAll(() => server.close())
