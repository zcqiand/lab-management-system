/**
 * M02 资源管理领域类型 barrel
 *
 * 一类一文件（CLAUDE.md 硬约束）；本文件只做具名 re-export。
 */

// ---- Contract（合同/委托） ----
export type { Contract, ContractStatus } from './contract';

// 注：合同类别已并入「检测专项」（InspectionSpecialty），无需独立 ContractCategory 类型。
// 注：Project 暂无使用，从 resources/ 中移除。