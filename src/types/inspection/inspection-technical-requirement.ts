/**
 * 技术要求（InspectionTechnicalRequirement）— M06.F06
 *
 * 按检测项目 + 检测参数 + 判定依据标准 + 条件 用于单项评定。
 * 只有 verificationStatus=verified 且 judgmentMode=automatic 的记录才参与自动评定。
 */

export type RequirementValueType = "numeric" | "string" | "range" | "formula" | "manual";
export type RequirementComparison = "≥" | "≤" | "=" | "range" | "eq";
export type RequirementVerificationStatus = "draft" | "reviewed" | "verified" | "rejected";
export type RequirementJudgmentMode = "automatic" | "manual";

export interface InspectionTechnicalRequirement {
  id: string;
  inspectionObjectCode: string;
  inspectionParameterCode: string;
  /** 限定为该项目的判定依据标准；不允许使用检测依据标准。 */
  judgmentStandardCode: string;
  /** 适用条件文本。 */
  conditions?: string;
  valueType: RequirementValueType;
  /** numeric 时使用。 */
  minValue?: number;
  maxValue?: number;
  /** range/eq 时使用。 */
  targetValue?: string;
  /** formula 时使用。 */
  expression?: string;
  unit?: string;
  /** 兼容历史比较语义。 */
  comparison: RequirementComparison;
  judgmentMode: RequirementJudgmentMode;
  verificationStatus: RequirementVerificationStatus;
  clause?: string;
  sourcePage?: number;
  sourceHash?: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}
