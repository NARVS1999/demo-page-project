import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["__tests__/setup-env.ts"],
  },
  resolve: {
    // vitest 4.1.10 crashes at import time on the real "server-only" package;
    // alias to a stub so lib/session.ts and lib/db.ts import cleanly under test.
    alias: {
      "server-only": fileURLToPath(
        new URL("./__tests__/server-only-stub.ts", import.meta.url),
      ),
    },
  },
});
