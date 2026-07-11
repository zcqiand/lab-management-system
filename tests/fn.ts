import { describe, it } from "vitest";

/**
 * 声明该测试验证的功能子项 ID。
 *
 * 契约：被 skip 的测试不会执行，meta 就永远写不进去 —— 假绿在物理上不可能发生。
 * 这不是靠纪律，是靠机制。
 *
 *   fnTest(["M01.F01.I03"], "超出宽限判定为迟到", () => {
 *     it("具体行为", () => { ... });
 *   });
 *
 * 纪律部分（机器管不了的）：
 *   - 只在测试直接验证该子项可观察行为时才挂 ID
 *   - 间接受益不挂
 *   - 工程设施的测试不挂任何业务 ID
 *   - 一个测试挂 3 个以上 ID，通常说明它测得太宽
 *
 * fnTest 在 describe 内部调用 it()，把 ids 写入 task.meta.fn。
 * reporter 从 test.name 中解析出 ids 字符串。
 */
export function fnTest(ids: string[], name: string, body: () => void) {
  describe(name, () => {
    // 将 ids 编码到 describe 名称末尾，reporter 从名称解析
    // 格式: "[fn: M01.F01.I03,M01.F01.I04]"
    it("[fn: " + ids.join(",") + "]", body);
  });
}
