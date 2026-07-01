import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { server } from '../msw/server'
import { resetMockDb } from '../msw/db'

// MSW 全局 server 生命周期：所有测试统一拦截后端请求，无真实网络。
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  localStorage.clear()
  // ch36：每个测试后重置 mock 内存表，保证 projects/samples 测试隔离
  resetMockDb()
})
afterAll(() => server.close())
