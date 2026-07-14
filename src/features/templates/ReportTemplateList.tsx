import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useCategories } from "../categories/useCategories";
import type { ReportTemplate } from "../../types/api";

/** 可用标签清单（与 renderReport.ts 渲染逻辑对应） */
const TEMPLATE_TAGS: { tag: string; label: string }[] = [
  { tag: "{{org.orgName}}", label: "检测机构名称" },
  { tag: "{{org.registeredAddress}}", label: "注册地址" },
  { tag: "{{org.testingSiteAddress}}", label: "检测能力场所地址" },
  { tag: "{{org.postalCode}}", label: "邮政编码" },
  { tag: "{{org.contactPhone}}", label: "联系电话" },
  { tag: "{{org.email}}", label: "电子信箱" },
  { tag: "{{org.qualificationCertNo}}", label: "资质证书编号" },
  { tag: "{{category.name}}", label: "报告类别名称" },
  { tag: "{{category.reportTitle}}", label: "报告标题" },
  { tag: "{{contract.contractCode}}", label: "合同编号" },
  { tag: "{{contract.projectName}}", label: "工程名称" },
  { tag: "{{contract.clientUnit}}", label: "委托单位" },
  { tag: "{{contract.constructionUnit}}", label: "施工单位" },
  { tag: "{{contract.witnessUnit}}", label: "见证单位" },
  { tag: "{{contract.witness}}", label: "见证人" },
  { tag: "{{receipt.receiptCode}}", label: "委托书编号" },
  { tag: "{{receipt.reportCode}}", label: "报告编号" },
  { tag: "{{receipt.reportDate}}", label: "检测日期" },
  { tag: "{{receipt.receivedDate}}", label: "委托日期" },
  { tag: "{{receipt.testCategory}}", label: "检测类别" },
  { tag: "{{receipt.sampleSource}}", label: "样品来源" },
  { tag: "{{receipt.testEnvironment}}", label: "检测环境" },
  { tag: "{{receipt.mainEquipment}}", label: "主要设备" },
  { tag: "{{receipt.assigneeName}}", label: "检测人员" },
  { tag: "{{receipt.conclusion}}", label: "检测结论" },
  { tag: "{{receipt.resultLabel}}", label: "判定结果（合格/不合格）" },
  { tag: "{{receipt.issuedAt}}", label: "签发日期" },
  { tag: "{{samplesTable}}", label: "样品信息表（含该类别扩展属性列）" },
  { tag: "{{testItemsTable}}", label: "检测结果表（参数/技术要求/检测值/评定）" },
];

/** 报告模板管理——每个报告类别对应一份模板；数据录入完成后按模板生成报告文档 */
export function ReportTemplateList() {
  const { categories } = useCategories();
  const [categoryCode, setCategoryCode] = useState("");
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [content, setContent] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryCode && categories.length > 0) setCategoryCode(categories[0]!.code);
  }, [categories, categoryCode]);

  const fetchTemplate = useCallback(async () => {
    if (!categoryCode) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await apiClient.get<{ items: ReportTemplate[] }>("/report-templates", {
        params: { categoryCode },
      });
      const tpl = res.data.items[0] ?? null;
      setTemplate(tpl);
      setContent(tpl?.content ?? "");
      setName(
        tpl?.name ??
          `${categories.find((c) => c.code === categoryCode)?.name ?? ""}报告模板`,
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [categoryCode, categories]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  const insertTag = (tag: string) => {
    const textarea = document.getElementById("tpl-editor") as HTMLTextAreaElement | null;
    if (!textarea) {
      setContent((c) => c + tag);
      return;
    }
    const start = textarea.selectionStart ?? content.length;
    const end = textarea.selectionEnd ?? content.length;
    const next = content.slice(0, start) + tag + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    });
  };

  const handleSave = async () => {
    if (!categoryCode || !content.trim()) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (template) {
        await apiClient.put(`/report-templates/${template.id}`, { name, content });
      } else {
        await apiClient.post("/report-templates", { categoryCode, name, content });
      }
      setNotice("模板已保存");
      await fetchTemplate();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4" data-fn="M04.F02.I01">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">报告模板</h2>
          <p className="text-xs text-gray-500 mt-1">
            每个报告类别对应一份模板（HTML + {"{{标签}}"}
            ）；数据录入完成后按模板生成报告文档
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading || !content.trim()}
          data-fn="M04.F02.I02"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存模板"}
        </button>
      </div>

      <div className="flex items-center gap-3 bg-white p-3 rounded shadow-sm text-sm">
        <label className="text-gray-600">报告类别：</label>
        <select
          value={categoryCode}
          onChange={(e) => setCategoryCode(e.target.value)}
          className="border rounded px-2 py-1.5"
        >
          {categories.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="text-gray-600 ml-4">模板名称：</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded px-2 py-1.5 flex-1 max-w-xs"
        />
      </div>

      {error && (
        <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="text-green-700 text-sm bg-green-50 p-2 rounded">
          {notice}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white rounded shadow p-3">
          <label className="block text-xs font-medium text-gray-600 mb-2">
            模板内容（HTML）
          </label>
          {loading ? (
            <p className="text-gray-400 text-sm py-10 text-center">加载中...</p>
          ) : (
            <textarea
              id="tpl-editor"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              className="w-full h-[480px] border rounded p-3 font-mono text-xs leading-relaxed"
            />
          )}
        </div>
        <div className="bg-white rounded shadow p-3 overflow-y-auto max-h-[540px]">
          <h4 className="text-sm font-semibold mb-2">可用标签（点击插入光标处）</h4>
          <ul className="space-y-1">
            {TEMPLATE_TAGS.map((t) => (
              <li key={t.tag}>
                <button
                  onClick={() => insertTag(t.tag)}
                  className="w-full text-left px-2 py-1 rounded hover:bg-blue-50 text-xs"
                  title="点击插入"
                >
                  <span className="font-mono text-blue-700">{t.tag}</span>
                  <span className="text-gray-500 ml-2">{t.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ReportTemplateList;
