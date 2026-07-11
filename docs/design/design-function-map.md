# 设计与功能对齐 — lab-management-system

> 人填、人评审。机器只检查功能 ID 存在性。
> 回答一个问题：**这个功能子项，落到哪段代码、哪个接口、哪张表？**
> 答不上来的行，说明设计没做完，别开工。

## 映射表

| 功能子项 ID | 名称 | 页面/组件 | 接口 | 数据表 | 状态 |
|---|---|---|---|---|---|
| M01.F01.I01 | 机构信息维护 | OrgInfoForm.tsx | GET/PUT /organization | org_info | 已上线 |
| M01.F02.I01 | 角色列表 | RoleList.tsx | GET /roles | roles | 已上线 |
| M01.F02.I02 | 角色新建/编辑 | RoleFormModal.tsx | POST/PUT /roles | roles | 已上线 |
| M01.F02.I03 | 角色删除 | RoleList.tsx | DELETE /roles/:id | roles | 已上线 |
| M01.F03.I01 | 用户列表 | UserList.tsx | GET /users | users | 已上线 |
| M01.F03.I02 | 用户新建/编辑 | UserFormModal.tsx | POST/PUT /users | users | 已上线 |
| M01.F03.I03 | 用户删除 | UserList.tsx | DELETE /users/:id | users | 已上线 |
| M01.F03.I04 | 密码修改 | UserFormModal.tsx | PUT /users/:id/password | users | 已上线 |
| M01.F04.I01 | RBAC 角色权限 | hasPermission.tsx, usePermission.ts | - | - | 已上线 |
| M01.F04.I02 | 路由守卫 | ProtectedRoute.tsx | - | - | 已上线 |
| M01.F04.I03 | 权限指令 | hasPermission.tsx | - | - | 已上线 |
| M01.F05.I01 | JWT 登录 | Login.tsx | POST /auth/login | - | 已上线 |
| M01.F05.I02 | Token 校验 | client.ts (axios interceptor) | - | - | 已上线 |
| M02.F01.I01 | 合同列表 | ContractList.tsx | GET /contracts | contracts | 已上线 |
| M02.F01.I02 | 合同新建/编辑 | ContractFormModal.tsx | POST/PUT /contracts | contracts | 已上线 |
| M02.F01.I03 | 合同删除 | ContractList.tsx | DELETE /contracts/:id | contracts | 已上线 |
| M02.F01.I04 | 合同汇总 | ContractSummary.tsx | GET /contracts/:id/summary | contracts | 已上线 |
| M02.F02.I01 | 工程列表 | ProjectList.tsx | GET /projects | projects | 已上线 |
| M02.F02.I02 | 工程新建/编辑 | ProjectFormModal.tsx | POST/PUT /projects | projects | 已上线 |
| M02.F02.I03 | 工程删除 | ProjectList.tsx | DELETE /projects/:id | projects | 已上线 |
| M02.F03.I01 | 设备列表 | - | - | - | 规划 |
| M02.F03.I02 | 设备新建/编辑 | - | - | - | 规划 |
| M02.F03.I03 | 设备删除 | - | - | - | 规划 |
| M02.F04.I01 | 设施列表 | - | - | - | 规划 |
| M02.F04.I02 | 设施新建/编辑 | - | - | - | 规划 |
| M02.F04.I03 | 设施删除 | - | - | - | 规划 |
| M03.F01.I01 | 接样单列表 | ReceiptList.tsx | GET /receipts | receipts | 已上线 |
| M03.F01.I02 | 接样单新建 | ReceiptFormModal.tsx | POST /receipts | receipts | 已上线 |
| M03.F01.I03 | 接样单编辑 | ReceiptFormModal.tsx | PUT /receipts/:id | receipts | 已上线 |
| M03.F01.I04 | 接样单删除 | ReceiptList.tsx | DELETE /receipts/:id | receipts | 已上线 |
| M03.F01.I05 | 接样单详情 | ReceiptDetail.tsx | GET /receipts/:id | receipts | 已上线 |
| M03.F02.I01 | 任务分配 | TaskAssignmentPage.tsx | GET /tasks | tasks | 已上线 |
| M03.F02.I02 | 任务编辑 | TaskAssignmentPage.tsx | PUT /tasks/:id | tasks | 已上线 |
| M03.F03.I01 | 检测项列表 | DataEntryPage.tsx | GET /samples | samples | 已上线 |
| M03.F03.I02 | 检测项新建 | DataEntryPage.tsx | POST /test-items | test_items | 已上线 |
| M03.F03.I03 | 检测项编辑 | DataEntryPage.tsx | PUT /test-items/:id | test_items | 已上线 |
| M03.F03.I04 | 检测项删除 | DataEntryPage.tsx | DELETE /test-items/:id | test_items | 已上线 |
| M03.F03.I05 | 自动评定 | evaluateTestResult | - | - | 已上线 |
| M03.F03.I06 | 人工改判 | DataEntryPage.tsx | PUT /test-items/:id | test_items | 已上线 |
| M03.F04.I01 | 报告列表 | ReportList.tsx, ReportWorkflowList.tsx | GET /reports | reports | 已上线 |
| M03.F04.I02 | 报告新建/编辑 | ReportFormModal.tsx, ReportWorkflowFormModal.tsx | POST/PUT /reports | reports | 已上线 |
| M03.F04.I03 | 报告预览 | ReportPreviewModal.tsx | - | - | 已上线 |
| M03.F04.I04 | Word 下载 | ReportPreviewModal.tsx | GET /reports/:id/docx | - | 已上线 |
| M03.F05.I01 | 报告审核页面 | ReportReviewPage.tsx | GET /reports?status=reviewing | reports | 已上线 |
| M03.F05.I02 | 报告查看 | ReportReviewPage.tsx | GET /reports/:id | reports | 已上线 |
| M03.F05.I03 | 审核操作 | ReportReviewPage.tsx | POST /reports/:id/review | reports | 已上线 |
| M03.F06.I01 | 报告批准页面 | ReportApprovePage.tsx | GET /reports?status=approved | reports | 已上线 |
| M03.F06.I02 | 报告查看 | ReportApprovePage.tsx | GET /reports/:id | reports | 已上线 |
| M03.F06.I03 | 批准操作 | ReportApprovePage.tsx | POST /reports/:id/approve | reports | 已上线 |
| M03.F07.I01 | 报告发放页面 | ReportIssuePage.tsx | GET /reports?status=issued | reports | 已上线 |
| M03.F07.I02 | 报告查看 | ReportIssuePage.tsx | GET /reports/:id | reports | 已上线 |
| M03.F07.I03 | 发放操作 | ReportIssuePage.tsx | POST /reports/:id/issue | reports | 已上线 |
| M03.F08.I01 | 报告归档页面 | ReportArchivePage.tsx | GET /reports?status=archived | reports | 已上线 |
| M03.F08.I02 | 报告查看 | ReportArchivePage.tsx | GET /reports/:id | reports | 已上线 |
| M03.F08.I03 | 归档操作 | ReportArchivePage.tsx | POST /reports/:id/archive | reports | 已上线 |
| M04.F01.I01 | 报告类别列表 | ReportCategoryList.tsx | GET /categories | categories | 已上线 |
| M04.F01.I02 | 报告类别新建/编辑 | ReportCategoryList.tsx | POST/PUT /categories | categories | 已上线 |
| M04.F01.I03 | 报告类别删除 | ReportCategoryList.tsx | DELETE /categories/:id | categories | 已上线 |
| M04.F01.I04 | 类别标准关联 | CategoryStandardList.tsx | GET/PUT /categories/:id/standards | category_standards | 已上线 |
| M04.F02.I01 | 模板列表 | ReportTemplateList.tsx | GET /report-templates | report_templates | 已上线 |
| M04.F02.I02 | 模板新建/编辑 | ReportTemplateList.tsx | POST/PUT /report-templates | report_templates | 已上线 |
| M04.F02.I03 | 模板删除 | ReportTemplateList.tsx | DELETE /report-templates/:id | report_templates | 已上线 |
| M04.F03.I01 | 检测标准列表 | TestStandardList.tsx | GET /test-standards | test_standards | 已上线 |
| M04.F03.I02 | 检测标准新建/编辑 | TestStandardList.tsx | POST/PUT /test-standards | test_standards | 已上线 |
| M04.F03.I03 | 检测标准删除 | TestStandardList.tsx | DELETE /test-standards/:id | test_standards | 已上线 |
| M04.F03.I04 | 标准参数关联 | TestStandardList.tsx | GET/PUT /test-standards/:id/parameters | standard_parameters | 已上线 |
| M04.F04.I01 | 检测参数列表 | TestParameterList.tsx | GET /test-parameters | test_parameters | 已上线 |
| M04.F04.I02 | 检测参数新建/编辑 | TestParameterList.tsx | POST/PUT /test-parameters | test_parameters | 已上线 |
| M04.F04.I03 | 检测参数删除 | TestParameterList.tsx | DELETE /test-parameters/:id | test_parameters | 已上线 |
| M04.F05.I01 | 技术要求列表 | TechnicalRequirementList.tsx | GET /technical-requirements | technical_requirements | 已上线 |
| M04.F05.I02 | 技术要求新建/编辑 | TechnicalRequirementFormModal.tsx | POST/PUT /technical-requirements | technical_requirements | 已上线 |
| M04.F05.I03 | 技术要求删除 | TechnicalRequirementList.tsx | DELETE /technical-requirements/:id | technical_requirements | 已上线 |
| M04.F06.I01 | 型号列表 | CategoryDictList.tsx | GET /models | models | 已上线 |
| M04.F06.I02 | 型号新建/编辑 | CategoryDictList.tsx | POST/PUT /models | models | 已上线 |
| M04.F06.I03 | 型号删除 | CategoryDictList.tsx | DELETE /models/:id | models | 已上线 |
| M04.F07.I01 | 规格列表 | CategoryDictList.tsx | GET /specifications | specifications | 已上线 |
| M04.F07.I02 | 规格新建/编辑 | CategoryDictList.tsx | POST/PUT /specifications | specifications | 已上线 |
| M04.F07.I03 | 规格删除 | CategoryDictList.tsx | DELETE /specifications/:id | specifications | 已上线 |
| M04.F08.I01 | 等级列表 | CategoryDictList.tsx | GET /grades | grades | 已上线 |
| M04.F08.I02 | 等级新建/编辑 | CategoryDictList.tsx | POST/PUT /grades | grades | 已上线 |
| M04.F08.I03 | 等级删除 | CategoryDictList.tsx | DELETE /grades/:id | grades | 已上线 |
| M04.F09.I01 | 牌号列表 | CategoryDictList.tsx | GET /brands | brands | 已上线 |
| M04.F09.I02 | 牌号新建/编辑 | CategoryDictList.tsx | POST/PUT /brands | brands | 已上线 |
| M04.F09.I03 | 牌号删除 | CategoryDictList.tsx | DELETE /brands/:id | brands | 已上线 |
| M05.F01.I01 | 汇总表 | SummaryPage.tsx | GET /summary | - | 已上线 |
| M05.F01.I02 | 汇总类型 | SummaryPage.tsx | - | - | 已上线 |

## 约定

1. 一个接口服务多个子项时，多行重复写。不要为表好看而合并。
2. 状态列必须与功能清单一致。不一致以功能清单为准。

## 评审时问这三个问题

1. 有没有子项没有页面/组件？→ 那它就是没有界面的功能
2. 有没有一张表被三个以上模块直接写入？→ 边界破了
3. 「规划」的行里接口和表填了吗？→ 没填就是还在纸上，别报进度
