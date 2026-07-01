import { describe, it, expect } from 'vitest'

const API_BASE = 'http://localhost/api'

async function login(username: string, password: string) {
  return fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
}

async function me(token: string) {
  return fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}

describe('MSW auth handlers', () => {
  it('POST /auth/login 成功返回 token + user（admin）', async () => {
    const res = await login('labadmin', 'lab123')
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.token).toBeTruthy()
    expect(data.token.split('.')).toHaveLength(3)
    expect(data.user.username).toBe('labadmin')
    expect(data.user.role.name).toBe('admin')
    expect(data.user.permissions).toContain('user:delete')
  })

  it('POST /auth/login 成功返回 technician 角色', async () => {
    const res = await login('technician', 'tech123')
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.user.username).toBe('technician')
    expect(data.user.role.name).toBe('technician')
    expect(data.user.permissions).not.toContain('user:delete')
    expect(data.user.permissions).toContain('sample:write')
  })

  it('POST /auth/login 错误密码返回 401', async () => {
    const res = await login('labadmin', 'wrong-password')
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.message).toBeTruthy()
  })

  it('POST /auth/login 不存在的用户返回 401', async () => {
    const res = await login('nobody', 'whatever')
    expect(res.status).toBe(401)
  })

  it('GET /auth/me 携带有效 token 返回 user', async () => {
    const loginRes = await login('labadmin', 'lab123')
    const { token } = await loginRes.json()
    const res = await me(token)
    expect(res.ok).toBe(true)
    const data = await res.json()
    expect(data.user.username).toBe('labadmin')
    expect(data.user.role.name).toBe('admin')
  })

  it('GET /auth/me 无 token 返回 401', async () => {
    const res = await fetch(`${API_BASE}/auth/me`)
    expect(res.status).toBe(401)
  })

  it('GET /auth/me 无效 token 返回 401', async () => {
    const res = await me('invalid.token.value')
    expect(res.status).toBe(401)
  })
})
