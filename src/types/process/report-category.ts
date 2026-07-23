/** 报告类别（M04.F01 已废弃；读路径保留供接样单历史数据） */

/** 报告类别扩展属性定义：新建样品时按类别动态渲染扩展属性输入项 */
export interface ExtFieldDef {
  key: string;
  label: string;
}

/** 汇总表口径：material=原材料汇总 / concrete=混凝土抗压汇总 / connection=连接接头汇总 */
export type SummaryType = 'material' | 'concrete' | 'connection';

export interface ReportCategory {
  id: string;
  code: string;
  name: string;
  /** 报告文档大标题，如「钢筋力学性能、工艺性能、重量偏差检测报告」 */
  reportTitle: string;
  summaryType: SummaryType;
  /** 汇总表名称，如「钢材试验报告汇总表」 */
  summaryName: string;
  /** 样品扩展属性定义（可维护） */
  extFields: ExtFieldDef[];
  /** 排序号（越小越靠前），用户可维护 */
  sortOrder: number;
  remark?: string;
  createdAt: string;
  updatedAt: string;
}