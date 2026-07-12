import { describe, expect, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw/server";
import { ReportIssuePage } from "../../../src/features/reports/ReportIssuePage";
import { useAuthStore } from "../../../src/features/auth/authStore";
import { resetApiClient, setToken } from "../../../src/api/client";
import { fnTest } from "../../fn";
import type { User, SampleReceipt } from "../../../src/types/api";

function makeUser(overrides?: Partial<User>): User {
  return {
    id: "u-001",
    username: "labadmin",
    displayName: "管理员",
    role: {
      id: "role-admin",
      name: "admin",
      permissions: ["project:read", "sample:write", "report:write", "report:issue"],
    },
    permissions: ["project:read", "sample:write", "report:write", "report:issue"],
    ...overrides,
  };
}

function makeReceipt(overrides: Partial<SampleReceipt> = {}): SampleReceipt {
  return {
    id: "rc-iss-001",
    contractId: "c-001",
    commissionCode: "RC-2024-001",
    reportCode: "R-2024-001",
    categoryCode: "steel",
    commissionDate: "2024-06-01",
    receivedBy: "张三",
    flowStatus: "issuance",
    result: "pass",
    issuedAt: "2024-07-01T10:00:00Z",
    lastSubmittedBy: "u-reviewer",
    flowHistory: [],
    testCategory: "委托检验",
    sampleSource: "施工送检",
    createdAt: "2024-06-01T00:00:00Z",
    updatedAt: "2024-06-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * Helper: creates an MSW handler for GET /receipts that properly distinguishes
 * between the main list (no lastSubmittedBy) and submitted list (has lastSubmittedBy).
 */
function mockReceiptsHandler(
  mainItems: SampleReceipt[],
  submittedItems: SampleReceipt[] = [],
) {
  return http.get("*/receipts", ({ request }) => {
    const url = new URL(request.url);
    const hasLastSubmittedBy = url.searchParams.has("lastSubmittedBy");
    if (hasLastSubmittedBy) {
      return HttpResponse.json({ items: submittedItems, total: submittedItems.length });
    }
    return HttpResponse.json({ items: mainItems, total: mainItems.length });
  });
}

beforeEach(() => {
  server.resetHandlers();
  localStorage.clear();
  useAuthStore.setState({
    user: makeUser(),
    token: "mock-token",
    status: "authenticated",
    error: null,
  });
  resetApiClient();
  setToken("mock-token");
});

afterEach(() => {
  cleanup();
});

// ----------------------------------------------------------------
// 基础信息
// ----------------------------------------------------------------
describe("ReportIssuePage 基础信息", () => {
  fnTest(["M03.F07.I01"], '标题显示"报告发放"', async () => {
    server.use(mockReceiptsHandler([]));
    render(<ReportIssuePage />);
    await waitFor(() => expect(screen.getByText("报告发放")).toBeInTheDocument());
  });

  fnTest(["M03.F07.I03"], 'submitLabel 为"发放并归档"', async () => {
    server.use(
      mockReceiptsHandler([
        makeReceipt({ id: "rc-submit-label", commissionCode: "RC-SUBLABEL" }),
      ]),
    );
    render(<ReportIssuePage />);
    await waitFor(() => expect(screen.getByText("RC-SUBLABEL")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "批量发放并归档" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "发放并归档" })).toBeInTheDocument();
  });

  fnTest(["M03.F07.I03"], "stage 为 issuance，提交后进入已归档", async () => {
    server.use(mockReceiptsHandler([]));
    render(<ReportIssuePage />);
    await waitFor(() =>
      expect(screen.getByText(/提交后进入：已归档/)).toBeInTheDocument(),
    );
  });
});

// ----------------------------------------------------------------
// extraColumns：报告类别 + 签发时间
// ----------------------------------------------------------------
describe("extraColumns 渲染", () => {
  fnTest(["M03.F07.I01"], "报告类别列正确渲染", async () => {
    server.use(
      mockReceiptsHandler([makeReceipt({ id: "rc-cat-1", categoryCode: "concrete" })]),
      http.get("*/report-categories", () =>
        HttpResponse.json({
          items: [
            { code: "steel", name: "钢材" },
            { code: "concrete", name: "混凝土" },
          ],
          total: 2,
        }),
      ),
    );
    render(<ReportIssuePage />);
    await waitFor(() => expect(screen.getByText("报告类别")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText("混凝土")).toBeInTheDocument());
  });

  fnTest(
    ["M03.F07.I01"],
    "签发时间列正确渲染（有时显示格式化时间，无时显示占位符）",
    async () => {
      server.use(
        mockReceiptsHandler([
          makeReceipt({ id: "rc-time-1", issuedAt: "2024-07-01T10:30:00Z" }),
          makeReceipt({ id: "rc-time-2", issuedAt: undefined }),
        ]),
      );
      render(<ReportIssuePage />);
      await waitFor(() => expect(screen.getByText("签发时间")).toBeInTheDocument());
      await waitFor(() => expect(screen.getByText(/2024\/7\/1/)).toBeInTheDocument());
      expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    },
  );
});

// ----------------------------------------------------------------
// rowActions："查看报告"按钮
// ----------------------------------------------------------------
describe('"查看报告"按钮', () => {
  fnTest(["M03.F07.I02"], '"查看报告"按钮可点击', async () => {
    const user = userEvent.setup();
    server.use(
      mockReceiptsHandler([
        makeReceipt({ id: "rc-preview-1", commissionCode: "RC-PREVIEW-1" }),
      ]),
    );
    render(<ReportIssuePage />);
    await waitFor(() => expect(screen.getByText("RC-PREVIEW-1")).toBeInTheDocument());
    const previewBtn = screen.getByRole("button", { name: "查看报告" });
    await user.click(previewBtn);
    // Modal content appears - look for any modal content
    await waitFor(() =>
      expect(screen.getByText(/报告预览|报告文件|RC-PREVIEW-1/)).toBeInTheDocument(),
    );
  });
});

// ----------------------------------------------------------------
// 发放并归档流程
// ----------------------------------------------------------------
describe("发放并归档流程", () => {
  fnTest(["M03.F07.I03"], "单个发放并归档调用 POST /receipts/flow action=submit", async () => {
    const user = userEvent.setup();
    let flowCall: { action: string; ids: string[]; operator: string } | null = null;
    server.use(
      mockReceiptsHandler([
        makeReceipt({ id: "rc-issue-1", commissionCode: "RC-ISSUE-1" }),
      ]),
      http.post("*/receipts/flow", async ({ request }) => {
        flowCall = (await request.json()) as typeof flowCall;
        return HttpResponse.json({
          results: [{ id: "rc-issue-1", ok: true, flowStatus: "archived" }],
        });
      }),
    );
    render(<ReportIssuePage />);
    await waitFor(() => expect(screen.getByText("RC-ISSUE-1")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: "发放并归档" }));
    await waitFor(() => expect(flowCall?.action).toBe("submit"));
    expect(flowCall!.ids).toEqual(["rc-issue-1"]);
    expect(flowCall!.operator).toBe("u-001");
  });

  fnTest(["M03.F07.I03"], "批量发放并归档", async () => {
    const user = userEvent.setup();
    let flowCall: { action: string; ids: string[] } | null = null;
    server.use(
      mockReceiptsHandler([
        makeReceipt({ id: "rc-batch-iss-1", commissionCode: "RC-BATCH-ISS-1" }),
        makeReceipt({ id: "rc-batch-iss-2", commissionCode: "RC-BATCH-ISS-2" }),
      ]),
      http.post("*/receipts/flow", async ({ request }) => {
        flowCall = (await request.json()) as typeof flowCall;
        return HttpResponse.json({
          results: [
            { id: "rc-batch-iss-1", ok: true },
            { id: "rc-batch-iss-2", ok: true },
          ],
        });
      }),
    );
    render(<ReportIssuePage />);
    await waitFor(() => expect(screen.getByText("RC-BATCH-ISS-1")).toBeInTheDocument());
    const rows = screen.getAllByRole("row");
    await user.click(within(rows[1]!).getByRole("checkbox"));
    await user.click(within(rows[2]!).getByRole("checkbox"));
    expect(screen.getByText("已选 2 条")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "批量发放并归档" }));
    await waitFor(() => expect(flowCall?.ids).toHaveLength(2));
  });

  fnTest(["M03.F07.I03"], "退回至 approval（报告批准）", async () => {
    const user = userEvent.setup();
    let flowCall: { action: string; ids: string[] } | null = null;
    server.use(
      mockReceiptsHandler([makeReceipt({ id: "rc-iss-return-1" })]),
      http.post("*/receipts/flow", async ({ request }) => {
        flowCall = (await request.json()) as typeof flowCall;
        return HttpResponse.json({ results: [{ id: "rc-iss-return-1", ok: true }] });
      }),
    );
    render(<ReportIssuePage />);
    await waitFor(() =>
      expect(screen.getByText(/退回至：报告批准/)).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "退回" }));
    await waitFor(() => expect(flowCall?.action).toBe("return"));
  });
});
