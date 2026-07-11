import { describe, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw/server";
import { useUserStore } from "../../../src/features/users/userStore";
import { useRoleStore } from "../../../src/features/roles/roleStore";
import { resetApiClient, setToken } from "../../../src/api/client";
import { resetMockDb } from "../../../msw/db";
import { fnTest } from "../../fn";

const API_BASE = "http://localhost/api";

async function seedUsers(n: number) {
  for (let i = 0; i < n; i++) {
    await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: `u${i}@lab`,
        displayName: `用户${i}`,
        email: `u${i}@lab.com`,
        roleId: "role-admin",
      }),
    });
  }
}

async function seedRoles() {
  await fetch(`${API_BASE}/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "admin",
      description: "管理员",
      permissions: ["project:read", "user:delete"],
    }),
  });
  await fetch(`${API_BASE}/roles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "viewer",
      description: "查看者",
      permissions: ["project:read"],
    }),
  });
}

beforeEach(() => {
  localStorage.clear();
  useUserStore.setState({
    list: [],
    total: 0,
    current: null,
    loading: false,
    error: null,
  });
  useRoleStore.setState({
    list: [],
    total: 0,
    current: null,
    loading: false,
    error: null,
  });
  resetApiClient();
  setToken("mock-token");
  resetMockDb();
});

describe("userStore", () => {
  fnTest(["M01.F03.I01"], "fetchUsers 成功", async () => {
    await seedUsers(3);
    await useUserStore.getState().fetchUsers({ page: 1, pageSize: 10 });
    expect(useUserStore.getState().list).toHaveLength(3);
  });

  fnTest(["M01.F03.I01"], "fetchUsers role 筛选", async () => {
    await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "a@lab",
        displayName: "管理员",
        email: "a@lab.com",
        roleId: "role-admin",
      }),
    });
    await fetch(`${API_BASE}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "v@lab",
        displayName: "查看者",
        email: "v@lab.com",
        roleId: "role-viewer",
      }),
    });
    await useUserStore
      .getState()
      .fetchUsers({ page: 1, pageSize: 10, role: "role-admin" });
    expect(useUserStore.getState().list.every((u) => u.roleId === "role-admin")).toBe(
      true,
    );
  });

  fnTest(["M01.F03.I02"], "createUser 成功", async () => {
    await useUserStore.getState().fetchUsers({ page: 1, pageSize: 10 });
    await useUserStore
      .getState()
      .createUser({
        username: "new@lab",
        displayName: "新建",
        email: "new@lab.com",
        roleId: "role-admin",
      });
    expect(useUserStore.getState().list.some((u) => u.username === "new@lab")).toBe(
      true,
    );
  });

  fnTest(["M01.F03.I02"], "updateUser 成功", async () => {
    await seedUsers(1);
    await useUserStore.getState().fetchUsers({ page: 1, pageSize: 10 });
    const target = useUserStore.getState().list[0]!;
    await useUserStore
      .getState()
      .updateUser(target.id, { displayName: "已改名", roleId: "role-viewer" });
    const updated = useUserStore.getState().list.find((u) => u.id === target.id);
    expect(updated?.displayName).toBe("已改名");
    expect(updated?.roleId).toBe("role-viewer");
  });

  fnTest(["M01.F03.I03"], "deleteUser 成功", async () => {
    await seedUsers(2);
    await useUserStore.getState().fetchUsers({ page: 1, pageSize: 10 });
    const target = useUserStore.getState().list[0]!;
    await useUserStore.getState().deleteUser(target.id);
    expect(useUserStore.getState().list.some((u) => u.id === target.id)).toBe(false);
  });

  fnTest(["M01.F03.I01"], "网络错误后 error", async () => {
    server.use(http.get("*/users", () => HttpResponse.error()));
    await useUserStore.getState().fetchUsers({ page: 1, pageSize: 10 });
    expect(useUserStore.getState().error).toBeTruthy();
  });
});

describe("roleStore", () => {
  fnTest(["M01.F02.I01"], "fetchRoles 成功", async () => {
    await seedRoles();
    await useRoleStore.getState().fetchRoles({ page: 1, pageSize: 50 });
    expect(useRoleStore.getState().list.length).toBeGreaterThanOrEqual(2);
  });

  fnTest(["M01.F02.I02"], "createRole 成功", async () => {
    await useRoleStore.getState().fetchRoles({ page: 1, pageSize: 50 });
    await useRoleStore
      .getState()
      .createRole({
        name: "editor",
        description: "编辑",
        permissions: ["project:read", "project:write"],
      });
    expect(useRoleStore.getState().list.some((r) => r.name === "editor")).toBe(true);
  });

  fnTest(["M01.F02.I02"], "updateRole 成功", async () => {
    await seedRoles();
    await useRoleStore.getState().fetchRoles({ page: 1, pageSize: 50 });
    const target = useRoleStore.getState().list[0]!;
    await useRoleStore
      .getState()
      .updateRole(target.id, { name: "superadmin", permissions: ["*"] });
    const updated = useRoleStore.getState().list.find((r) => r.id === target.id);
    expect(updated?.name).toBe("superadmin");
    expect(updated?.permissions).toContain("*");
  });

  fnTest(["M01.F02.I03"], "deleteRole 成功", async () => {
    await seedRoles();
    await useRoleStore.getState().fetchRoles({ page: 1, pageSize: 50 });
    const target = useRoleStore.getState().list[0]!;
    await useRoleStore.getState().deleteRole(target.id);
    expect(useRoleStore.getState().list.some((r) => r.id === target.id)).toBe(false);
  });

  fnTest(["M01.F02.I01"], "网络错误后 error", async () => {
    server.use(http.get("*/roles", () => HttpResponse.error()));
    await useRoleStore.getState().fetchRoles({ page: 1, pageSize: 50 });
    expect(useRoleStore.getState().error).toBeTruthy();
  });
});
