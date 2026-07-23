/** 计算规则（M04.F11 / M06.F05） */
/** 算法类型枚举 */
export type AlgorithmType = 'simple_avg' | 'compressive_strength';

/** 计算规则 */
export interface CalculationRule {
  id: string;
  parameterCode: string;
  algorithmType: AlgorithmType;
  specimenCount: number;
  unit?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}