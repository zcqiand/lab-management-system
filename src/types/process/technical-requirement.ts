/** 技术要求（M04.F05 / M06.F06）——按报告类别+检测参数+判定标准+条件完成单项评定 */

export type ComparisonOp = '≥' | '≤' | '=' | 'range' | 'eq';

export interface TechnicalRequirement {
  id: string;
  code: string;
  standardCode: string;
  parameterCode: string;
  /** 归属报告类别 */
  categoryCode: string;
  /** 匹配维度：技术要求上填写了的维度必须与样品一致；空 = 不限 */
  brand?: string;
  model?: string;
  grade?: string;
  specification?: string;
  comparison: ComparisonOp;
  value: string;
  unit?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}