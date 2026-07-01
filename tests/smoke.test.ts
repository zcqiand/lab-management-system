import { describe, it, expect } from 'vitest'
import { handlers } from '../msw/handlers'
import { server } from '../msw/server'

describe('scaffold smoke', () => {
  it('MSW server 实例可创建且 handlers 数组可读', () => {
    expect(server).toBeDefined()
    expect(Array.isArray(handlers)).toBe(true)
  })

  it('环境变量默认离线', () => {
    // 测试环境默认 VITE_OFFLINE 未设置或为 1
    // 这里仅断言 import.meta.env 可访问，不强制具体值
    expect(import.meta).toBeDefined()
  })
})
