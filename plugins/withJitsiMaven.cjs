const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withJitsiMaven = (config) => {
    return withDangerousMod(config, [
        'android',
        async (config) => {
            const buildGradlePath = path.join(config.modRequest.platformProjectRoot, 'build.gradle');
            if (!fs.existsSync(buildGradlePath)) {
                console.error('[withJitsiMaven] build.gradle not found at:', buildGradlePath);
                return config;
            }

            let contents = fs.readFileSync(buildGradlePath, 'utf-8');
            const jitsiRepo = 'https://github.com/jitsi/jitsi-maven-repository/raw/master/releases';
            const pinnedVersion = 'org.jitsi:webrtc:124.0.0';

            if (contents.includes(jitsiRepo) && contents.includes(pinnedVersion)) {
                return config;
            }

            console.log('[withJitsiMaven] Applying stabilization to:', buildGradlePath);

            const patch = `
// [STABILIZATION] Added by withJitsiMaven plugin
allprojects {
    repositories {
        maven { url "${jitsiRepo}" }
    }
    configurations.all {
        resolutionStrategy {
            force '${pinnedVersion}'
        }
    }
}
`;
            fs.writeFileSync(buildGradlePath, patch + contents);
            console.log('[withJitsiMaven] build.gradle updated via dangerous mod');
            return config;
        },
    ]);
};

module.exports = withJitsiMaven;
