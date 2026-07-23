/** 任务管理（M03.F02） */
export interface TaskRecord {
  id: string;
  receiptId: string;
  assigneeId: string;
  assigneeName?: string;
  plannedTestDate?: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}
export type TaskStatus = string;
export interface TaskQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  status?: TaskStatus;
  sampleId?: string;
  assigneeId?: string;
}
export interface TaskCreateInput {
  receiptId: string;
  assigneeId: string;
  plannedTestDate?: string;
}
export interface TaskUpdateInput {
  assigneeId?: string;
  plannedTestDate?: string;
  status?: TaskStatus;
}