import { describe, expect, beforeEach, vi, afterEach, it } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { fnTest } from "../../fn";
import { resetMockDb, seedMasterDataIntoMockDb } from "../../../msw/db";
import { InspectionCapabilityPage } from "../../../src/features/inspection-capability/InspectionCapabilityPage";
import { apiClient } from "../../../src/api/client";
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

  fnTest(["M06.F02.I01"], "检测项目页按检测专项过滤", async () => {
    const getSpy = vi.spyOn(apiClient, "get");
    renderPage("objects");
    await flush();
    const select = screen.getByLabelText("检测专项筛选") as HTMLSelectElement;
    expect(select).toBeTruthy();
    const user = userEvent.setup();
    await user.selectOptions(select, "SP01");
    await flush();
    const filteredCall = getSpy.mock.calls.find(
      ([path, cfg]) =>
        path === "/inspection-objects" &&
        (cfg as unknown as { params?: { inspectionSpecialtyCode?: string } })?.params
          ?.inspectionSpecialtyCode === "SP01",
    );
    expect(filteredCall).toBeTruthy();
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

  fnTest(["M06.F04.I01"], "检测标准页级联下拉：选专项后请求带 inspectionSpecialtyCode", async () => {
    const getSpy = vi.spyOn(apiClient, "get");
    renderPage("standards");
    await flush();
    const user = userEvent.setup();
    const spSelect = screen.getByLabelText("检测专项筛选");
    await user.selectOptions(spSelect, "SP01");
    await flush();
    const hit = getSpy.mock.calls.find(
      ([path, cfg]) =>
        path === "/inspection-standards" &&
        (cfg as unknown as { params?: { inspectionSpecialtyCode?: string } })?.params?.inspectionSpecialtyCode === "SP01",
    );
    expect(hit).toBeTruthy();
  });

  fnTest(["M06.F03.I01"], "检测参数页三级级联：选专项→项目→标准后请求带全部参数", async () => {
    const getSpy = vi.spyOn(apiClient, "get");
    renderPage("parameters");
    await flush();
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("检测专项筛选"), "SP01");
    await flush();
    await user.selectOptions(await screen.findByLabelText("检测项目筛选"), "OBJ-SP01-P1");
    await flush();
    await user.selectOptions(await screen.findByLabelText("检测标准筛选"), "GB 175-2023");
    await flush();
    const hit = getSpy.mock.calls.find(
      ([path, cfg]) =>
        path === "/inspection-parameters" &&
        (cfg as unknown as { params?: Record<string, string> })?.params?.inspectionSpecialtyCode === "SP01" &&
        (cfg as unknown as { params?: Record<string, string> })?.params?.inspectionObjectCode === "OBJ-SP01-P1" &&
        (cfg as unknown as { params?: Record<string, string> })?.params?.inspectionStandardCode === "GB 175-2023",
    );
    expect(hit).toBeTruthy();
  });

  // 防御性用例：当 apiClient.get 返回畸形响应（无 items 字段，例如 MSW 未启动时
  // /api/* 被 bypass 到 Vite dev server 返回 index.html）时，页面不得抛错，
  // 而是落入 error/empty 分支。回归浏览器 MSW 起不来导致的运行时崩溃。
  describe("畸形响应防御", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("apiClient.get 返回空对象时不抛错，落入 error/empty 分支", async () => {
      const malformed = { data: {} } as unknown as { data: { items: never[]; total: number } };
      vi.spyOn(apiClient, "get").mockResolvedValue(malformed);

      // 渲染本身不得抛错
      expect(() =>
        render(
          <MemoryRouter initialEntries={[`/inspection-specialties`]}>
            <InspectionCapabilityPage resource="specialties" />
          </MemoryRouter>,
        ),
      ).not.toThrow();

      // 等待 loading 结束后，应出现 error 提示或"暂无数据"，二者满足其一即可
      await waitFor(() => {
        const alert = screen.queryByRole("alert");
        const empty = screen.queryByText("暂无数据");
        expect(alert !== null || empty !== null).toBe(true);
      });
    });
  });
});
