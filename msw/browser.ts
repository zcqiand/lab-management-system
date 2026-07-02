import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// 浏览器环境下的 MSW worker 实例（dev / preview 使用）。
// Node 测试环境见 msw/server.ts。handlers 与 server 共用，保证行为一致。
export const worker = setupWorker(...handlers)