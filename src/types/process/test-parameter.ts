/** 检测参数码表（M04.F04 已废弃；读路径保留供数据录入历史数据） */
export interface TestParameter {
  id: string;
  code: string;
  name: string;
  /** 归属报告类别 */
  categoryCode: string;
  group?: string;
  unit?: string;
  /** 该参数需要录入的样本数量（如混凝土抗压强度=3，钢筋拉伸=2），默认为1 */
  valueCount?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}