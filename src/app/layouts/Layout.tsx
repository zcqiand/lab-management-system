import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/authStore'

interface MenuItem {
  to: string
  label: string
  permission?: string
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

const BUSINESS_MENU: MenuGroup = {
  title: '业务管理',
  items: [
    { to: '/contracts', label: '合同管理', permission: 'project:read' },
    // 流程线：接样 → 任务安排 → 数据录入 → 报告审核 → 报告批准 → 报告发放 → 报告归档
    { to: '/receipts', label: '接样管理', permission: 'sample:read' },
    { to: '/task-assignment', label: '任务安排', permission: 'report:write' },
    { to: '/data-entry', label: '数据录入', permission: 'report:write' },
    { to: '/report-review', label: '报告审核', permission: 'report:read' },
    { to: '/report-approve', label: '报告批准', permission: 'report:issue' },
    { to: '/report-issue', label: '报告发放', permission: 'report:read' },
    { to: '/report-archive', label: '报告归档', permission: 'report:read' },
    { to: '/summary', label: '统计汇总', permission: 'report:read' },
  ],
}

const BASIC_MENU: MenuGroup = {
  title: '基础管理',
  items: [
    { to: '/org-info', label: '机构信息', permission: 'user:read' },
    { to: '/settings/roles', label: '角色管理', permission: 'role:read' },
    { to: '/settings/users', label: '用户管理', permission: 'user:read' },
    { to: '/report-categories', label: '报告类别', permission: 'user:read' },
    { to: '/test-parameters', label: '参数管理', permission: 'user:read' },
    { to: '/test-standards', label: '标准管理', permission: 'user:read' },
    { to: '/technical-requirements', label: '技术要求', permission: 'user:read' },
    { to: '/models', label: '型号管理', permission: 'user:read' },
    { to: '/specifications', label: '规格管理', permission: 'user:read' },
    { to: '/grades', label: '等级管理', permission: 'user:read' },
    { to: '/brands', label: '牌号管理', permission: 'user:read' },
    { to: '/report-templates', label: '报告模板', permission: 'user:read' },
  ],
}

function MenuSection({
  group,
  defaultOpen,
}: {
  group: MenuGroup
  defaultOpen: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const user = useAuthStore((state) => state.user)
  const visibleItems = group.items.filter(
    (item) => !item.permission || user?.permissions.includes(item.permission),
  )

  if (visibleItems.length === 0) return null

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-gray-200 transition-colors"
      >
        <span>{group.title}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="mt-1 flex flex-col gap-0.5">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `block px-3 py-1.5 ml-2 text-sm rounded transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Layout() {
  const user = useAuthStore((state) => state.user)
  const showBusiness = user?.permissions.some((p) =>
    ['project:read', 'sample:read', 'report:read', 'report:write', 'report:issue'].includes(p),
  )
  const showBasic = user?.permissions.some((p) =>
    ['role:read', 'role:write', 'user:read', 'user:write'].includes(p),
  )

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-base font-bold leading-tight">建筑工程实验室管理系统</h1>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `block px-3 py-2 mb-2 rounded text-sm transition-colors ${
                isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            仪表盘
          </NavLink>

          {showBusiness && <MenuSection group={BUSINESS_MENU} defaultOpen />}
          {showBasic && <MenuSection group={BASIC_MENU} defaultOpen />}
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
