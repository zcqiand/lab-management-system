import { defineConfig } from "vitest/config";
import FnReporter from "./tests/fnReporter";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    reporters: ["default", new FnReporter()],
  },
});
