import { setupServer } from 'msw/node'
import { handlers } from './handlers'
import { seedBatch3Data } from './db'

// Node 环境下的 MSW server 实例（vitest 使用）。
// 浏览器环境另有 msw/browser.ts（后续按需添加）。
export const server = setupServer(...handlers)

// Seed all tables once on server start so the app has data without a login required.
seedBatch3Data()
