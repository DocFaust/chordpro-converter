
import sonarScanner from 'sonarqube-scanner';
import dotenv from 'dotenv';
dotenv.config();
const run = () => {
    sonarScanner.default(
        {
            serverUrl: 'https://sonar.faustens.de',
            token: process.env.SONAR_TOKEN,
            options: {
                'sonar.host.url': 'https://sonar.faustens.de',
                'sonar.login': process.env.SONAR_TOKEN,
                'sonar.verbose': true,
                'sonar.projectKey': 'chordpro-converter',
                'sonar.projectName': 'chordpro-converter',
                'sonar.sources': 'src',
                'sonar.tests': 'src',
                'sonar.inclusions': 'src/**/*',
                'sonar.test.inclusions': 'src/**/*.test.ts,src/**/*.spec.ts',
                'sonar.typescript.lcov.reportPaths': 'coverage/lcov.info',
                'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
            },
        },
        () => {
            console.log('SonarQube scan complete');
        }
    );
};

run();
