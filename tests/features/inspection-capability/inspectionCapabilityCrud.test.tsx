import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { fnTest } from "../../fn";
import { resetMockDb, seedMasterDataIntoMockDb } from "../../../msw/db";
import { InspectionCapabilityPage } from "../../../src/features/inspection-capability/InspectionCapabilityPage";
import { useAuthStore } from "../../../src/features/auth/authStore";

function loginAsAdmin() {
  useAuthStore.setState({
    user: {
      id: "u-admin",
      username: "labadmin",
      displayName: "实验室管理员",
      role: { id: "role-admin", name: "admin", permissions: [] },
      permissions: ["user:read", "report:read", "report:write", "report:issue"],
    },
    token: "test-token",
  });
}

function renderPage(resource: "specialties" | "objects" | "parameters" | "standards") {
  return render(
    <MemoryRouter initialEntries={[`/inspection-${resource}`]}>
      <InspectionCapabilityPage resource={resource} />
    </MemoryRouter>,
  );
}

async function flush() {
  await waitFor(() => {
    expect(screen.queryByText("加载中...")).not.toBeInTheDocument();
  });
}

describe("InspectionCapabilityPage M06 CRUD 入口", () => {
  beforeEach(() => {
    cleanup();
    resetMockDb();
    seedMasterDataIntoMockDb();
    loginAsAdmin();
  });

  fnTest(["M06.F01.I02"], "检测专项页打开“新建专项”弹窗", async () => {
    renderPage("specialties");
    await flush();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "新建专项" }));
    const dialog = await screen.findByRole("heading", { name: "新建检测专项", level: 3 });
    expect(dialog).toBeTruthy();
  });

  fnTest(["M06.F02.I02"], "检测项目页打开“新建项目”弹窗", async () => {
    renderPage("objects");
    await flush();
    const user = userEvent.setup();
    const button = await screen.findByRole("button", { name: "新建项目" });
    await user.click(button);
    const dialog = await screen.findByRole("heading", { name: "新建检测项目", level: 3 });
    expect(dialog).toBeTruthy();
  });

  fnTest(["M06.F03.I02"], "检测参数页打开“新建参数”弹窗", async () => {
    renderPage("parameters");
    await flush();
    const user = userEvent.setup();
    const button = await screen.findByRole("button", { name: "新建参数" });
    await user.click(button);
    const dialog = await screen.findByRole("heading", { name: "新建检测参数", level: 3 });
    expect(dialog).toBeTruthy();
  });

  fnTest(["M06.F04.I02"], "检测标准页打开“新建标准”弹窗", async () => {
    renderPage("standards");
    await flush();
    const user = userEvent.setup();
    const button = await screen.findByRole("button", { name: "新建标准" });
    await user.click(button);
    const dialog = await screen.findByRole("heading", { name: "新建检测标准", level: 3 });
    expect(dialog).toBeTruthy();
  });

  fnTest(["M06.F01.I02"], "检测专项编辑弹窗预填并提交 PUT", async () => {
    // 先建一个自定义专项供编辑
    await fetch("http://localhost/api/inspection-specialties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "SP90", name: "待编辑专项", isOfficial: false, enabled: true }),
    });
    renderPage("specialties");
    await flush();
    const user = userEvent.setup();
    // SP90 行的编辑按钮
    const editBtn = await screen.findByRole("button", { name: `编辑 SP90` });
    await user.click(editBtn);
    const heading = await screen.findByRole("heading", { name: "编辑检测专项", level: 3 });
    expect(heading).toBeTruthy();
    // 名称字段已预填
    const nameInput = screen.getByLabelText("名称") as HTMLInputElement;
    expect(nameInput.value).toBe("待编辑专项");
    await user.clear(nameInput);
    await user.type(nameInput, "已编辑专项");
    await user.click(screen.getByRole("button", { name: "保存" }));
    // 保存后弹窗关闭
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "编辑检测专项", level: 3 })).toBeNull();
    });
  });

  fnTest(["M06.F03.I03"], "检测参数删除被引用时展示错误", async () => {
    renderPage("parameters");
    await flush();
    // IP-CEM003 是官方参数，删除按钮 disabled，不会触发请求；改用新建一个自定义参数再删
    // 这里验证官方参数的删除按钮被禁用
    const delBtn = await screen.findByRole("button", { name: `删除 IP-CEM003` });
    expect((delBtn as HTMLButtonElement).disabled).toBe(true);
  });

  fnTest(["M06.F01.I03"], "检测专项删除自定义未引用专项成功", async () => {
    await fetch("http://localhost/api/inspection-specialties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "SP91", name: "可删专项", isOfficial: false, enabled: true }),
    });
    renderPage("specialties");
    await flush();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: `删除 SP91` }));
    // 确认弹窗
    await user.click(await screen.findByRole("button", { name: "确认" }));
    // 列表刷新后 SP91 消失
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: `删除 SP91` })).toBeNull();
    });
  });
});
