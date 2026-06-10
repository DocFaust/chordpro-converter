import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "happy-dom",
        setupFiles: ["./test/setup.js"],
        reporters: [
            "default",
            ["junit", { outputFile: "reports/tests/junit.xml" }],
        ],
        coverage: {
            provider: "v8",
            reportsDirectory: "coverage",
            enabled: true,
            reporter: ["text", "lcov", "cobertura", "clover"],
            include: ["src/**/*.{js,jsx}"],
            exclude: [
                "src/main.jsx",
                "src/convertToChordPro.js",
            ],
            thresholds: {
                lines: 80,
                branches: 80,
                functions: 80,
                statements: 80,
            },
        },
    },
});
