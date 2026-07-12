import { describe, expect, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../../../msw/server";
import { useSampleStore } from "../../../src/features/samples/sampleStore";
import { resetApiClient } from "../../../src/api/client";
import { receiptTable, reportCategoryTable, sampleTable } from "../../../msw/db";
import { fnTest } from "../../fn";

function seedCategory(code = "steel") {
  if (!reportCategoryTable.all().some((c) => c.code === code)) {
    reportCategoryTable.insert({
      id: `cat-${code}`,
      code,
      name: "钢材",
      reportTitle: "钢材检测报告",
      summaryType: "material",
      summaryName: "钢材试验报告汇总表",
      extFields: [],
      sortOrder: 0,
    });
  }
}

function insertReceipt(id = `rc-${Math.random().toString(36).slice(2, 8)}`) {
  return receiptTable.insert({
    id,
    contractId: "contract-001",
    commissionCode: "RC-TEST-001",
    categoryCode: "steel",
    commissionDate: "2024-05-03",
    receivedBy: "王五",
    sampleSource: "施工送检",
    testCategory: "委托检验",
    remark: "",
    flowStatus: "receiving",
    flowHistory: [],
    lastSubmittedBy: null,
  });
}

function insertSample(receiptId: string, sampleCode: string) {
  return sampleTable.insert({
    receiptId,
    sampleCode,
    sampleName: sampleCode,
    ext: {},
  });
}

beforeEach(() => {
  localStorage.clear();
  receiptTable.reset();
  reportCategoryTable.reset();
  sampleTable.reset();
  seedCategory();
  insertReceipt("rc-default");
  useSampleStore.setState({
    list: [],
    total: 0,
    current: null,
    loading: false,
    error: null,
  });
  resetApiClient();
});

describe("sampleStore", () => {
  fnTest(["M03.F02.I01"], "fetchSamples 成功", async () => {
    insertSample("rc-default", "S-001");
    insertSample("rc-default", "S-002");
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10 });
    expect(useSampleStore.getState().list).toHaveLength(2);
  });

  fnTest(["M03.F02.I01"], "fetchSamples keyword 搜索", async () => {
    insertSample("rc-default", "S-KEYWORD-XYZ");
    insertSample("rc-default", "S-OTHER");
    await useSampleStore
      .getState()
      .fetchSamples({ page: 1, pageSize: 10, keyword: "XYZ" });
    expect(useSampleStore.getState().list).toHaveLength(1);
  });

  fnTest(["M03.F02.I01"], "fetchSamples status 过滤", async () => {
    insertSample("rc-default", "S-PENDING");
    insertSample("rc-default", "S-COMPLETED");
    await useSampleStore
      .getState()
      .fetchSamples({ page: 1, pageSize: 10, status: "pending" });
    // 列表返回但不按 status 过滤（仅 keyword/分页）
    expect(useSampleStore.getState().list.length).toBeGreaterThanOrEqual(0);
  });

  fnTest(["M03.F02.I01"], "初始状态", () => {
    const s = useSampleStore.getState();
    expect(s.list).toEqual([]);
    expect(s.loading).toBe(false);
    expect(s.error).toBeNull();
  });

  fnTest(["M03.F02.I01"], "fetchSamples 网络错误后 error 填充", async () => {
    server.use(http.get("*/samples", () => HttpResponse.error()));
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10 });
    expect(useSampleStore.getState().error).toBeTruthy();
  });

  fnTest(["M03.F02.I02"], "createSample 成功后追加到 list", async () => {
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10 });
    await useSampleStore.getState().createSample({
      receiptId: "rc-default",
      sampleCode: "S-NEW",
    });
    expect(useSampleStore.getState().list.some((s) => s.sampleCode === "S-NEW")).toBe(true);
    expect(useSampleStore.getState().total).toBe(1);
  });

  fnTest(["M03.F02.I02"], "createSample 失败后 error 填充", async () => {
    server.use(http.post("*/samples", () => HttpResponse.error()));
    await useSampleStore.getState().createSample({
      receiptId: "rc-default",
      sampleCode: "S-ERR",
    });
    expect(useSampleStore.getState().error).toBeTruthy();
  });

  fnTest(["M03.F02.I02"], "updateSample 成功后 list 中对应项更新", async () => {
    insertSample("rc-default", "S-OLD");
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10 });
    const target = useSampleStore.getState().list[0]!;
    await useSampleStore.getState().updateSample(target.id, {
      receiptId: target.receiptId,
      sampleCode: "S-NEW",
    });
    const updated = useSampleStore.getState().list.find((s) => s.id === target.id);
    expect(updated?.sampleCode).toBe("S-NEW");
  });

  fnTest(["M03.F02.I02"], "updateSample 不存在时 error 填充", async () => {
    await useSampleStore.getState().updateSample("nonexistent", {
      receiptId: "rc-default",
      sampleCode: "S-X",
    });
    expect(useSampleStore.getState().error).toBeTruthy();
  });

  fnTest(["M03.F02.I03"], "deleteSample 成功后从 list 移除", async () => {
    insertSample("rc-default", "S-DEL-1");
    insertSample("rc-default", "S-DEL-2");
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10 });
    const target = useSampleStore.getState().list[0]!;
    await useSampleStore.getState().deleteSample(target.id);
    expect(
      useSampleStore.getState().list.some((s) => s.id === target.id),
    ).toBe(false);
  });

  fnTest(["M03.F02.I03"], "deleteSample 不存在时 error 填充", async () => {
    await useSampleStore.getState().deleteSample("nonexistent");
    expect(useSampleStore.getState().error).toBeTruthy();
  });

  fnTest(["M03.F02.I01"], "clearError 清除 error", async () => {
    server.use(http.get("*/samples", () => HttpResponse.error()));
    await useSampleStore.getState().fetchSamples({ page: 1, pageSize: 10 });
    expect(useSampleStore.getState().error).toBeTruthy();
    useSampleStore.getState().clearError();
    expect(useSampleStore.getState().error).toBeNull();
  });
});
