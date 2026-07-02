import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 浏览器端 mock 后端：本案例仓无真实后端，所有 /api/* 请求由 MSW worker 拦截。
// dev / preview 必须启用；测试环境使用 msw/node（见 tests/setup.ts），不依赖本入口。
// 如需指向真实后端，设 VITE_USE_MSW=false。
async function enableMocking() {
  if (import.meta.env.VITE_USE_MSW === 'false') return
  const { startDevWorker } = await import('../msw/browser')
  await startDevWorker()
}

enableMocking().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
