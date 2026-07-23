/**
 * M02 资源管理领域类型 barrel
 *
 * 一类一文件（CLAUDE.md 硬约束）；本文件只做具名 re-export。
 */

// ---- Contract（合同/委托） ----
export type { Contract, ContractStatus } from './contract';
export type { ContractCategory } from './contract-category';

// ---- Project（项目） ----
export type { Project, ProjectStatus, ProjectQuery, ProjectCreateInput, ProjectUpdateInput } from './project';