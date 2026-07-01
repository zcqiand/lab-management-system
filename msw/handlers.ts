import { http, HttpResponse } from 'msw'
import type { User, Role, Permission } from '../src/types/api'
import { signJwt, verifyJwt } from './jwt'

// —— mock 用户库（仅 mock 层，非真实凭证）——
const ADMIN_PERMISSIONS: Permission[] = [
  'project:read',
  'project:write',
  'sample:read',
  'sample:write',
  'report:read',
  'report:write',
  'report:issue',
  'user:read',
  'user:delete',
]
const TECH_PERMISSIONS: Permission[] = [
  'project:read',
  'sample:read',
  'sample:write',
  'report:read',
  'report:write',
]

const adminRole: Role = { id: 'role-admin', name: 'admin', permissions: ADMIN_PERMISSIONS }
const techRole: Role = { id: 'role-tech', name: 'technician', permissions: TECH_PERMISSIONS }

interface MockUserRecord {
  password: string
  user: User
}

const MOCK_USERS: Record<string, MockUserRecord> = {
  labadmin: {
    password: 'lab123',
    user: {
      id: 'u-001',
      username: 'labadmin',
      displayName: '实验室管理员',
      role: adminRole,
      permissions: ADMIN_PERMISSIONS,
    },
  },
  technician: {
    password: 'tech123',
    user: {
      id: 'u-002',
      username: 'technician',
      displayName: '检测员',
      role: techRole,
      permissions: TECH_PERMISSIONS,
    },
  },
}

interface LoginResponse {
  token: string
  user: User
}

// MSW handler 注册表。
// ch35：追加 /auth/login、/auth/me。后续章节在此数组追加新 handler（只增不改）。
export const handlers = [
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string }
    const record = MOCK_USERS[body.username]
    if (!record || record.password !== body.password) {
      return HttpResponse.json({ message: '用户名或密码错误' }, { status: 401 })
    }
    const token = signJwt({
      sub: record.user.id,
      username: record.user.username,
      role: record.user.role.name,
      permissions: record.user.permissions,
    })
    const data: LoginResponse = { token, user: record.user }
    return HttpResponse.json(data)
  }),

  http.get('*/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (!auth || !auth.startsWith('Bearer ')) {
      return HttpResponse.json({ message: '未授权' }, { status: 401 })
    }
    const token = auth.slice(7)
    const payload = verifyJwt(token)
    if (!payload) {
      return HttpResponse.json({ message: 'token 无效或已过期' }, { status: 401 })
    }
    const record = Object.values(MOCK_USERS).find((r) => r.user.id === payload.sub)
    if (!record) {
      return HttpResponse.json({ message: '用户不存在' }, { status: 401 })
    }
    return HttpResponse.json({ user: record.user })
  }),
]
