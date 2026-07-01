// 业务实体类型定义（建筑工程实验室管理系统）
// ch34：架构与路由章节的基础类型契约

/** 项目状态 */
export type ProjectStatus = 'active' | 'archived' | 'paused'

/** 样品状态（流转：待检 → 检测中 → 已完成/已拒收） */
export type SampleStatus = 'pending' | 'testing' | 'completed' | 'rejected'

/** 报告状态 */
export type ReportStatus = 'draft' | 'reviewing' | 'issued'

/** 权限码：资源:操作（如 project:read、user:delete） */
export type Permission = string

/** 角色 */
export interface Role {
  id: string
  name: string
  permissions: Permission[]
}

/** 用户 */
export interface User {
  id: string
  username: string
  displayName: string
  role: Role
  /** 用户最终权限集合（角色权限 + 个人授权的并集） */
  permissions: Permission[]
}

/** 项目（检测项目） */
export interface Project {
  id: string
  name: string
  code: string
  status: ProjectStatus
  ownerId: string
  createdAt: string
  updatedAt: string
}

/** 样品 */
export interface Sample {
  id: string
  projectId: string
  name: string
  code: string
  status: SampleStatus
  receivedAt: string
  createdAt: string
}

/** 检测报告 */
export interface Report {
  id: string
  sampleId: string
  title: string
  status: ReportStatus
  conclusion: string
  /** 签发时间，未签发为 null */
  issuedAt: string | null
  createdAt: string
}

/** 统一 API 结果：成功带 value，失败带 error */
export type ApiResult<T> = { ok: true; value: T } | { ok: false; error: string }

/** 分页响应 */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

/** 分页查询参数 */
export interface PageQuery {
  page: number
  pageSize: number
  keyword?: string
}

/** 日期范围筛选 */
export interface DateRangeFilter {
  dateFrom?: string
  dateTo?: string
}

/** 项目列表查询参数（ch36：在 PageQuery 基础上只增 status/ownerId/日期范围） */
export interface ProjectQuery extends PageQuery, DateRangeFilter {
  status?: ProjectStatus
  ownerId?: string
}

/** 样品列表查询参数（ch36：在 PageQuery 基础上只增 status/projectId） */
export interface SampleQuery extends PageQuery {
  status?: SampleStatus
  projectId?: string
}

/** 项目新建载荷 */
export interface ProjectCreateInput {
  name: string
  code: string
  status?: ProjectStatus
  ownerId: string
}

/** 项目更新载荷（所有字段可选） */
export interface ProjectUpdateInput {
  name?: string
  code?: string
  status?: ProjectStatus
  ownerId?: string
}

/** 样品新建载荷 */
export interface SampleCreateInput {
  projectId: string
  name: string
  code: string
  status?: SampleStatus
}

/** 样品更新载荷 */
export interface SampleUpdateInput {
  projectId?: string
  name?: string
  code?: string
  status?: SampleStatus
}
