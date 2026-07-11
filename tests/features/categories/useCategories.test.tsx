import { describe, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw/server";
import { useCategories, categoryName } from "../../../src/features/categories/useCategories";
import type { ReportCategory } from "../../../src/types/api";
import { fnTest } from "../../fn";

beforeEach(() => {
  localStorage.clear();
});

describe("useCategories", () => {
  fnTest(["M04.F01.I01"], "加载后 categories 填充", async () => {
    const TestComponent = () => {
      const { categories, loading } = useCategories();
      if (loading) return <div>loading</div>;
      return (
        <div>
          {categories.map((c) => (
            <span key={c.id}>{c.code}</span>
          ))}
        </div>
      );
    };
    render(<TestComponent />);
    await waitFor(() => expect(screen.queryByText("loading")).not.toBeInTheDocument());
    // 默认 MSW handlers 已注册，report-categories 有默认种子数据
    await waitFor(() => {
      expect(screen.getByText("steel")).toBeInTheDocument();
    });
  });

  fnTest(["M04.F01.I01"], "空 categories 时不崩溃", async () => {
    server.use(
      http.get("*/report-categories", () =>
        HttpResponse.json({ items: [], total: 0, page: 1, pageSize: 100 }),
      ),
    );
    const TestComponent = () => {
      const { categories, loading } = useCategories();
      if (loading) return <div>loading</div>;
      return (
        <div>
          <span data-testid="count">{categories.length}</span>
        </div>
      );
    };
    render(<TestComponent />);
    await waitFor(() => expect(screen.getByTestId("count")).toHaveTextContent("0"));
  });
});

describe("categoryName 工具函数", () => {
  fnTest(["M04.F01.I01"], "根据 code 找到对应名称", () => {
    const cats: ReportCategory[] = [
      { id: "1", code: "steel", name: "钢材检测", reportTitle: "钢材检测报告", summaryType: "material", summaryName: "钢材汇总表", extFields: [], sortOrder: 1, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
      { id: "2", code: "concrete", name: "混凝土检测", reportTitle: "混凝土检测报告", summaryType: "concrete", summaryName: "混凝土汇总表", extFields: [], sortOrder: 2, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
    ];
    expect(categoryName(cats, "steel")).toBe("钢材检测");
    expect(categoryName(cats, "concrete")).toBe("混凝土检测");
  });

  fnTest(["M04.F01.I01"], "code 不存在时返回 code 本身", () => {
    const cats: ReportCategory[] = [
      { id: "1", code: "steel", name: "钢材检测", reportTitle: "钢材检测报告", summaryType: "material", summaryName: "钢材汇总表", extFields: [], sortOrder: 1, createdAt: "2024-01-01T00:00:00Z", updatedAt: "2024-01-01T00:00:00Z" },
    ];
    expect(categoryName(cats, "unknown")).toBe("unknown");
    expect(categoryName(cats, undefined)).toBe("—");
    expect(categoryName(cats, "")).toBe("");
  });
});
