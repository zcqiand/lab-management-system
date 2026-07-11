import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

interface TraceEntry {
  test: string;
  fns: string[];
  inert: boolean;
}

/** 从 test.name 中解析 [fn: M01.F01.I03,...] 后缀 */
function parseFnsFromName(name: string): string[] {
  const match = name.match(/\[fn: ([^\]]+)\]/);
  if (!match) return [];
  return match[1]!.split(",").map((s) => s.trim()).filter(Boolean);
}

/** 从 test.name 中提取原始描述（去掉 [fn: ...] 后缀） */
function cleanTestName(name: string): string {
  return name.replace(/\s*\[fn: [^\]]+\]/, "");
}

function emit(tests: TraceEntry[]): void {
  const out = ".state/trace.json";
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({ schema: 1, tests }, null, 2) + "\n");
}

/**
 * vitest 适配器：把 fnTest 的标记落成 suite 契约的 .state/trace.json。
 *
 * fnTest 将功能 ID 编码在 test.name 的 [fn: ...] 后缀中，
 * reporter 从 test.name 解析（避免 task.meta 耦合）。
 *
 * 契约：skipped 测试的 fns 必须为空数组。
 * 被 skip 的测试不会执行，meta 永远写不进去 —— 假绿在物理上不可能。
 */
export default class FnReporter {
  private tests: TraceEntry[] = [];

  /** vitest 2.x / 1.x */
  onFinished(
    files: ReadonlyArray<{
      testResults: ReadonlyArray<{
        fullName: string;
        title: string;
        status: string;
      }>;
    }>,
    _errors: ReadonlyArray<unknown>,
  ): void {
    if (process.env.TRACE_MAP !== "1") return;
    this.tests = [];
    for (const file of files) {
      for (const result of file.testResults ?? []) {
        const inert = result.status === "skipped";
        const rawName = result.fullName || result.title;
        const fns = inert ? [] : parseFnsFromName(rawName);
        const testName = cleanTestName(rawName);
        this.tests.push({
          test: testName,
          fns,
          inert,
        });
      }
    }
    emit(this.tests);
  }

  /** vitest >= 3 / v4 — called after each test run end */
  onTestRunEnd(
    testModules: readonly {
      moduleId: string;
      children: {
        allTests(): Iterable<{
          name: string;
          result(): { state: string };
        }>;
      };
    }[],
    _unhandledErrors: readonly unknown[],
    _reason: unknown,
  ): void {
    if (process.env.TRACE_MAP !== "1") return;
    const tests: TraceEntry[] = [];
    for (const mod of testModules) {
      for (const t of mod.children.allTests()) {
        const inert = t.result().state === "skipped";
        const rawName = t.name;
        const fns = inert ? [] : parseFnsFromName(rawName);
        const testName = cleanTestName(rawName);
        tests.push({
          test: `${mod.moduleId}::${testName}`,
          fns,
          inert,
        });
      }
    }
    emit(tests);
  }
}
