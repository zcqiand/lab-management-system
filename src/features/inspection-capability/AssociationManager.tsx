import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";

interface ExtraField {
  name: string;
  label: string;
  type?: "text" | "select";
  options?: string[];
}

interface Props {
  ariaLabel: string;
  endpoint: string; // 如 /inspection-object-parameters
  parentParam: string; // 如 inspectionObjectCode
  parentCode: string;
  targetLabel: string; // 如 "检测参数"
  targetEndpoint: string; // 如 /inspection-parameters
  targetParam: string; // 如 inspectionParameterCode
  targetValueKey: string; // 目标下拉 value 字段（通常 code）
  targetTextKey: string; // 目标下拉 显示字段（通常 name）
  extraFields?: ExtraField[]; // role / qualificationLevel+sortOrder
  fnId?: string; // data-fn 锚点
}

export function AssociationManager(props: Props) {
  const {
    ariaLabel,
    endpoint,
    parentParam,
    parentCode,
    targetLabel,
    targetEndpoint,
    targetParam,
    targetValueKey,
    targetTextKey,
    extraFields = [],
    fnId,
  } = props;
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [targets, setTargets] = useState<Array<Record<string, string>>>([]);
  const [selected, setSelected] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = () => {
    apiClient
      .get<{ items: Array<Record<string, string>> }>(endpoint, {
        params: { [parentParam]: parentCode, page: 1, pageSize: "200" },
      })
      .then((res) => setRows(Array.isArray(res.data?.items) ? res.data.items : []))
      .catch(() => setError("加载失败"));
    apiClient
      .get<{ items: Array<Record<string, string>> }>(targetEndpoint, {
        params: { page: 1, pageSize: "200" },
      })
      .then((res) => setTargets(Array.isArray(res.data?.items) ? res.data.items : []))
      .catch(() => {});
  };
  // 仅在父级/target 端点切换时重新加载；selected/extra 是纯本地表单态，不触发重拉。
  useEffect(loadAll, [endpoint, parentParam, parentCode, targetEndpoint]);

  const add = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = {
      [parentParam]: parentCode,
      [targetParam]: selected,
      ...extra,
    };
    try {
      const res = await apiClient.post(endpoint, payload);
      if (
        res.data &&
        typeof res.data === "object" &&
        "message" in (res.data as { message?: string })
      ) {
        setError((res.data as { message: string }).message);
      } else {
        setSelected("");
        setExtra({});
        loadAll();
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "添加失败",
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (targetCode: string, row: Record<string, string>) => {
    setBusy(true);
    setError(null);
    const params: Record<string, string> = {
      [parentParam]: parentCode,
      [targetParam]: targetCode,
    };
    for (const f of extraFields) {
      const v = row[f.name];
      if (v !== undefined) params[f.name] = v;
    }
    try {
      await apiClient.delete(endpoint, { params });
      loadAll();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "移除失败",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-fn={fnId} aria-label={ariaLabel} className="space-y-3">
      {error && (
        <div role="alert" className="text-red-600 text-sm bg-red-50 p-2 rounded">
          {error}
        </div>
      )}
      <ul className="text-sm divide-y">
        {rows.length === 0 && <li className="px-1 py-2 text-gray-400">暂无关联</li>}
        {rows.map((r) => {
          const code = r[targetParam];
          // 行优先显示目标可读名称（如检测参数名），找不到再回退到 code
          const target = targets.find((t) => t[targetValueKey] === code);
          const display = target?.[targetTextKey] ?? code;
          return (
            <li
              key={code + extraFields.map((f) => r[f.name]).join("#")}
              className="flex items-center justify-between px-1 py-2"
            >
              <span>
                {display}
                {extraFields.map((f) => ` · ${f.label}: ${r[f.name] ?? ""}`).join("")}
              </span>
              <button
                type="button"
                aria-label={`移除 ${code}`}
                disabled={busy}
                onClick={() => remove(code, r)}
                className="text-red-600 hover:underline disabled:opacity-40"
              >
                移除
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="text-xs text-gray-600">{targetLabel}</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="ml-1 border rounded px-2 py-1"
          >
            <option value="">选择{targetLabel}</option>
            {targets.map((t) => (
              <option key={t[targetValueKey]} value={t[targetValueKey]}>
                {t[targetTextKey]}
              </option>
            ))}
          </select>
        </label>
        {extraFields.map((f) => (
          <label key={f.name} className="text-sm">
            <span className="text-xs text-gray-600">{f.label}</span>
            {f.type === "select" ? (
              <select
                value={extra[f.name] ?? ""}
                onChange={(e) => setExtra({ ...extra, [f.name]: e.target.value })}
                className="ml-1 border rounded px-2 py-1"
              >
                <option value="">（选）</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={extra[f.name] ?? ""}
                onChange={(e) => setExtra({ ...extra, [f.name]: e.target.value })}
                className="ml-1 border rounded px-2 py-1"
              />
            )}
          </label>
        ))}
        <button
          type="button"
          onClick={add}
          disabled={busy || !selected}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
        >
          添加
        </button>
      </div>
    </div>
  );
}

export default AssociationManager;
