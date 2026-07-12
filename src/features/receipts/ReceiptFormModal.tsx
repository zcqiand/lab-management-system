import { useCallback, useEffect, useState, type FormEvent } from "react";
import type {
  CategoryDictItem,
  Contract,
  SampleReceipt,
  Sample,
  TestStandard,
  TestParameter,
} from "../../types/api";
import { useCategories } from "../categories/useCategories";
import { apiClient } from "../../api/client";
import { useAuthStore } from "../auth/authStore";
import { ConfirmModal } from "../../components/ConfirmModal";

export interface ReceiptFormValues {
  id?: string;
  contractId: string;
  categoryCode: string;
  commissionCode: string;
  commissionDate: string;
  projectName: string;
  clientUnit: string;
  buildingUnit?: string;
  supervisorUnit?: string;
  constructionUnit?: string;
  witnessUnit?: string;
  samplingLocation?: string;
  witness?: string;
  witnessPhone?: string;
  inspector?: string;
  inspectorPhone?: string;
  receivedBy: string;
  sampleSource: string;
  testCategory: string;
  judgmentBasis?: string[];
  testingBasis?: string[];
  testParameters?: string[];
  remark?: string;
}

interface ReceiptFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: Partial<SampleReceipt>;
  contracts: Contract[];
  onSubmit: (values: ReceiptFormValues) => void;
  onCancel: () => void;
  loading?: boolean;
}

const SAMPLE_SOURCES = ["施工送检", "现场抽样", "监督抽查"];
const TEST_CATEGORIES = ["委托检验", "见证取样", "监督抽查"];

export function ReceiptFormModal({
  open,
  mode,
  initialValues,
  contracts,
  onSubmit,
  onCancel,
  loading = false,
}: ReceiptFormModalProps) {
  const { categories } = useCategories();
  const currentUser = useAuthStore((s) => s.user);
  const [contractId, setContractId] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [commissionCode, setCommissionCode] = useState("");
  const [commissionDate, setCommissionDate] = useState(
    new Date().toISOString().split("T")[0] ?? "",
  );
  const [samplingLocation, setSamplingLocation] = useState("");
  const [witness, setWitness] = useState("");
  const [witnessPhone, setWitnessPhone] = useState("");
  const [inspector, setInspector] = useState("");
  const [inspectorPhone, setInspectorPhone] = useState("");
  const [sampleSource, setSampleSource] = useState("施工送检");
  const [testCategory, setTestCategory] = useState("委托检验");
  const [judgmentBasis, setJudgmentBasis] = useState<string[]>([]);
  const [testingBasis, setTestingBasis] = useState<string[]>([]);
  const [testParameters, setTestParameters] = useState<string[]>([]);
  const [remark, setRemark] = useState("");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [sampleFormOpen, setSampleFormOpen] = useState(false);
  const [sampleEditing, setSampleEditing] = useState<Sample | null>(null);
  const [sampleDeleteTarget, setSampleDeleteTarget] = useState<Sample | null>(null);
  const [sampleDeleting, setSampleDeleting] = useState(false);

  // 样品表单字段
  const emptySampleForm = {
    sampleCode: "",
    sampleName: "",
    model: "",
    specification: "",
    grade: "",
    brand: "",
    manufacturer: "",
    structuralPart: "",
    representQuantity: "",
    sampleQuantity: "",
    batchNumber: "",
    supplyUnit: "",
    arrivalDate: "",
    samplingDate: "",
    curingCondition: "",
    age: "",
    remark: "",
  };
  const [sampleForm, setSampleForm] = useState({ ...emptySampleForm });
  const [sampleExt, setSampleExt] = useState<Record<string, string>>({});
  const [sampleExtDefs, setSampleExtDefs] = useState<{ key: string; label: string }[]>(
    [],
  );
  const [sampleSaving, setSampleSaving] = useState(false);

  // 样品码表（按报告类别过滤）
  const [sampleDicts, setSampleDicts] = useState<{
    models: string[];
    specifications: string[];
    grades: string[];
    brands: string[];
  }>({
    models: [],
    specifications: [],
    grades: [],
    brands: [],
  });
  useEffect(() => {
    if (!categoryCode) return;
    const loadDict = async (endpoint: string): Promise<string[]> => {
      try {
        const res = await apiClient.get<{ items: CategoryDictItem[] }>(`/${endpoint}`, {
          params: { categoryCode, page: 1, pageSize: 200 },
        });
        return res.data.items.map((i) => i.name);
      } catch {
        return [];
      }
    };
    Promise.all([
      loadDict("models"),
      loadDict("specifications"),
      loadDict("grades"),
      loadDict("brands"),
    ]).then(([models, specifications, grades, brands]) =>
      setSampleDicts({ models, specifications, grades, brands }),
    );
    // 加载扩展属性定义
    if (categoryCode) {
      apiClient
        .get<{ extFields: { key: string; label: string }[] }>(
          `/report-categories/${categoryCode}`,
        )
        .then((res) => setSampleExtDefs(res.data.extFields ?? []))
        .catch(() => setSampleExtDefs([]));
    } else {
      setSampleExtDefs([]);
    }
  }, [categoryCode]);

  // 多选数据
  const [allStandards, setAllStandards] = useState<TestStandard[]>([]);
  const [allParameters, setAllParameters] = useState<TestParameter[]>([]);
  const [categoryStandards, setCategoryStandards] = useState<
    { categoryCode: string; standardCode: string }[]
  >([]); // 该报告类别关联的标准
  const [standardParameters, setStandardParameters] = useState<
    { standardCode: string; parameterCode: string }[]
  >([]); // 标准↔参数关联
  const [errors, setErrors] = useState<{
    contractId?: string;
    categoryCode?: string;
    commissionCode?: string;
  }>({});

  // 加载所有标准和参数
  useEffect(() => {
    apiClient
      .get<{ items: TestStandard[] }>("/test-standards", {
        params: { page: 1, pageSize: 200 },
      })
      .then((res) => setAllStandards(res.data.items));
    apiClient
      .get<{ items: TestParameter[] }>("/test-parameters", {
        params: { page: 1, pageSize: 200 },
      })
      .then((res) => setAllParameters(res.data.items));
  }, []);

  // 根据报告类别加载关联的标准
  useEffect(() => {
    if (!categoryCode) {
      setCategoryStandards([]);
      return;
    }
    apiClient
      .get<{ items: { categoryCode: string; standardCode: string }[] }>(
        "/category-standards",
        { params: { categoryCode, page: 1, pageSize: 200 } },
      )
      .then((res) => setCategoryStandards(res.data.items));
  }, [categoryCode]);

  // 根据选中的标准加载关联的参数
  useEffect(() => {
    const selected = [...judgmentBasis, ...testingBasis];
    if (selected.length === 0) {
      setStandardParameters([]);
      return;
    }
    // 加载所有选中标准的关联参数
    Promise.all(
      selected.map((code) =>
        apiClient.get<{ items: { standardCode: string; parameterCode: string }[] }>(
          "/standard-parameters",
          { params: { standardCode: code, page: 1, pageSize: 200 } },
        ),
      ),
    ).then((results) => {
      const all: { standardCode: string; parameterCode: string }[] = [];
      results.forEach((res) => all.push(...res.data.items));
      setStandardParameters(all);
    });
  }, [judgmentBasis, testingBasis]);

  // 判定依据/检测依据的可选标准（按报告类别过滤）
  const filteredStandards = allStandards.filter((s) =>
    categoryStandards.some((cs) => cs.standardCode === s.code),
  );

  // 检测参数（按判定依据∪检测依据的标准过滤）
  const selectedParamCodes = new Set(standardParameters.map((sp) => sp.parameterCode));
  const filteredParameters = allParameters.filter(
    (p) => selectedParamCodes.size === 0 || selectedParamCodes.has(p.code),
  );

  useEffect(() => {
    if (!open) return;
    setContractId(initialValues?.contractId ?? "");
    setCategoryCode(initialValues?.categoryCode ?? "");
    setCommissionCode(initialValues?.commissionCode ?? "");
    setCommissionDate(
      initialValues?.commissionDate ?? new Date().toISOString().slice(0, 10) ?? "",
    );
    setSamplingLocation(initialValues?.samplingLocation ?? "");
    setWitness(initialValues?.witness ?? "");
    setWitnessPhone(initialValues?.witnessPhone ?? "");
    setInspector(initialValues?.inspector ?? "");
    setInspectorPhone(initialValues?.inspectorPhone ?? "");
    setSampleSource(initialValues?.sampleSource ?? "施工送检");
    setTestCategory(initialValues?.testCategory ?? "委托检验");
    setJudgmentBasis(initialValues?.judgmentBasis ?? []);
    setTestingBasis(initialValues?.testingBasis ?? []);
    setTestParameters(initialValues?.testParameters ?? []);
    setRemark(initialValues?.remark ?? "");
    setErrors({});
  }, [open, initialValues]);

  // 加载样品列表（仅编辑模式）
  const fetchSamples = useCallback(async () => {
    if (!initialValues?.id) return;
    setSamplesLoading(true);
    try {
      const res = await apiClient.get<{ items: Sample[] }>("/samples", {
        params: { receiptId: initialValues.id, page: 1, pageSize: 100 },
      });
      setSamples(res.data.items);
    } finally {
      setSamplesLoading(false);
    }
  }, [initialValues?.id]);

  useEffect(() => {
    if (mode === "edit" && initialValues?.id) {
      fetchSamples();
    }
  }, [mode, initialValues?.id, fetchSamples]);

  const openSampleCreate = () => {
    setSampleEditing(null);
    setSampleForm({
      ...emptySampleForm,
      sampleCode: `${commissionCode}-S${samples.length + 1}`,
    });
    setSampleExt({});
    setSampleFormOpen(true);
  };
  const openSampleEdit = (s: Sample) => {
    setSampleEditing(s);
    setSampleForm({
      sampleCode: s.sampleCode ?? "",
      sampleName: s.sampleName ?? "",
      model: s.model ?? "",
      specification: s.specification ?? "",
      grade: s.grade ?? "",
      brand: s.brand ?? "",
      manufacturer: s.manufacturer ?? "",
      structuralPart: s.structuralPart ?? "",
      representQuantity: s.representQuantity ?? "",
      sampleQuantity: s.sampleQuantity ?? "",
      batchNumber: s.batchNumber ?? "",
      supplyUnit: s.supplyUnit ?? "",
      arrivalDate: s.arrivalDate ?? "",
      samplingDate: s.samplingDate ?? "",
      curingCondition: s.curingCondition ?? "",
      age: s.age ?? "",
      remark: s.remark ?? "",
    });
    setSampleExt({ ...(s.ext ?? {}) });
    setSampleFormOpen(true);
  };
  const handleSampleSave = async () => {
    if (!initialValues?.id || !sampleForm.sampleCode.trim()) return;
    setSampleSaving(true);
    try {
      if (sampleEditing) {
        await apiClient.put(`/samples/${sampleEditing.id}`, {
          ...sampleForm,
          ext: sampleExt,
          receiptId: initialValues.id,
        });
      } else {
        await apiClient.post("/samples", {
          ...sampleForm,
          ext: sampleExt,
          receiptId: initialValues.id,
        });
      }
      setSampleFormOpen(false);
      await fetchSamples();
    } finally {
      setSampleSaving(false);
    }
  };
  const handleSampleDelete = async () => {
    if (!sampleDeleteTarget) return;
    setSampleDeleting(true);
    try {
      await apiClient.delete(`/samples/${sampleDeleteTarget.id}`);
      setSampleDeleteTarget(null);
      await fetchSamples();
    } finally {
      setSampleDeleting(false);
    }
  };

  if (!open) return null;

  const contract = contracts.find((c) => c.id === contractId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!contractId) nextErrors.contractId = "请选择合同";
    if (!categoryCode) nextErrors.categoryCode = "请选择报告类别";
    if (!commissionCode.trim()) nextErrors.commissionCode = "委托书编号必填";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit({
      id: initialValues?.id,
      contractId,
      categoryCode,
      commissionCode: commissionCode.trim(),
      commissionDate,
      projectName: contract?.projectName ?? "",
      clientUnit: contract?.clientUnit ?? "",
      buildingUnit: contract?.buildingUnit,
      supervisorUnit: contract?.supervisorUnit,
      constructionUnit: contract?.constructionUnit,
      witnessUnit: contract?.witnessUnit,
      samplingLocation: samplingLocation.trim() || undefined,
      witness: witness.trim() || undefined,
      witnessPhone: witnessPhone.trim() || undefined,
      inspector: inspector || contract?.inspectionPerson,
      inspectorPhone: inspectorPhone || contract?.inspectionPhone,
      receivedBy: currentUser?.displayName ?? "系统",
      sampleSource,
      testCategory,
      judgmentBasis: judgmentBasis.length > 0 ? judgmentBasis : undefined,
      testingBasis: testingBasis.length > 0 ? testingBasis : undefined,
      testParameters: testParameters.length > 0 ? testParameters : undefined,
      remark: remark.trim() || undefined,
    });
  };

  const toggleArrayItem = (
    arr: string[],
    setArr: (v: string[]) => void,
    item: string,
  ) => {
    if (arr.includes(item)) {
      setArr(arr.filter((i) => i !== item));
    } else {
      setArr([...arr, item]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-semibold">
            {mode === "create" ? "新建接样单" : "编辑接样单"}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4 text-sm">
            {/* 合同选择 + 报告类别 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="rf-contract"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  所属合同 *
                </label>
                <select
                  id="rf-contract"
                  value={contractId}
                  onChange={(e) => setContractId(e.target.value)}
                  className="w-full border rounded px-2 py-1.5"
                >
                  <option value="">请选择合同</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contractCode}　{c.projectName}
                    </option>
                  ))}
                </select>
                {errors.contractId && (
                  <p role="alert" className="text-red-600 text-xs mt-1">
                    {errors.contractId}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="rf-category"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  报告类别 *
                </label>
                <select
                  id="rf-category"
                  value={categoryCode}
                  onChange={(e) => {
                    setCategoryCode(e.target.value);
                    setJudgmentBasis([]);
                    setTestingBasis([]);
                    setTestParameters([]);
                  }}
                  disabled={mode === "edit"}
                  className="w-full border rounded px-2 py-1.5 disabled:bg-gray-100"
                >
                  <option value="">请选择报告类别</option>
                  {categories.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errors.categoryCode && (
                  <p role="alert" className="text-red-600 text-xs mt-1">
                    {errors.categoryCode}
                  </p>
                )}
              </div>
            </div>

            {/* 从合同带出的信息（只读） */}
            {contract && (
              <div className="bg-gray-50 rounded p-3 space-y-1 text-xs">
                <div className="grid grid-cols-2 gap-x-4">
                  <div>工程名称：{contract.projectName || "—"}</div>
                  <div>委托单位：{contract.clientUnit || "—"}</div>
                  <div>建设单位：{contract.buildingUnit || "—"}</div>
                  <div>监理单位：{contract.supervisorUnit || "—"}</div>
                  <div>施工单位：{contract.constructionUnit || "—"}</div>
                  <div>见证单位：{contract.witnessUnit || "—"}</div>
                  <div>见证人：{contract.witness || "—"}</div>
                  <div>见证人电话：{contract.witnessPhone || "—"}</div>
                  <div>送检人：{contract.inspectionPerson || "—"}</div>
                  <div>送检人电话：{contract.inspectionPhone || "—"}</div>
                </div>
              </div>
            )}

            {/* 委托书基本信息 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="rf-code"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  委托书编号*
                </label>
                <input
                  id="rf-code"
                  value={commissionCode}
                  onChange={(e) => setCommissionCode(e.target.value)}
                  placeholder="如 WT-2024-0801-01"
                  className="w-full border rounded px-2 py-1.5"
                />
                {errors.commissionCode && (
                  <p role="alert" className="text-red-600 text-xs mt-1">
                    {errors.commissionCode}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="rf-date"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  委托日期
                </label>
                <input
                  id="rf-date"
                  type="date"
                  value={commissionDate}
                  onChange={(e) => setCommissionDate(e.target.value)}
                  className="w-full border rounded px-2 py-1.5"
                />
              </div>
            </div>

            {/* 样品来源 + 检测类别 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="rf-source"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  样品来源
                </label>
                <select
                  id="rf-source"
                  value={sampleSource}
                  onChange={(e) => setSampleSource(e.target.value)}
                  className="w-full border rounded px-2 py-1.5"
                >
                  {SAMPLE_SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="rf-testcat"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  检测类别
                </label>
                <select
                  id="rf-testcat"
                  value={testCategory}
                  onChange={(e) => setTestCategory(e.target.value)}
                  className="w-full border rounded px-2 py-1.5"
                >
                  {TEST_CATEGORIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 取样地点 + 判定依据 + 检测依据 + 检测参数（4列） */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label
                  htmlFor="rf-sample-loc"
                  className="block text-xs font-medium text-gray-600 mb-1"
                >
                  取样地点
                </label>
                <input
                  id="rf-sample-loc"
                  value={samplingLocation}
                  onChange={(e) => setSamplingLocation(e.target.value)}
                  className="w-full border rounded px-2 py-1.5"
                />
              </div>
              {/* 判定依据 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  判定依据（多选）
                </label>
                <div className="grid grid-cols-3 gap-1 p-2 border rounded min-h-[60px] max-h-[120px] overflow-y-auto">
                  {filteredStandards.length === 0 && (
                    <span className="text-gray-400 text-xs">无可选标准</span>
                  )}
                  {filteredStandards.map((s) => (
                    <label
                      key={s.code}
                      className="flex items-center gap-1 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={judgmentBasis.includes(s.code)}
                        onChange={() =>
                          toggleArrayItem(judgmentBasis, setJudgmentBasis, s.code)
                        }
                      />
                      {s.code}
                    </label>
                  ))}
                </div>
              </div>
              {/* 检测依据 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  检测依据（多选）
                </label>
                <div className="grid grid-cols-3 gap-1 p-2 border rounded min-h-[60px] max-h-[120px] overflow-y-auto">
                  {filteredStandards.length === 0 && (
                    <span className="text-gray-400 text-xs">无可选标准</span>
                  )}
                  {filteredStandards.map((s) => (
                    <label
                      key={s.code}
                      className="flex items-center gap-1 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={testingBasis.includes(s.code)}
                        onChange={() =>
                          toggleArrayItem(testingBasis, setTestingBasis, s.code)
                        }
                      />
                      {s.code}
                    </label>
                  ))}
                </div>
              </div>
              {/* 检测参数 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  检测参数（按标准过滤）
                </label>
                <div className="grid grid-cols-3 gap-1 p-2 border rounded min-h-[60px] max-h-[120px] overflow-y-auto">
                  {filteredParameters.length === 0 && (
                    <span className="text-gray-400 text-xs">选择标准后显示</span>
                  )}
                  {filteredParameters.map((p) => (
                    <label
                      key={p.code}
                      className="flex items-center gap-1 text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={testParameters.includes(p.code)}
                        onChange={() =>
                          toggleArrayItem(testParameters, setTestParameters, p.code)
                        }
                      />
                      {p.code}-{p.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            {/* 备注 */}
            <div>
              <label
                htmlFor="rf-remark"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                备注
              </label>
              <input
                id="rf-remark"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full border rounded px-2 py-1.5"
              />
            </div>

            {/* 样品管理（仅编辑模式） */}
            {mode === "edit" && initialValues?.id && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">样品管理</span>
                  <button
                    type="button"
                    onClick={openSampleCreate}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"
                  >
                    新建样品
                  </button>
                </div>
                <table className="w-full text-xs border rounded overflow-hidden">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">样品编号</th>
                      <th className="px-3 py-2 text-left min-w-24">
                        型号/规格/等级/牌号
                      </th>
                      <th className="px-3 py-2 text-left">生产厂家</th>
                      <th className="px-3 py-2 text-left">结构部位</th>
                      <th className="px-3 py-2 text-left">代表数量</th>
                      <th className="px-3 py-2 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samplesLoading && samples.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-gray-400">
                          加载中...
                        </td>
                      </tr>
                    )}
                    {!samplesLoading && samples.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-gray-400">
                          暂无样品
                        </td>
                      </tr>
                    )}
                    {samples.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="px-3 py-2">{s.sampleCode}</td>
                        <td className="px-3 py-2">
                          {[s.model, s.specification, s.grade, s.brand]
                            .filter(Boolean)
                            .join(" / ") || "—"}
                        </td>
                        <td className="px-3 py-2">{s.manufacturer ?? "—"}</td>
                        <td className="px-3 py-2">{s.structuralPart ?? "—"}</td>
                        <td className="px-3 py-2">{s.representQuantity ?? "—"}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openSampleEdit(s)}
                            className="px-2 py-1 text-blue-600 hover:underline"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => setSampleDeleteTarget(s)}
                            className="px-2 py-1 text-red-600 hover:underline"
                          >
                            删除
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>

      {sampleFormOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <h3 className="text-lg font-semibold">
                {sampleEditing ? "编辑样品" : "新建样品"}
              </h3>
              <button
                onClick={() => setSampleFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    样品编号 *
                  </label>
                  <input
                    value={sampleForm.sampleCode}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, sampleCode: e.target.value })
                    }
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    样品名称
                  </label>
                  <input
                    value={sampleForm.sampleName}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, sampleName: e.target.value })
                    }
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    型号（可输入可选择）
                  </label>
                  <input
                    list="dl-model"
                    value={sampleForm.model}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, model: e.target.value })
                    }
                    placeholder={
                      sampleDicts.models.length > 0 ? "可输入或从列表选择" : "可输入"
                    }
                    className="w-full border rounded px-2 py-1.5"
                  />
                  <datalist id="dl-model">
                    {sampleDicts.models.map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    规格（可输入可选择）
                  </label>
                  <input
                    list="dl-spec"
                    value={sampleForm.specification}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, specification: e.target.value })
                    }
                    placeholder={
                      sampleDicts.specifications.length > 0
                        ? "可输入或从列表选择"
                        : "可输入"
                    }
                    className="w-full border rounded px-2 py-1.5"
                  />
                  <datalist id="dl-spec">
                    {sampleDicts.specifications.map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    等级（可输入可选择）
                  </label>
                  <input
                    list="dl-grade"
                    value={sampleForm.grade}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, grade: e.target.value })
                    }
                    placeholder={
                      sampleDicts.grades.length > 0 ? "可输入或从列表选择" : "可输入"
                    }
                    className="w-full border rounded px-2 py-1.5"
                  />
                  <datalist id="dl-grade">
                    {sampleDicts.grades.map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    牌号（可输入可选择）
                  </label>
                  <input
                    list="dl-brand"
                    value={sampleForm.brand}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, brand: e.target.value })
                    }
                    placeholder={
                      sampleDicts.brands.length > 0 ? "可输入或从列表选择" : "可输入"
                    }
                    className="w-full border rounded px-2 py-1.5"
                  />
                  <datalist id="dl-brand">
                    {sampleDicts.brands.map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    出厂编号/批号
                  </label>
                  <input
                    value={sampleForm.batchNumber}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, batchNumber: e.target.value })
                    }
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    生产厂家/产地
                  </label>
                  <input
                    value={sampleForm.manufacturer}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, manufacturer: e.target.value })
                    }
                    placeholder="如：沙钢集团、海螺水泥"
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    供销单位
                  </label>
                  <input
                    value={sampleForm.supplyUnit}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, supplyUnit: e.target.value })
                    }
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    进场日期
                  </label>
                  <input
                    type="date"
                    value={sampleForm.arrivalDate}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, arrivalDate: e.target.value })
                    }
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    结构部位
                  </label>
                  <input
                    value={sampleForm.structuralPart}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, structuralPart: e.target.value })
                    }
                    placeholder="如：一层柱A-3"
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    取（制）样日期
                  </label>
                  <input
                    type="date"
                    value={sampleForm.samplingDate}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, samplingDate: e.target.value })
                    }
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    养护条件
                  </label>
                  <input
                    value={sampleForm.curingCondition}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, curingCondition: e.target.value })
                    }
                    placeholder="如：标准养护"
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    龄期
                  </label>
                  <input
                    value={sampleForm.age}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, age: e.target.value })
                    }
                    placeholder="如：28d"
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    代表数量
                  </label>
                  <input
                    value={sampleForm.representQuantity}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, representQuantity: e.target.value })
                    }
                    placeholder="如：60t、200个"
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    样品数量
                  </label>
                  <input
                    value={sampleForm.sampleQuantity}
                    onChange={(e) =>
                      setSampleForm({ ...sampleForm, sampleQuantity: e.target.value })
                    }
                    placeholder="如 1 组 / 3 根"
                    className="w-full border rounded px-2 py-1.5"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  备注
                </label>
                <input
                  value={sampleForm.remark}
                  onChange={(e) =>
                    setSampleForm({ ...sampleForm, remark: e.target.value })
                  }
                  className="w-full border rounded px-2 py-1.5"
                />
              </div>

              {sampleExtDefs.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">扩展属性</p>
                  <div className="grid grid-cols-2 gap-3">
                    {sampleExtDefs.map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {f.label}
                        </label>
                        <input
                          value={sampleExt[f.key] ?? ""}
                          onChange={(e) =>
                            setSampleExt({ ...sampleExt, [f.key]: e.target.value })
                          }
                          className="w-full border rounded px-2 py-1.5"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50">
              <button
                onClick={() => setSampleFormOpen(false)}
                className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
              >
                取消
              </button>
              <button
                onClick={handleSampleSave}
                disabled={sampleSaving || !sampleForm.sampleCode.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {sampleSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={sampleDeleteTarget !== null}
        title="删除确认"
        message={`确定删除样品「${sampleDeleteTarget?.sampleCode ?? ""}」？`}
        confirmText="确认"
        loading={sampleDeleting}
        onConfirm={handleSampleDelete}
        onCancel={() => setSampleDeleteTarget(null)}
      />
    </div>
  );
}

export default ReceiptFormModal;
