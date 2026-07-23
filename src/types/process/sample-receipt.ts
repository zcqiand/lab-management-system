import type { FlowStage, FlowHistoryEntry } from './flow';

/**
 * 接样单（M03.F01）——接样表与报告表合并为一张表。
 * 领域主链：合同 Contract → 接样单 SampleReceipt → 样品 Sample → 单项检测记录 TestItem。
 */

export interface SampleReceipt {
  id: string;
  contractId: string;
  /** 委托书编号 */
  commissionCode: string;
  /** 委托日期 */
  commissionDate: string;
  /** 委托书登记号 */
  commissionRegisterCode?: string;
  /** 委托书登记日期 */
  commissionRegisterDate?: string;
  /** 报告类别——样品扩展属性、报告模板、汇总口径均由此决定 */
  categoryCode: string;
  /** 工程名称（从合同带出） */
  projectName?: string;
  /** 委托单位（从合同带出） */
  clientUnit?: string;
  /** 建设单位（从合同带出） */
  buildingUnit?: string;
  /** 监理单位（从合同带出） */
  supervisorUnit?: string;
  /** 施工单位（从合同带出） */
  constructionUnit?: string;
  /** 见证单位（从合同带出） */
  witnessUnit?: string;
  /** 取样地点 */
  samplingLocation?: string;
  /** 见证人 */
  witness?: string;
  /** 见证人电话 */
  witnessPhone?: string;
  /** 送检人 */
  inspector?: string;
  /** 送检人电话 */
  inspectorPhone?: string;
  /** 接样人（记录操作人员） */
  receivedBy: string;
  sampleSource: string;
  testCategory: string;
  /** 检测环境（在数据录入环节维护） */
  testEnvironment?: string;
  /** 检测设备（在数据录入环节维护） */
  mainEquipment?: string;
  /** 检测人员（在数据录入环节维护） */
  testOperator?: string;
  /** 检测开始日期（在数据录入环节维护） */
  testStartDate?: string;
  /** 检测结束日期（在数据录入环节维护） */
  testEndDate?: string;
  /** 原始记录单号（在数据录入环节维护） */
  originalRecordNo?: string;
  /** 备注（在数据录入环节维护） */
  remark?: string;
  /** 判定依据：检测标准编码数组 */
  judgmentBasis?: string[];
  /** 检测依据：检测标准编码数组 */
  testingBasis?: string[];
  /** 检测参数编码数组（按判定依据∪检测依据过滤） */
  testParameters?: string[];
  // ----- 流程管线 -----
  flowStatus: FlowStage;
  flowHistory: FlowHistoryEntry[];
  /** 最近一次提交的操作人（撤回权限校验：仅提交人可撤回） */
  lastSubmittedBy: string | null;
  /** 任务安排：检测人员 / 计划检测日期 */
  assigneeId?: string;
  assigneeName?: string;
  plannedTestDate?: string;
  // ----- 合并自报告表 -----
  reportCode?: string;
  reportDate?: string;
  conclusion?: string;
  result?: 'pass' | 'fail' | '';
  issuedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}