pipeline {
    agent any

    tools {
        nodejs "nodejs"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        stage('Security Audit') {
            steps {
                script {
                    // Ordner für Reports anlegen
                    sh 'mkdir -p reports/npm-audit'

                    // npm audit laufen lassen, aber den Build NICHT abbrechen
                    // --omit=dev: nur prod-Dependencies (optional)
                    // --audit-level=high: nur hohe/critical Issues (optional)
                    sh '''
                        npm audit --omit=dev --audit-level=high --json > reports/npm-audit/npm-audit.json || true
                    '''
                }
            }
        }

        stage('Lint') {
            steps {
                script {
                    // Lint-Fehler sollen den Build NICHT komplett abbrechen,
                    // aber den Build-Status auf UNSTABLE setzen.
                    catchError(buildResult: 'UNSTABLE', stageResult: 'FAILURE') {
                        sh 'npm run lint:ci'
                    }
                }
            }
        }

        stage('Run Tests (with coverage)') {
            steps {
                sh 'npm run test:ci'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Archive Artifact') {
            steps {
                archiveArtifacts artifacts: 'dist/**', fingerprint: true
            }
        }
    }

    post {
        always {
            // ✅ Vitest JUnit-Reports (mit allowEmptyResults, damit kein Fehler fliegt)
            junit testResults: 'reports/tests/*.xml', allowEmptyResults: true

            // ✅ ESLint-JSON ins Warnings-NG-Plugin
            recordIssues tools: [
                esLint(pattern: 'reports/eslint/eslint.json'),
                npmAudit(pattern: 'reports/npm-audit/npm-audit.json')
            ]

            // ✅ Coverage (falls du schon Cobertura aus Vitest erzeugst)
            // publishCoverage brauchst du nur, wenn das Coverage-Plugin installiert ist
            // und du z.B. coverage/cobertura-coverage.xml aus Vitest hast.
            // Beispiel:
            publishCoverage adapters: [
                coberturaAdapter('coverage/cobertura-coverage.xml')
            ], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
        }
    }
}
