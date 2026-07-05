import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// 浏览器环境下的 MSW worker 实例（dev / preview 使用）。
// Node 测试环境见 msw/server.ts。handlers 与 server 共用，保证行为一致。
export const worker = setupWorker(...handlers)

/** dev / preview 启动入口：reset 全表 → seed 全表数据 → 启动 worker。
 * 幂等：resetMockDb 清空后再 seed，保证刷新页面不重复插入。
 * 测试不调用本函数，因此不影响测试隔离语义。
 */
export async function startDevWorker() {
  const { resetMockDb, seedData } = await import('./db')
  resetMockDb()
  seedData()
  await worker.start({ onUnhandledRequest: 'bypass' })
}