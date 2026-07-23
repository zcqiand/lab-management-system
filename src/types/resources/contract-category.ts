/** 合同类别码表（M02 已废弃，保留读路径供历史数据） */
export interface ContractCategory {
  id: string;
  name: string;
  sortOrder?: number;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}