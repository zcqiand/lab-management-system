import { describe, expect } from "vitest";
import { signJwt, verifyJwt } from "../../msw/jwt";
import { fnTest } from "../fn";

describe("mock JWT 工具", () => {
  fnTest(
    ["M01.F05.I01", "M01.F05.I02"],
    "signJwt 生成三段式 token（header.payload.signature）",
    () => {
      const token = signJwt({
        sub: "u-001",
        username: "labadmin",
        role: "admin",
        permissions: [],
      });
      expect(token.split(".")).toHaveLength(3);
    },
  );

  fnTest(["M01.F05.I01", "M01.F05.I02"], "verifyJwt 校验有效 token 返回 payload", () => {
    const token = signJwt({
      sub: "u-001",
      username: "labadmin",
      role: "admin",
      permissions: ["project:read", "user:delete"],
    });
    const payload = verifyJwt(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("u-001");
    expect(payload?.username).toBe("labadmin");
    expect(payload?.role).toBe("admin");
    expect(payload?.permissions).toContain("user:delete");
  });

  fnTest(["M01.F05.I02"], "verifyJwt 拒绝篡改 signature 的 token", () => {
    const token = signJwt({
      sub: "u-001",
      username: "labadmin",
      role: "admin",
      permissions: [],
    });
    const tampered = token.slice(0, -4) + "AAAA";
    expect(verifyJwt(tampered)).toBeNull();
  });

  fnTest(["M01.F05.I02"], "verifyJwt 拒绝过期 token", () => {
    const token = signJwt(
      { sub: "u-001", username: "labadmin", role: "admin", permissions: [] },
      -10,
    );
    expect(verifyJwt(token)).toBeNull();
  });

  fnTest(["M01.F05.I02"], "verifyJwt 拒绝格式错误的 token", () => {
    expect(verifyJwt("not-a-jwt")).toBeNull();
    expect(verifyJwt("a.b")).toBeNull();
  });
});
