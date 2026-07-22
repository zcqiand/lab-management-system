/**
 * 检测标准 ↔ 检测参数 多对多关系（InspectionStandardParameter）— M06.F04.I04
 *
 * 保存该标准中该参数的条款、方法、单位和试验规则，
 * 不得将“项目上下文”字段（项目、条件）放在这里。
 */

export interface InspectionStandardParameter {
  id: string;
  inspectionStandardCode: string;
  inspectionParameterCode: string;
  /** 标准条款号或章节。 */
  clause?: string;
  /** 试验方法名。 */
  methodName?: string;
  /** 参数单位。 */
  unit?: string;
  /** 取样与试件规则。 */
  sampleRule?: string;
  /** 修约规则文本。 */
  roundingRule?: string;
  createdAt: string;
  updatedAt: string;
}
