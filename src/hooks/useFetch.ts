import { useCallback, useEffect, useRef, useState } from 'react'

interface UseFetchOptions {
  /** 是否启用获取，false 时不发起请求（默认 true） */
  enabled?: boolean
}

interface UseFetchResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  /** 手动重新触发获取 */
  refetch: () => Promise<void>
}

/**
 * 数据获取 hook：三态 loading/error/data + 手动 refetch + deps 自动触发。
 *
 * @param fetcher 获取函数，返回 Promise<T>
 * @param deps 依赖数组，变化时自动重新获取（与 useEffect 语义一致）
 * @param options.enabled 是否启用，false 时不发起请求
 */
export function useFetch<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options: UseFetchOptions = {},
): UseFetchResult<T> {
  const { enabled = true } = options
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState<boolean>(enabled)
  const [error, setError] = useState<string | null>(null)
  // 防止卸载后 setState + 竞态（后发先至）
  const mountedRef = useRef(true)
  const requestIdRef = useRef(0)

  const execute = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      // 仅最新请求可写入状态，避免竞态
      if (mountedRef.current && requestId === requestIdRef.current) {
        setData(result)
        setLoading(false)
      }
    } catch (err) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        const message = err instanceof Error ? err.message : String(err)
        setError(message)
        setLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    execute()
  }, [enabled, execute])

  return { data, loading, error, refetch: execute }
}
