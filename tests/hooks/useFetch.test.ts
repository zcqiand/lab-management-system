import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFetch } from '../../src/hooks/useFetch'

describe('useFetch 数据获取 hook', () => {
  it('初始 loading=true，resolve 后 loading=false 且 data 填充', async () => {
    const fetcher = vi.fn(async () => ({ name: '实验室A' }))
    const { result } = renderHook(() => useFetch(fetcher, []))

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ name: '实验室A' })
    expect(result.current.error).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('fetcher reject 后 error 填充，data 为 null', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('网络异常')
    })
    const { result } = renderHook(() => useFetch(fetcher, []))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBe('网络异常')
  })

  it('deps 变化触发重新 fetch', async () => {
    const fetcher = vi.fn(async (id: string) => ({ id }))
    const { result, rerender } = renderHook(({ id }) => useFetch(() => fetcher(id), [id]), {
      initialProps: { id: 'p-1' },
    })

    await waitFor(() => expect(result.current.data).toEqual({ id: 'p-1' }))
    expect(fetcher).toHaveBeenCalledTimes(1)

    rerender({ id: 'p-2' })
    await waitFor(() => expect(result.current.data).toEqual({ id: 'p-2' }))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('refetch 手动触发重新获取', async () => {
    let count = 0
    const fetcher = vi.fn(async () => {
      count += 1
      return { count }
    })
    const { result } = renderHook(() => useFetch(fetcher, []))

    await waitFor(() => expect(result.current.data).toEqual({ count: 1 }))
    await result.current.refetch()
    await waitFor(() => expect(result.current.data).toEqual({ count: 2 }))
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('enabled=false 时不发起 fetch', async () => {
    const fetcher = vi.fn(async () => 'data')
    const { result } = renderHook(() => useFetch(fetcher, [], { enabled: false }))

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('enabled 从 false 变 true 时触发 fetch', async () => {
    const fetcher = vi.fn(async () => 'data')
    const { result, rerender } = renderHook(({ enabled }) => useFetch(fetcher, [], { enabled }), {
      initialProps: { enabled: false },
    })

    expect(fetcher).not.toHaveBeenCalled()
    rerender({ enabled: true })
    await waitFor(() => expect(result.current.data).toBe('data'))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('请求期间组件卸载不报错', async () => {
    const fetcher = vi.fn(
      () => new Promise<string>((resolve) => setTimeout(() => resolve('late'), 50)),
    )
    const { result, unmount } = renderHook(() => useFetch(fetcher, []))

    expect(result.current.loading).toBe(true)
    unmount()
    // 不应抛未捕获的 promise rejection 或 setState on unmounted 警告
    await waitFor(() => expect(fetcher).toHaveBeenCalled())
  })

  it('deps 未变化时不重复 fetch（rerender 同 deps）', async () => {
    const fetcher = vi.fn(async () => 'data')
    const { result, rerender } = renderHook(() => useFetch(fetcher, ['stable']))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetcher).toHaveBeenCalledTimes(1)

    rerender()
    // deps 相同，不应重复 fetch
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
})
