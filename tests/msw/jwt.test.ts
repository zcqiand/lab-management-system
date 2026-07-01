import { describe, it, expect } from 'vitest'
import { signJwt, verifyJwt } from '../../msw/jwt'

describe('mock JWT 工具', () => {
  it('signJwt 生成三段式 token（header.payload.signature）', () => {
    const token = signJwt({ sub: 'u-001', username: 'labadmin', role: 'admin', permissions: [] })
    expect(token.split('.')).toHaveLength(3)
  })

  it('verifyJwt 校验有效 token 返回 payload', () => {
    const token = signJwt({
      sub: 'u-001',
      username: 'labadmin',
      role: 'admin',
      permissions: ['project:read', 'user:delete'],
    })
    const payload = verifyJwt(token)
    expect(payload).not.toBeNull()
    expect(payload?.sub).toBe('u-001')
    expect(payload?.username).toBe('labadmin')
    expect(payload?.role).toBe('admin')
    expect(payload?.permissions).toContain('user:delete')
  })

  it('verifyJwt 拒绝篡改 signature 的 token', () => {
    const token = signJwt({ sub: 'u-001', username: 'labadmin', role: 'admin', permissions: [] })
    const tampered = token.slice(0, -4) + 'AAAA'
    expect(verifyJwt(tampered)).toBeNull()
  })

  it('verifyJwt 拒绝过期 token', () => {
    const token = signJwt({ sub: 'u-001', username: 'labadmin', role: 'admin', permissions: [] }, -10)
    expect(verifyJwt(token)).toBeNull()
  })

  it('verifyJwt 拒绝格式错误的 token', () => {
    expect(verifyJwt('not-a-jwt')).toBeNull()
    expect(verifyJwt('a.b')).toBeNull()
  })
})
