/**
 * 通用基础类型 barrel
 *
 * 与功能模块无关的跨领域公共类型（分页/查询/结果包装）。
 */

/** 统一 API 结果：成功带 value，失败带 error */
export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** 分页响应 */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 分页查询参数 */
export interface PageQuery {
  page: number;
  pageSize: number;
  keyword?: string;
}

/** 日期范围筛选 */
export interface DateRangeFilter {
  dateFrom?: string;
  dateTo?: string;
}