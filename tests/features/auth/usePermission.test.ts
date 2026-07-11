import { describe, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePermission } from "../../../src/features/auth/usePermission";
import { useAuthStore } from "../../../src/features/auth/authStore";
import { fnTest } from "../../fn";
import type { User } from "../../../src/types/api";

const adminUser: User = {
  id: "u-001",
  username: "labadmin",
  displayName: "实验室管理员",
  role: { id: "role-admin", name: "admin", permissions: ["project:read", "user:delete"] },
  permissions: ["project:read", "user:delete"],
};

const techUser: User = {
  id: "u-002",
  username: "technician",
  displayName: "检测员",
  role: { id: "role-tech", name: "technician", permissions: ["project:read"] },
  permissions: ["project:read"],
};

beforeEach(() => {
  localStorage.clear();
  useAuthStore.setState({ user: null, token: null, status: "idle", error: null });
});

describe("usePermission", () => {
  fnTest(["M01.F04.I03"], "未登录时任意权限返回 false", () => {
    const { result } = renderHook(() => usePermission("project:read"));
    expect(result.current).toBe(false);
  });

  fnTest(["M01.F04.I03"], "admin 用户拥有 project:read 返回 true", () => {
    useAuthStore.setState({ user: adminUser });
    const { result } = renderHook(() => usePermission("project:read"));
    expect(result.current).toBe(true);
  });

  fnTest(["M01.F04.I03"], "admin 用户拥有 user:delete 返回 true", () => {
    useAuthStore.setState({ user: adminUser });
    const { result } = renderHook(() => usePermission("user:delete"));
    expect(result.current).toBe(true);
  });

  fnTest(["M01.F04.I03"], "technician 用户无 user:delete 返回 false", () => {
    useAuthStore.setState({ user: techUser });
    const { result } = renderHook(() => usePermission("user:delete"));
    expect(result.current).toBe(false);
  });

  fnTest(["M01.F04.I03"], "technician 用户有 project:read 返回 true", () => {
    useAuthStore.setState({ user: techUser });
    const { result } = renderHook(() => usePermission("project:read"));
    expect(result.current).toBe(true);
  });

  fnTest(["M01.F04.I03"], "权限变更后响应更新", () => {
    useAuthStore.setState({ user: techUser });
    const { result, rerender } = renderHook(({ p }) => usePermission(p), {
      initialProps: { p: "project:read" },
    });
    expect(result.current).toBe(true);
    rerender({ p: "user:delete" });
    expect(result.current).toBe(false);
  });
});
