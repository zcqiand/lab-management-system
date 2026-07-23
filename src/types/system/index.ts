/**
 * M01 系统管理领域类型 barrel
 *
 * 一类一文件（CLAUDE.md 硬约束）；本文件只做具名 re-export。
 */

export type { Permission, Role } from './permission';
export type {
  User,
  UserRecord,
  UserQuery,
  UserCreateInput,
  UserUpdateInput,
  ChangePasswordInput,
} from './user';
export type {
  RoleRecord,
  RoleQuery,
  RoleCreateInput,
  RoleUpdateInput,
} from './role';
export type { OrgInfo } from './org-info';