/**
 * M03 试验过程管理领域类型 barrel
 *
 * 一类一文件（CLAUDE.md 硬约束）；本文件只做具名 re-export。
 */

export type {
  FlowStage,
  FlowAction,
  FlowHistoryEntry,
  FlowActionResult,
} from './flow';
export { FLOW_STAGE_ORDER, FLOW_STAGE_LABELS } from './flow';
export type { SampleReceipt } from './sample-receipt';
export type {
  Sample,
  SampleCreateInput,
  SampleUpdateInput,
  SampleStatus,
  SampleQuery,
} from './sample';
export type { TestItem } from './test-item';
export type {
} from './task';
export type {
} from './report';
export type { TestParameter } from './test-parameter';
export type { TestStandard, StandardType } from './test-standard';
export type { TechnicalRequirement, ComparisonOp } from './technical-requirement';
// 注：原 CategoryDictItem 已删除——型号/规格/等级/牌号各自有独立类型（InspectionBrand/Model/Grade/Spec）。
export type {
  DashboardStats,
  SummaryColumn,
  SummaryData,
  SteelSummaryRow,
  MaterialType,
} from './summary';