/**
 * 报告名称（InspectionReportName）— M06.F07
 *
 * 取代原 M04.F02 报告模板。报告名称是检测能力下的中转实体：
 * 按 code + name 标识，挂载四类多对多关联（检测项目 / 检测标准-检测依据 /
 * 检测标准-判定依据 / 检测参数）。报告 HTML 渲染路径不在本类型范围。
 */

export interface InspectionReportName {
  id: string;
  /** 稳定编码。 */
  code: string;
  /** 报告简称（主显示名），用于列表与下拉。 */
  name: string;
  /** 报告全称（正式全名），如"钢筋力学性能检测报告"。 */
  fullName?: string;
  /** 模板路径，静态 HTML 资源路径（非 inline HTML）。 */
  templatePath?: string;
  /** 描述，可选。 */
  description?: string;
  /** 列表展示排序。 */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}