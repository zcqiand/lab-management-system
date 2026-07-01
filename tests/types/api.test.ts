import { describe, it, expect } from 'vitest'
import type {
  Project,
  Sample,
  Report,
  User,
  Role,
  Permission,
  ProjectStatus,
  SampleStatus,
  ReportStatus,
  ApiResult,
  Page,
  PageQuery,
} from '../../src/types/api'

describe('types/api 业务实体', () => {
  it('Project 类型可构造且字段符合预期', () => {
    const project: Project = {
      id: 'p-001',
      name: '城南检测项目',
      code: 'LAB-2026-001',
      status: 'active',
      ownerId: 'u-001',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    expect(project.id).toBe('p-001')
    expect(project.status).toBe('active')
  })

  it('ProjectStatus 联合类型覆盖三态', () => {
    const statuses: ProjectStatus[] = ['active', 'archived', 'paused']
    expect(statuses).toHaveLength(3)
  })

  it('Sample 类型可构造且字段符合预期', () => {
    const sample: Sample = {
      id: 's-001',
      projectId: 'p-001',
      name: '混凝土试块-A',
      code: 'SP-001',
      status: 'pending',
      receivedAt: '2026-01-02T00:00:00Z',
      createdAt: '2026-01-02T00:00:00Z',
    }
    expect(sample.projectId).toBe('p-001')
    expect(sample.status).toBe('pending')
  })

  it('SampleStatus 联合类型覆盖流转状态', () => {
    const statuses: SampleStatus[] = ['pending', 'testing', 'completed', 'rejected']
    expect(statuses).toHaveLength(4)
  })

  it('Report 类型可构造且字段符合预期', () => {
    const report: Report = {
      id: 'r-001',
      sampleId: 's-001',
      title: '抗压强度检测报告',
      status: 'draft',
      conclusion: '合格',
      issuedAt: null,
      createdAt: '2026-01-03T00:00:00Z',
    }
    expect(report.sampleId).toBe('s-001')
    expect(report.issuedAt).toBeNull()
  })

  it('ReportStatus 联合类型覆盖报告状态', () => {
    const statuses: ReportStatus[] = ['draft', 'reviewing', 'issued']
    expect(statuses).toHaveLength(3)
  })

  it('Role / Permission / User 类型可构造', () => {
    const perm: Permission = 'project:read'
    const role: Role = {
      id: 'role-admin',
      name: 'admin',
      permissions: ['project:read', 'project:write', 'user:delete'],
    }
    const user: User = {
      id: 'u-001',
      username: 'labadmin',
      displayName: '实验室管理员',
      role,
      permissions: role.permissions,
    }
    expect(user.role.name).toBe('admin')
    expect(user.permissions).toContain('user:delete')
    expect(perm).toBe('project:read')
  })

  it('ApiResult 成功与失败两态可构造', () => {
    const ok: ApiResult<string> = { ok: true, value: 'done' }
    const err: ApiResult<string> = { ok: false, error: '失败' }
    expect(ok.ok).toBe(true)
    expect(err.ok).toBe(false)
  })

  it('Page 分页结构与 PageQuery 查询参数', () => {
    const page: Page<Project> = {
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    }
    const query: PageQuery = { page: 1, pageSize: 20, keyword: '城南' }
    expect(page.pageSize).toBe(20)
    expect(query.keyword).toBe('城南')
  })
})
