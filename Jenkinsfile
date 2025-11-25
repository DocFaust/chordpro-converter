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

        stage('Lint') {
            steps {
                sh 'npm run lint:ci'
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
            // ✅ Test-Reports (Vitest → JUnit)
            junit 'reports/tests/*.xml'

            // ✅ Lint-Warnungen (ESLint → JUnit XML)
            // Warnings Next Generation Plugin notwendig
            recordIssues tools: [eslint(pattern: 'reports/eslint/*.xml')]

            // ✅ Coverage (Cobertura XML aus Vitest)
            // Coverage Plugin (Code Coverage API) notwendig
            publishCoverage adapters: [
                coberturaAdapter('coverage/cobertura-coverage.xml')
            ], sourceFileResolver: sourceFiles('STORE_LAST_BUILD')
        }
    }
}
