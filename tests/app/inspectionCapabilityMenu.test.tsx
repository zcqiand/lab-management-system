import { describe, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Layout from "../../src/app/layouts/Layout";
import { useAuthStore } from "../../src/features/auth/authStore";
import { fnTest } from "../fn";

function renderLayout() {
  return render(
    <MemoryRouter>
      <Layout />
    </MemoryRouter>,
  );
}

function loginAsAdmin() {
  useAuthStore.setState({
    user: {
      id: "u-admin",
      username: "labadmin",
      displayName: "实验室管理员",
      role: { id: "role-admin", name: "admin", permissions: [] },
      permissions: [
        "user:read",
        "role:read",
        "project:read",
        "sample:read",
        "sample:write",
        "report:read",
        "report:write",
        "report:issue",
      ],
    },
    token: "test-token",
  });
}

describe("Layout 检测能力 M06 菜单", () => {
  fnTest(["M06.F01.I01"], "M06 检测能力菜单显示，含检测专项/项目/参数/标准 4 个子菜单", () => {
    loginAsAdmin();
    renderLayout();
    const group = screen.getAllByText("检测能力")[0];
    expect(group).toBeTruthy();
    expect(screen.getAllByText("检测专项").length).toBeGreaterThan(0);
    expect(screen.getAllByText("检测项目").length).toBeGreaterThan(0);
    expect(screen.getAllByText("检测参数").length).toBeGreaterThan(0);
    expect(screen.getAllByText("检测标准").length).toBeGreaterThan(0);
  });

  fnTest(["M06.F02.I01"], "检测项目子菜单的链接指向 /inspection-objects", () => {
    loginAsAdmin();
    renderLayout();
    const links = screen.getAllByRole("link", { name: "检测项目" });
    const target = links.find((l) => l.getAttribute("href") === "/inspection-objects");
    expect(target).toBeTruthy();
  });

  fnTest(["M06.F04.I01"], "检测标准子菜单的链接指向 /inspection-standards", () => {
    loginAsAdmin();
    renderLayout();
    const links = screen.getAllByRole("link", { name: "检测标准" });
    const target = links.find((l) => l.getAttribute("href") === "/inspection-standards");
    expect(target).toBeTruthy();
  });
});
