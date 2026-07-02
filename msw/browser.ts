import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// 浏览器环境下的 MSW worker 实例（dev / preview 使用）。
// Node 测试环境见 msw/server.ts。handlers 与 server 共用，保证行为一致。
export const worker = setupWorker(...handlers)

/** dev / preview 启动入口：seed 单例表（OrgInfo 等）→ 启动 worker。
 * 测试不调用本函数，因此不影响测试隔离语义。
 */
export async function startDevWorker() {
  const { seedDevData } = await import('./db')
  seedDevData()
  await worker.start({ onUnhandledRequest: 'bypass' })
}