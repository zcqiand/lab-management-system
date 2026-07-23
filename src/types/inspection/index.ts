/**
 * M06 检测能力领域类型 barrel
 *
 * 一类一文件（CLAUDE.md 硬约束）；本文件只做具名 re-export，
 * 禁止重新定义类型或合并默认值。
 */

export type { InspectionSpecialty } from "./inspection-specialty";
export type { InspectionObject } from "./inspection-object";
export type { InspectionParameter } from "./inspection-parameter";
export type { InspectionStandard } from "./inspection-standard";
export type { InspectionObjectParameter } from "./inspection-object-parameter";
export type { InspectionObjectStandard } from "./inspection-object-standard";
export type { InspectionStandardParameter } from "./inspection-standard-parameter";
export type { InspectionSpecialtyObject } from "./inspection-specialty-object";
export type { InspectionStandardRole } from "./inspection-standard-role";
export type { InspectionQualificationLevel } from "./inspection-qualification-level";
export type { InspectionReadinessStatus } from "./inspection-readiness-status";
export type { InspectionCalculationRule, CalculationAlgorithmType } from "./inspection-calculation-rule";
export type {
  InspectionTechnicalRequirement,
  RequirementValueType,
  RequirementComparison,
  RequirementVerificationStatus,
  RequirementJudgmentMode,
} from "./inspection-technical-requirement";
export type { InspectionReportName } from "./inspection-report-name";
export type { InspectionBrand } from "./inspection-brand";
export type { InspectionModel } from "./inspection-model";
export type { InspectionGrade } from "./inspection-grade";
export type { InspectionSpec } from "./inspection-spec";
export type { InspectionObjectReportName } from "./inspection-object-report-name";
export type { InspectionReportNameStandard } from "./inspection-report-name-standard";
export type { InspectionReportNameParameter } from "./inspection-report-name-parameter";

export { INSPECTION_STANDARD_ROLES } from "./inspection-standard-role";
export { INSPECTION_QUALIFICATION_LEVELS } from "./inspection-qualification-level";
export { INSPECTION_READINESS_STATUSES } from "./inspection-readiness-status";
