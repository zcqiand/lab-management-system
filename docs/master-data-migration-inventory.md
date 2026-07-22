# 基础数据与标准来源盘点（阶段 0/1）

日期：2026-07-22  
项目：`lab-management-system`  
分支：`feat/lab-master-data-catalog`  
基线提交：`ca534c8b2040c67ac308c6b5baced818f8aaf6de`

## 已确认的 M06 检测能力模型

```text
M06 检测能力
├─ 检测专项       InspectionSpecialty
├─ 检测项目       InspectionObject
├─ 检测参数       InspectionParameter
├─ 检测标准       InspectionStandard
├─ 计算规则       CalculationRule
└─ 技术要求       TechnicalRequirement
```

关系：

- InspectionObjectParameter：检测项目 ↔ 检测参数；
- InspectionObjectStandard：检测项目 ↔ 检测标准，角色 TESTING/JUDGMENT；
- InspectionStandardParameter：检测标准 ↔ 检测参数；
- CalculationRule：项目+参数，可选检测依据标准，用于计算检测结果；
- TechnicalRequirement：项目+参数+判定依据标准+条件，用于单项评定。

不存在 InspectionProject、projectId、InspectionObjectVariant 或 InspectionScheme。中文界面统一使用“检测项目”，代码实体使用 InspectionObject。

## 官方能力表基线

来源：[附件2 检测专项及检测能力表](https://ciac.zjw.sh.gov.cn/JGBQyzzInterWeb/pc/qyzz/%E9%99%84%E4%BB%B62%E6%A3%80%E6%B5%8B%E4%B8%93%E9%A1%B9%E5%8F%8A%E6%A3%80%E6%B5%8B%E8%83%BD%E5%8A%9B%E8%A1%A8.pdf)

| 项目 | 数量/结论 |
| --- | ---: |
| 检测专项 | 9 |
| 官方来源项目行 | 93 |
| 资质必选来源行（无 `*`） | 55 |
| 资质可选来源行（带 `*`） | 38 |
| 官方表页数 | 13 |
| 单位/限值/标准条款是否在附件2提供 | 否 |
| 最终 InspectionObject 数量 | 按明确对象分组拆分后由脚本计算，可能大于 93 |

专项来源行数：建筑材料及构配件 23、主体结构及装饰装修 9、钢结构 7、地基基础 5、建筑节能 13、建筑幕墙 3、市政工程材料 19、道路工程 5、桥梁及地下工程 9。

## 拆分原则

1. 无明确分组的来源行至少生成一个 InspectionObject；
2. 参数单元格明确标注对象分组时，每个分组生成独立 InspectionObject；
3. 拆分对象保留 `sourceProjectNo/sourceProjectName/sourcePage`；
4. 对象参数进入 InspectionObjectParameter，不在参数上保存 objectId；
5. 93 是来源行覆盖基线，不是最终对象数断言。

## 当前应用基线与迁移边界

- 旧检测能力相关功能散落在 M04：报告类别、标准、参数、技术要求、合同类别、计算规则；
- 当前接样、模板、字典和汇总依赖 `categoryCode`；
- M06 第一阶段独立建设，不修改 M04 运行流；
- 后续合同类别迁到 M06.F01 InspectionSpecialty；报告类别迁到 M06.F02 InspectionObject；
- M06 全链路完成后，旧 M04 对应功能走 tree-change 废弃。

## 本机标准语料盘点

| 项目 | 数量 |
| --- | ---: |
| 唯一标准文件 stem | 61 |
| 同时存在 PDF + DOCX | 59 |
| 只有 PDF | 2（JTT828-2019、TCECS1200-2022） |
| PDF 文件 | 61 |
| DOCX 文件 | 59 |
| 条款级人工核验 | 未完成，全部 candidate/draft |
| 是否足以覆盖全部检测项目 | 未证明；初步主要覆盖建筑材料及构配件 |

## 当前阻断点

- 新增 M06 的 tree-change 尚未由人批准；
- 未批准前不能创建 types 或业务代码；
- 标准来源仅完成盘点，尚未完成条款、单位和限值核验；
- 未修改 function-tree、src 或 msw。
