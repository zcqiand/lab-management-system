import { describe, expect, vi, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../msw/server";
import {
  apiClient,
  setToken,
  onUnauthorized,
  resetApiClient,
} from "../../src/api/client";
import { fnTest } from "../fn";

afterEach(() => {
  resetApiClient();
});

describe("api/client axios 拦截器", () => {
  fnTest(["M01.F05.I02"], "请求拦截器注入 Bearer token", async () => {
    server.use(
      http.get("*/auth/echo", ({ request }) => {
        return HttpResponse.json({
          authorization: request.headers.get("Authorization"),
        });
      }),
    );
    setToken("my-test-token");
    const res = await apiClient.get("/auth/echo");
    expect(res.data.authorization).toBe("Bearer my-test-token");
  });

  fnTest(["M01.F05.I02"], "未设置 token 时不注入 Authorization", async () => {
    server.use(
      http.get("*/auth/echo", ({ request }) => {
        return HttpResponse.json({
          authorization: request.headers.get("Authorization"),
        });
      }),
    );
    setToken(null);
    const res = await apiClient.get("/auth/echo");
    expect(res.data.authorization).toBeNull();
  });

  fnTest(["M01.F05.I02"], "401 响应触发 onUnauthorized 回调并清除 token", async () => {
    server.use(
      http.get("*/auth/protected", () =>
        HttpResponse.json({ message: "未授权" }, { status: 401 }),
      ),
    );
    const cb = vi.fn();
    onUnauthorized(cb);
    setToken("will-be-cleared");
    await expect(apiClient.get("/auth/protected")).rejects.toThrow();
    expect(cb).toHaveBeenCalledTimes(1);
    // 401 后 token 应被清除，后续请求不再带 Authorization
    server.use(
      http.get("*/auth/echo", ({ request }) => {
        return HttpResponse.json({
          authorization: request.headers.get("Authorization"),
        });
      }),
    );
    const res = await apiClient.get("/auth/echo");
    expect(res.data.authorization).toBeNull();
  });

  fnTest(["M01.F05.I02"], "非 401 错误不触发 onUnauthorized", async () => {
    server.use(
      http.get("*/auth/server-error", () =>
        HttpResponse.json({ message: "服务器错误" }, { status: 500 }),
      ),
    );
    const cb = vi.fn();
    onUnauthorized(cb);
    await expect(apiClient.get("/auth/server-error")).rejects.toThrow();
    expect(cb).not.toHaveBeenCalled();
  });

  fnTest(["M01.F05.I02"], "成功响应正常返回数据", async () => {
    server.use(
      http.get("*/auth/success", () => HttpResponse.json({ ok: true, value: "hello" })),
    );
    const res = await apiClient.get("/auth/success");
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ ok: true, value: "hello" });
  });
});
