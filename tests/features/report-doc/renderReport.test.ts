import { describe, expect } from "vitest";
import {
  renderReportHtml,
  wrapReportDocument,
  type ReportContext,
} from "../../../src/features/report-doc/renderReport";
import { fnTest } from "../../fn";
import type { SampleReceipt } from "../../../src/types/api";

const receipt: SampleReceipt = {
  id: "rc-1",
  contractId: "c-1",
  commissionCode: "RC-001",
  categoryCode: "steel",
  commissionDate: "2024-05-01",
  receivedBy: "王五",
  sampleSource: "施工送检",
  testCategory: "委托检验",
  flowStatus: "review",
  flowHistory: [],
  lastSubmittedBy: null,
  reportCode: "R-RC-001",
  reportDate: "2024-05-06",
  conclusion: "所检项目均符合相应标准的技术要求。",
  result: "pass",
  issuedAt: "2024-05-08T10:00:00Z",
  createdAt: "",
  updatedAt: "",
};

function baseCtx(): ReportContext {
  return {
    org: {
      orgName: "XX 检测中心",
      registeredAddress: "",
      testingSiteAddress: "",
      postalCode: "",
      contactPhone: "",
      email: "",
      qualificationCertNo: "",
      updatedAt: "",
    },
    contract: null,
    receipt,
    category: {
      id: "cat-steel",
      code: "steel",
      name: "钢材",
      reportTitle: "钢筋检测报告",
      summaryType: "material",
      summaryName: "钢材汇总表",
      extFields: [{ key: "furnaceNo", label: "炉号" }],
      sortOrder: 0,
      createdAt: "",
      updatedAt: "",
    },
    samples: [
      {
        id: "s-1",
        receiptId: "rc-1",
        sampleCode: "RC-001-S1",
        model: "热轧带肋钢筋",
        specification: "Φ22",
        brand: "HRB400E",
        ext: { furnaceNo: "LH-01" },
        createdAt: "",
        updatedAt: "",
      },
    ],
    items: [
      {
        id: "ti-1",
        sampleId: "s-1",
        parameterCode: "STE003",
        requirement: "≥ 540 MPa",
        result: "575",
        unit: "MPa",
        autoPassed: true,
        passed: true,
        createdAt: "",
        updatedAt: "",
      },
    ],
    parameterNames: { STE003: "抗拉强度 Rm" },
  };
}

describe("renderReportHtml 报告模板渲染", () => {
  fnTest(["M03.F04.I03"], "替换 {{路径.字段}} 标签，含 resultLabel 派生字段", () => {
    const html = renderReportHtml(
      "<h1>{{category.reportTitle}}</h1><p>{{org.orgName}} / {{receipt.reportCode}} / {{receipt.resultLabel}}</p>",
      baseCtx(),
    );
    expect(html).toContain("钢筋检测报告");
    expect(html).toContain("XX 检测中心");
    expect(html).toContain("R-RC-001");
    expect(html).toContain("合格");
  });

  fnTest(["M03.F04.I03"], "{{samplesTable}} 生成样品表且包含类别扩展属性列", () => {
    const html = renderReportHtml("{{samplesTable}}", baseCtx());
    expect(html).toContain("<table");
    expect(html).toContain("炉号");
    expect(html).toContain("LH-01");
    expect(html).toContain("HRB400E");
  });

  fnTest(
    ["M03.F04.I03"],
    "{{testItemsTable}} 生成检测结果表（参数名/技术要求/评定）",
    () => {
      const html = renderReportHtml("{{testItemsTable}}", baseCtx());
      expect(html).toContain("抗拉强度 Rm");
      expect(html).toContain("≥ 540 MPa");
      expect(html).toContain("575 MPa");
      expect(html).toContain("合格");
    },
  );

  fnTest(["M03.F04.I03"], "未知路径替换为空字符串；HTML 特殊字符转义", () => {
    const ctx = baseCtx();
    ctx.samples[0]!.sampleName = "<script>alert(1)</script>";
    const html = renderReportHtml("[{{no.such.path}}]{{samplesTable}}", ctx);
    expect(html).toContain("[]");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  fnTest(["M03.F04.I03"], "wrapReportDocument 组装完整 HTML 文档", () => {
    const doc = wrapReportDocument("<p>body</p>", "R-1 检测报告");
    expect(doc).toContain("<!DOCTYPE html>");
    expect(doc).toContain("<title>R-1 检测报告</title>");
    expect(doc).toContain("<p>body</p>");
  });
});
