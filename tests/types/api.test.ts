import { describe, it, expect } from 'vitest'
import type {
  Contract,
  ContractStatus,
  SampleReceipt,
  Sample,
  TestItem,
  ReportCategory,
  CategoryStandard,
  CategoryDictItem,
  ReportTemplate,
  SummaryData,
  User,
  Role,
  Permission,
  ApiResult,
  Page,
  PageQuery,
} from '../../src/types/api'
import { FLOW_STAGE_ORDER, FLOW_STAGE_LABELS } from '../../src/types/api'

describe('types/api 业务实体（v3）', () => {
  it('Contract 类型可构造且字段符合预期', () => {
    const contract: Contract = {
      id: 'c-001',
      contractCode: 'HT-2024-001',
      clientUnit: '城投公司',
      projectName: '滨江花园一期',
      constructionUnit: '中建三局',
      witnessUnit: '华监监理',
      witness: '张监理',
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    expect(contract.contractCode).toBe('HT-2024-001')
    const statuses: ContractStatus[] = ['active', 'archived']
    expect(statuses).toHaveLength(2)
  })

  it('ReportCategory 携带扩展属性定义与汇总口径', () => {
    const cat: ReportCategory = {
      id: 'cat-steel',
      code: 'steel',
      name: '钢材',
      reportTitle: '钢筋力学性能、工艺性能、重量偏差检测报告',
      summaryType: 'material',
      summaryName: '钢材试验报告汇总表',
      extFields: [{ key: 'furnaceNo', label: '炉号（批号）' }],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    expect(cat.extFields[0].key).toBe('furnaceNo')
    expect(cat.summaryType).toBe('material')
  })

  it('CategoryStandard / CategoryDictItem 均归属报告类别', () => {
    const link: CategoryStandard = {
      id: 'cs-1',
      categoryCode: 'steel',
      standardCode: 'GB 1499.2-2024',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const dict: CategoryDictItem = {
      id: 'mdl-1',
      categoryCode: 'steel',
      name: '热轧带肋钢筋',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    expect(link.categoryCode).toBe(dict.categoryCode)
  })

  it('SampleReceipt 携带报告类别与合并的报告字段', () => {
    const receipt: SampleReceipt = {
      id: 'rc-001',
      contractId: 'c-001',
      receiptCode: 'RC-2024-0501-01',
      categoryCode: 'steel',
      receivedDate: '2024-05-01',
      receivedBy: '王五',
      sampleSource: '施工送检',
      testCategory: '委托检验',
      flowStatus: 'receiving',
      flowHistory: [],
      lastSubmittedBy: null,
      reportCode: 'R-RC-2024-0501-01',
      result: 'pass',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    expect(receipt.categoryCode).toBe('steel')
    expect(receipt.reportCode).toContain('R-')
  })

  it('Sample 归属接样单 receiptId，含型号/规格/等级/牌号与扩展属性', () => {
    const sample: Sample = {
      id: 's-001',
      receiptId: 'rc-001',
      sampleCode: 'RC-2024-0501-01-S1',
      model: '热轧带肋钢筋',
      specification: 'Φ22',
      brand: 'HRB400E',
      ext: { furnaceNo: 'LH-2024-0501' },
      createdAt: '2026-01-02T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
    }
    expect(sample.receiptId).toBe('rc-001')
    expect(sample.ext.furnaceNo).toBe('LH-2024-0501')
    // @ts-expect-error v3: 样品不再归属合同
    expect(sample.contractId).toBeUndefined()
  })

  it('TestItem 归属样品 sampleId，自动评定 + 最终评定', () => {
    const item: TestItem = {
      id: 'ti-001',
      sampleId: 's-001',
      parameterCode: 'STE001',
      requirement: '≥ 400 MPa',
      result: '425',
      autoPassed: true,
      passed: true,
      createdAt: '2026-01-03T00:00:00Z',
      updatedAt: '2026-01-03T00:00:00Z',
    }
    expect(item.sampleId).toBe('s-001')
    expect(item.autoPassed).toBe(true)
  })

  it('FLOW_STAGE_ORDER 覆盖七个阶段且有中文名', () => {
    expect(FLOW_STAGE_ORDER).toHaveLength(7)
    expect(FLOW_STAGE_ORDER[0]).toBe('receiving')
    expect(FLOW_STAGE_ORDER[6]).toBe('archived')
    expect(FLOW_STAGE_LABELS.task_assignment).toBe('任务安排')
  })

  it('ReportTemplate 每类别一份，SummaryData 列+行结构', () => {
    const tpl: ReportTemplate = {
      id: 'tpl-steel',
      categoryCode: 'steel',
      name: '钢材报告模板',
      content: '<h1>{{category.reportTitle}}</h1>',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    }
    const summary: SummaryData = {
      summaryName: '钢材试验报告汇总表',
      columns: [{ key: 'brand', label: '牌号' }],
      rows: [{ brand: 'HRB400E' }],
    }
    expect(tpl.content).toContain('{{')
    expect(summary.rows[0].brand).toBe('HRB400E')
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
    expect(perm).toBe('project:read')
  })

  it('ApiResult 成功与失败两态可构造', () => {
    const ok: ApiResult<string> = { ok: true, value: 'done' }
    const err: ApiResult<string> = { ok: false, error: '失败' }
    expect(ok.ok).toBe(true)
    expect(err.ok).toBe(false)
  })

  it('Page 分页结构与 PageQuery 查询参数', () => {
    const page: Page<Contract> = { items: [], total: 0, page: 1, pageSize: 20 }
    const query: PageQuery = { page: 1, pageSize: 20, keyword: '滨江' }
    expect(page.pageSize).toBe(20)
    expect(query.keyword).toBe('滨江')
  })
})
