/** 项目（基建/甲方/检测委托，M02 占位） */
export interface Project {
  id: string;
  code: string;
  name: string;
  ownerId: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}
export type ProjectStatus = string;
export interface ProjectQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  name?: string;
  status?: ProjectStatus;
  ownerId?: string;
  code?: string;
  dateFrom?: string;
  dateTo?: string;
}
export interface ProjectCreateInput {
  code: string;
  name: string;
  ownerId: string;
  status?: ProjectStatus;
}
export interface ProjectUpdateInput {
  code?: string;
  name?: string;
  ownerId?: string;
  status?: ProjectStatus;
}