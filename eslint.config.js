import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * 能被机器判定的性能规则一律落在这里，不留在 markdown。
 * 提示词里的禁令靠自觉，eslint 里的禁令靠 exit code。
 *
 * 每条规则后面标注它对应 Vercel 规则集的哪一条。
 * 判断类的规则（瀑布流、bundle 拆分、memo 边界）eslint 看不见，
 * 它们在 .claude/skills/react-perf/ 与 docs/conventions/react-perf.md。
 */
export default tseslint.config(
  { ignores: ["dist", "node_modules", "coverage"] },
  ...tseslint.configs.recommended,
  {
    plugins: { react, "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      // 项目 CLAUDE.md 的硬约束
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",

      // rerender-no-inline-components
      "react/no-unstable-nested-components": "error",

      // rerender-dependencies / advanced-effect-event-deps
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // bundle-barrel-imports：直接导入，别走 barrel
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/index", "**/index.ts", "**/index.tsx"],
              message:
                "bundle-barrel-imports: 直接导入具体模块，barrel 文件会把整个目录拖进 bundle。",
            },
            {
              group: ["lodash", "@mui/icons-material", "date-fns"],
              message:
                "bundle-barrel-imports: 从子路径导入，如 lodash/debounce。",
            },
          ],
        },
      ],

      // js-tosorted-immutable / rendering-conditional-render 等靠 code review
    },
  },
  {
    // 适配器与配置文件不受业务规则约束，但仍禁 any
    files: ["tests/fnReporter.ts", "tests/fn.ts", "vitest.config.ts"],
    rules: {
      "react-hooks/exhaustive-deps": "off",
      // vitest 的 onTestRunEnd 签名固定要这几个参数，即使不用也要声明
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },
);
