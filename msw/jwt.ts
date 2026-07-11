// Mock JWT 工具：仅用于 mock 层签发/校验，非生产凭证，无密码学安全性保证。
// token 遵循 JWT 三段式 header.payload.signature，signature 为基于 mock secret 的固定标记。
// 前端只解码 payload 获取用户信息；/auth/me handler 通过 verifyJwt 校验 signature + 过期时间。

const MOCK_SECRET = 'lab-mock-secret-not-for-production'

function base64url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(input: string): string {
  const pad = '='.repeat((4 - (input.length % 4)) % 4)
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// 基于 mock secret 的固定 signature（非密码学安全，仅用于 mock 校验一致性）
const MOCK_SIGNATURE = base64url(MOCK_SECRET + '::mock-hs256').slice(0, 32)

export interface JwtPayload {
  /** 用户 ID */
  sub: string
  username: string
  /** 角色名 */
  role: string
  permissions: string[]
  /** 过期时间戳（秒） */
  exp: number
}

export function signJwt(
  payload: Omit<JwtPayload, 'exp'>,
  expiresInSec = 3600,
): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const fullPayload: JwtPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + expiresInSec,
  }
  return [
    base64url(JSON.stringify(header)),
    base64url(JSON.stringify(fullPayload)),
    MOCK_SIGNATURE,
  ].join('.')
}

export function verifyJwt(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [, encodedPayload, signature] = parts
  if (signature !== MOCK_SIGNATURE) return null
  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload!)) as JwtPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
