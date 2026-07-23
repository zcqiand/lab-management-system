/** 报告类别 ↔ 检测标准 关联（M04.F01.I04） */
export interface CategoryStandard {
  id: string;
  categoryCode: string;
  standardCode: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}