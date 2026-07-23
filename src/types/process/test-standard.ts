/** 检测标准码表（M04.F03 已废弃；读路径保留） */
export type StandardType = 'national' | 'industry' | 'local' | 'enterprise';

export interface TestStandard {
  id: string;
  code: string;
  name: string;
  type: StandardType;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}