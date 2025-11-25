import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        // JUnit-Report für Jenkins
        reporters: [
            'default',
            ['junit', { outputFile: 'reports/tests/junit.xml' }]
        ],

        // Coverage-Konfiguration
        coverage: {
            provider: 'v8',                 // benötigt @vitest/coverage-v8
            reportsDirectory: 'coverage',
            reporter: ['text', 'lcov', 'cobertura']
            // erzeugt u.a.:
            // coverage/lcov.info
            // coverage/cobertura-coverage.xml
        }
    }
})
