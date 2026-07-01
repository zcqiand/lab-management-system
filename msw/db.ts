// Mock 内存数据库：仅 mock 层使用，测试间隔离由 tests/setup.ts 的 resetHandlers + 本模块的 resetDb 保证。
// ch36：projects/samples 的 CRUD + 分页/搜索/过滤工具。

export interface Timestamped {
  createdAt: string
  updatedAt: string
}

function now(): string {
  return new Date().toISOString()
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

/** 通用内存表：支持分页、关键词搜索、字段精确过滤、日期范围 */
export class MockTable<T extends { id: string } & Timestamped> {
  private rows: T[] = []

  constructor(private idPrefix: string) {}

  /** 重置为空表（测试隔离用） */
  reset() {
    this.rows = []
  }

  insert(row: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<T, 'id'>>): T {
    const entity = {
      ...row,
      id: row.id ?? genId(this.idPrefix),
      createdAt: now(),
      updatedAt: now(),
    } as T
    this.rows.push(entity)
    return entity
  }

  findById(id: string): T | undefined {
    return this.rows.find((r) => r.id === id)
  }

  update(id: string, patch: Partial<T>): T | undefined {
    const idx = this.rows.findIndex((r) => r.id === id)
    if (idx === -1) return undefined
    const updated = { ...this.rows[idx], ...patch, id, updatedAt: now() } as T
    this.rows[idx] = updated
    return updated
  }

  remove(id: string): boolean {
    const idx = this.rows.findIndex((r) => r.id === id)
    if (idx === -1) return false
    this.rows.splice(idx, 1)
    return true
  }

  /**
   * 分页查询。
   * @param opts.page 页码（1-based）
   * @param opts.pageSize 每页条数
   * @param opts.keyword 关键词（在 keywordFields 中模糊匹配）
   * @param opts.filters 精确匹配字段
   * @param opts.dateField 日期筛选字段
   * @param opts.dateFrom / opts.dateTo 日期范围（含端点）
   */
  query(opts: {
    page: number
    pageSize: number
    keyword?: string
    keywordFields?: (keyof T)[]
    filters?: Partial<T>
    dateField?: keyof T
    dateFrom?: string
    dateTo?: string
  }): { items: T[]; total: number; page: number; pageSize: number } {
    const { page, pageSize, keyword, keywordFields, filters, dateField, dateFrom, dateTo } = opts
    let filtered = [...this.rows]

    if (keyword && keywordFields?.length) {
      const kw = keyword.toLowerCase()
      filtered = filtered.filter((row) =>
        keywordFields.some((f) => String(row[f] ?? '').toLowerCase().includes(kw)),
      )
    }

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          filtered = filtered.filter((row) => row[key as keyof T] === value)
        }
      }
    }

    if (dateField && (dateFrom || dateTo)) {
      filtered = filtered.filter((row) => {
        const v = row[dateField] as unknown as string
        if (!v) return true
        if (dateFrom && v < dateFrom) return false
        if (dateTo && v > dateTo) return false
        return true
      })
    }

    // 按 createdAt 倒序，新创建的在前
    filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

    const total = filtered.length
    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)
    return { items, total, page, pageSize }
  }
}

/** 全局 mock 表实例（ch36 新增） */
export const projectTable = new MockTable<{ id: string; name: string; code: string; status: string; ownerId: string; createdAt: string; updatedAt: string }>('p')
export const sampleTable = new MockTable<{ id: string; projectId: string; name: string; code: string; status: string; receivedAt: string; createdAt: string; updatedAt: string }>('s')

/** 测试隔离：重置所有 mock 表 */
export function resetMockDb() {
  projectTable.reset()
  sampleTable.reset()
}
