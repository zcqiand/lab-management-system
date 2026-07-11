import { describe, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HasPermission } from '../../../src/features/auth/hasPermission'
import { useAuthStore } from '../../../src/features/auth/authStore'
import { fnTest } from '../../fn'
import type { User } from '../../../src/types/api'

const adminUser: User = {
  id: 'u-001',
  username: 'labadmin',
  displayName: '实验室管理员',
  role: { id: 'role-admin', name: 'admin', permissions: ['project:read', 'user:delete'] },
  permissions: ['project:read', 'user:delete'],
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.setState({ user: null, token: null, status: 'idle', error: null })
})

describe('HasPermission 组件', () => {
  fnTest(['M01.F04.I03'], '有权限时渲染 children', () => {
    useAuthStore.setState({ user: adminUser })
    render(
      <HasPermission permission="project:read">
        <div>受保护内容</div>
      </HasPermission>,
    )
    expect(screen.getByText('受保护内容')).toBeInTheDocument()
  })

  fnTest(['M01.F04.I03'], '无权限时不渲染 children', () => {
    useAuthStore.setState({ user: adminUser })
    render(
      <HasPermission permission="user:delete">
        <div>删除按钮</div>
      </HasPermission>,
    )
    // admin 有 user:delete，应渲染
    expect(screen.getByText('删除按钮')).toBeInTheDocument()
  })

  fnTest(['M01.F04.I03'], '无权限时渲染 fallback', () => {
    render(
      <HasPermission permission="user:delete" fallback={<span>无权操作</span>}>
        <div>删除按钮</div>
      </HasPermission>,
    )
    expect(screen.queryByText('删除按钮')).not.toBeInTheDocument()
    expect(screen.getByText('无权操作')).toBeInTheDocument()
  })

  fnTest(['M01.F04.I03'], '无权限且无 fallback 时渲染为空', () => {
    render(
      <HasPermission permission="user:delete">
        <div>删除按钮</div>
      </HasPermission>,
    )
    expect(screen.queryByText('删除按钮')).not.toBeInTheDocument()
  })

  fnTest(['M01.F04.I03', 'M01.F04.I02'], '未登录时不渲染 children', () => {
    render(
      <HasPermission permission="project:read">
        <div>受保护内容</div>
      </HasPermission>,
    )
    expect(screen.queryByText('受保护内容')).not.toBeInTheDocument()
  })
})
