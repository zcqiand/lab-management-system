/** 型号/规格/等级/牌号 码表条目（均归属检测项目，REQ-2026-005） */
export interface CategoryDictItem {
  id: string;
  inspectionObjectCode: string;
  name: string;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}