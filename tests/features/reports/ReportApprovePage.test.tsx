import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { ReportApprovePage } from "../../../src/features/reports/ReportApprovePage";
import { useAuthStore } from "../../../src/features/auth/authStore";
import { fnTest } from "../../fn";
import type { User } from "../../../src/types/api";
import { resetApiClient, setToken } from "../../../src/api/client";

function makeUser(perms: string[]): User {
  return {
    id: "u-001",
    username: "admin",
    displayName: "管理员",
    role: { id: "role-admin", name: "admin", permissions: perms },
    permissions: perms,
  };
}

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter initialEntries={["/"]}>{ui}</MemoryRouter>);
}

beforeEach(() => {
  cleanup();
  localStorage.clear();
  useAuthStore.setState({ user: null, token: null, status: "idle", error: null });
  resetApiClient();
  setToken("mock-token");
});

describe("ReportApprovePage", () => {
  fnTest(["M03.F06.I01"], "渲染页面标题和流程信息", async () => {
    renderWithRouter(<ReportApprovePage />);
    await waitFor(() => expect(screen.getByText("报告批准")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/当前环节.*批准中/)).toBeInTheDocument());
  });

  fnTest(["M03.F06.I03"], "显示批准后进入报告发放的提示", async () => {
    renderWithRouter(<ReportApprovePage />);
    await waitFor(() =>
      expect(screen.getByText(/批准后自动签发并进入报告发放/)).toBeInTheDocument(),
    );
  });

  fnTest(["M03.F06.I03"], "显示提交后进入报告发放的提示", async () => {
    renderWithRouter(<ReportApprovePage />);
    await waitFor(() =>
      expect(screen.getByText(/提交后进入.*报告发放/)).toBeInTheDocument(),
    );
  });

  fnTest(["M03.F06.I03"], "显示退回至报告审核的提示", async () => {
    renderWithRouter(<ReportApprovePage />);
    await waitFor(() => expect(screen.getByText(/退回至.*审核中/)).toBeInTheDocument());
  });

  fnTest(["M03.F06.I03"], "显示批量批准按钮", async () => {
    renderWithRouter(<ReportApprovePage />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /批量批准/ })).toBeInTheDocument(),
    );
  });

  fnTest(["M03.F06.I03"], "显示批量退回按钮", async () => {
    renderWithRouter(<ReportApprovePage />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /批量退回/ })).toBeInTheDocument(),
    );
  });

  fnTest(["M03.F06.I01"], "显示搜索框", async () => {
    renderWithRouter(<ReportApprovePage />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/搜索委托书编号/)).toBeInTheDocument(),
    );
  });

  fnTest(["M03.F06.I01"], "报告类别列正确渲染", async () => {
    renderWithRouter(<ReportApprovePage />);
    const categoryHeader = screen.queryByText("报告类别");
    expect(categoryHeader).toBeInTheDocument();
  });

  fnTest(["M03.F06.I01"], "结论列正确渲染", async () => {
    renderWithRouter(<ReportApprovePage />);
    const conclusionHeader = screen.queryByText("结论");
    expect(conclusionHeader).toBeInTheDocument();
  });

  fnTest(["M03.F06.I01"], "显示我提交的（可撤回）区块", async () => {
    renderWithRouter(<ReportApprovePage />);
    await waitFor(() => expect(screen.getByText(/我提交的.*可撤回/)).toBeInTheDocument());
  });

  fnTest(["M03.F06.I01"], "分页控件正常显示", async () => {
    renderWithRouter(<ReportApprovePage />);
    await waitFor(() => {
      const pagination = screen.getByText(/共 \d+ 条/);
      expect(pagination).toBeInTheDocument();
    });
  });

  fnTest(["M03.F06.I02"], "无 report:write 权限时仍可查看列表", async () => {
    useAuthStore.setState({
      user: makeUser(["report:read"]),
      token: "t",
      status: "authenticated",
      error: null,
    });
    renderWithRouter(<ReportApprovePage />);
    await waitFor(() => expect(screen.getByText("报告批准")).toBeInTheDocument());
  });
});
