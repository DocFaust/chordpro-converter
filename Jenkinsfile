pipeline {
    agent any
    triggers {
        // 1x täglich irgendwann zwischen 08:00 und 08:59
        cron('H 8 * * *')
    }
    tools {
        nodejs "nodejs"
    }
    environment {
        NVDAPIKEY = credentials('nvd-api-key') // API key from Jenkins credentials
        SONAR_TOKEN = credentials('My Sonar')
        DEP_CHECK_FILE = 'dependency-check-last-run.txt'
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
        stage('Dependency Check') {
                            when {
                                expression {
                                    def runCheck = true
                                    if (fileExists(env.DEP_CHECK_FILE)) {
                                        def lastRun = readFile(env.DEP_CHECK_FILE).trim()
                                        def lastRunTime = lastRun as long
                                        def currentTime = System.currentTimeMillis()
                                        def timeDifference = currentTime - lastRunTime
                                        // 86400000 milliseconds = 24 hours
                                        runCheck = timeDifference > 86400000
                                    }
                                    return runCheck
                                }
                            }
                            steps {
                                sh 'mkdir -p dependency-check-bin' // Ensure directory exists
                                sh 'npm run owasp' // Run OWASP Dependency Check
                                script {
                                    // Update the last run timestamp
                                    writeFile(file: env.DEP_CHECK_FILE, text: "${System.currentTimeMillis()}")
                                }
                            }
                            post {
                                success {
                                    dependencyCheckPublisher pattern: 'dependency-check-report.xml' // Publish dependency check report
                                }
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
            recordCoverage(tools: [[parser: 'CLOVER', path: 'coverage/clover.xml']])
             mail to: 'werner@docfaust.de',
                             subject: "Build ${env.JOB_NAME} #${env.BUILD_NUMBER} status",
                             body: "The build ${env.JOB_NAME} #${env.BUILD_NUMBER} has completed. Check the status at ${env.BUILD_URL}."
        }
        unstable {
            mail to: 'werner@docfaust.de',
                 subject: "Build ${env.JOB_NAME} #${env.BUILD_NUMBER} is unstable",
                 body: "The build ${env.JOB_NAME} #${env.BUILD_NUMBER} is unstable. Check the details at ${env.BUILD_URL}."
        }
        failure {
            mail to: 'werner@docfaust.de',
                 subject: "Build ${env.JOB_NAME} #${env.BUILD_NUMBER} failed",
                 body: "The build ${env.JOB_NAME} #${env.BUILD_NUMBER} has failed. Check the details at ${env.BUILD_URL}."
        }
    }
}
