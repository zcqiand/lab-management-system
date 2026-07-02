import { Outlet, NavLink } from 'react-router-dom'

interface NavItem {
  to: string
  label: string
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: '仪表盘' },
  { to: '/projects', label: '项目管理' },
  { to: '/samples', label: '样品管理' },
  { to: '/flow', label: '检测流程' },
  { to: '/reports', label: '报告管理' },
  { to: '/settings/users', label: '用户管理' },
  { to: '/settings/roles', label: '角色管理' },
]

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-56 bg-gray-800 text-white flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-base font-bold leading-tight">建筑工程实验室管理系统</h1>
        </div>
        <nav className="flex-1 p-2 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded text-sm transition-colors ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
