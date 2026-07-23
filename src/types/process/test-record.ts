/** 单项检测记录（M03.F03）——归属样品 sampleId；自动评定 + 手工修正 */

export interface TestRecord {
  id: string;
  sampleId: string;
  parameterCode: string;
  standardCode?: string;
  requirementCode?: string;
  /** 技术要求显示文本，如「≥ 400 MPa」 */
  requirement: string;
  /** 检测值（单值时使用） */
  result: string;
  unit?: string;
  /** 多样本检测时的检测值数组，如 [42.5, 43.2, 41.8] */
  testValues?: number[];
  /** 后端计算的代表值（如多样本平均值） */
  representativeValue?: number;
  /** 系统按技术要求自动评定的结果（null = 无法自动评定，需人工判定） */
  autoPassed: boolean | null;
  /** 最终评定结果（默认取 autoPassed，可手工修正；null=未评定） */
  passed: boolean | null;
  /** 单项评定文本（改判用）：''=未评定、合格、不合格、符合、不符合 */
  verdict?: string;
  /** 各试件荷载值（N），用于抗折强度 */
  loads?: number[];
  /** 各试件是否作废标记，用于抗折强度 */
  disqualified?: boolean[];
  /** 试验方法（用于安定性检测：CEM005） */
  testMethod?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}