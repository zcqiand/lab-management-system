/** 报告文档（M03.F04-F08：报告编制 / 审核 / 批准 / 发放 / 归档） */

export interface Report {
  id: string;
  title: string;
  status: ReportStatus;
  conclusion?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}
export type ReportStatus = string;
export type ReviewAction = 'approve' | 'reject' | 'return';
export interface ReportQuery {
  page: number;
  pageSize: number;
  status?: ReportStatus;
  keyword?: string;
  sampleId?: string;
  [key: string]: unknown;
}
export interface ReportCreateInput {
  title: string;
  status?: ReportStatus;
  conclusion?: string;
}
export interface ReportUpdateInput {
  title?: string;
  status?: ReportStatus;
  conclusion?: string;
}
export interface ReportRecord {
  id: string;
  contractId: string;
  receiptId: string;
  reportCode: string;
  materialType: string;
  sampleIds: string[];
  conclusion?: string;
  reportDate?: string;
  result?: 'pass' | 'fail';
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}