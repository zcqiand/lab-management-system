import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import Layout from './layouts/Layout'
import { ProtectedRoute } from './guards/ProtectedRoute'
import { Login } from '../features/auth/Login'
import Dashboard from '../pages/Dashboard'
import Contracts from '../pages/Contracts'
import Receipts from '../pages/Receipts'
import Forbidden from '../pages/Forbidden'
import Users from '../pages/Users'
import Roles from '../pages/Roles'
import OrgInfo from '../pages/OrgInfo'
import { TestParameterList } from '../features/codes/TestParameterList'
import { TestStandardList } from '../features/codes/TestStandardList'
import { TechnicalRequirementList } from '../features/codes/TechnicalRequirementList'
import { CalculationRuleList } from '../features/codes/CalculationRuleList'
import { ReportCategoryList } from '../features/categories/ReportCategoryList'
import { ContractCategoryList } from '../features/contracts/ContractCategoryList'
import { CategoryDictList } from '../features/dicts/CategoryDictList'
import { ReportTemplateList } from '../features/templates/ReportTemplateList'
import { TaskAssignmentPage } from '../features/task-assignment/TaskAssignmentPage'
import { ReportReviewPage } from '../features/reports/ReportReviewPage'
import { ReportApprovePage } from '../features/reports/ReportApprovePage'
import { ReportArchivePage } from '../features/reports/ReportArchivePage'
import { ReportIssuePage } from '../features/reports/ReportIssuePage'
import { DataEntryPage } from '../features/data-entry/DataEntryPage'
import { ReceiptDetailPage } from '../features/receipts/ReceiptDetailPage'
import { SummaryPage } from '../features/summary/SummaryPage'

// v3: single flow pipeline — receiving → task-assignment → data-entry → review → approve → issue → archive
export const routes: RouteObject[] = [
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: (
      <div data-fn="M01.F04.I02"><ProtectedRoute>
        <Layout />
      </ProtectedRoute></div>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <Dashboard /> },
      // ----- 业务管理（流程线）-----
      { path: 'contracts', element: <Contracts /> },
      { path: 'receipts', element: <Receipts /> },
      { path: 'receipt/:id', element: <ReceiptDetailPage /> },
      { path: 'task-assignment', element: <TaskAssignmentPage /> },
      { path: 'data-entry', element: <DataEntryPage /> },
      { path: 'report-review', element: <ReportReviewPage /> },
      { path: 'report-approve', element: <ReportApprovePage /> },
      { path: 'report-issue', element: <ReportIssuePage /> },
      { path: 'report-archive', element: <ReportArchivePage /> },
      { path: 'summary', element: <SummaryPage /> },
      // ----- 基础管理 -----
      { path: 'org-info', element: <OrgInfo /> },
      { path: 'report-categories', element: <ReportCategoryList /> },
      { path: 'contract-categories', element: <ContractCategoryList /> },
      { path: 'test-parameters', element: <TestParameterList /> },
      { path: 'test-standards', element: <TestStandardList /> },
      { path: 'technical-requirements', element: <TechnicalRequirementList /> },
      // @entry M04.F06.I01
      { path: 'models', element: <CategoryDictList key="models" endpoint="models" title="型号管理" hint="指品种/型号：热轧带肋 / P·O 42.5 / C30 / 中砂 / 直螺纹套筒 / 闪光对焊" data-fn="M04.F06.I01" /> },
      // @entry M04.F07.I01
      { path: 'specifications', element: <CategoryDictList key="specifications" endpoint="specifications" title="规格管理" hint="指尺寸/粒径/直径：Φ22 / 150×150×150mm / 5-25mm；无尺寸的类别留空" data-fn="M04.F07.I01" /> },
      // @entry M04.F08.I01
      { path: 'grades', element: <CategoryDictList key="grades" endpoint="grades" title="等级管理" hint="指机械连接接头等级Ⅰ/Ⅱ/Ⅲ级、砂石用途类别Ⅰ/Ⅱ/Ⅲ类；型号已含等级的钢材/水泥/混凝土留空" data-fn="M04.F08.I01" /> },
      // @entry M04.F09.I01
      { path: 'brands', element: <CategoryDictList key="brands" endpoint="brands" title="牌号管理" hint="指钢筋牌号：HRB400 等" data-fn="M04.F09.I01" /> },
      { path: 'report-templates', element: <ReportTemplateList /> },
      { path: 'calculation-rules', element: <CalculationRuleList /> },
      {
        path: 'settings',
        children: [
          { index: true, element: <Navigate to="/settings/users" replace /> },
          { path: 'users', element: <Users /> },
          { path: 'roles', element: <Roles /> },
        ],
      },
    ],
  },
  { path: '/forbidden', element: <Forbidden /> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]

// lazy browserRouter factory: avoids module-level createBrowserRouter call
// which causes side-effects (Navigate triggers undici AbortSignal compat issues in jsdom).
// Tests use createMemoryRouter(routes) directly — no dependency on this instance.
let _router: ReturnType<typeof createBrowserRouter> | null = null
export function getRouter(): ReturnType<typeof createBrowserRouter> {
  if (!_router) {
    _router = createBrowserRouter(routes)
  }
  return _router
}
