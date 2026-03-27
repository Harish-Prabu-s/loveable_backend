const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const GRADLE_VERSION = '8.14.3';

const withGradleWrapper = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const platformRoot = config.modRequest.platformProjectRoot;

      // 1. Update Gradle version (fixes FoojayPlugin + Kotlin 2.1.20 compatibility)
      const wrapperPath = path.join(platformRoot, 'gradle', 'wrapper', 'gradle-wrapper.properties');
      if (fs.existsSync(wrapperPath)) {
        let contents = fs.readFileSync(wrapperPath, 'utf-8');
        const distributionUrl = `distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip`;
        if (!contents.includes(`gradle-${GRADLE_VERSION}`)) {
          contents = contents.replace(/distributionUrl=.*/, distributionUrl);
          fs.writeFileSync(wrapperPath, contents);
          console.log(`[withGradleWrapper] Set Gradle to ${GRADLE_VERSION}`);
        }
      }

      // 2. Ensure gradle.properties is not overriden with hardcoded newArchEnabled
      // We removed the forced newArchEnabled=true to allow expo-build-properties to work.

      // 3. Add REACT_NATIVE_NODE_MODULES_DIR for worklets resolveReactNativeDirectory
      const appBuildPath = path.join(platformRoot, 'app', 'build.gradle');
      if (fs.existsSync(appBuildPath)) {
        let appBuild = fs.readFileSync(appBuildPath, 'utf-8');
        const extBlock = "ext.REACT_NATIVE_NODE_MODULES_DIR = file(\"$rootDir/../node_modules/react-native\")";
        if (!appBuild.includes('REACT_NATIVE_NODE_MODULES_DIR')) {
          appBuild = "// [withGradleWrapper] For react-native-worklets\n" + extBlock + "\n\n" + appBuild;
          fs.writeFileSync(appBuildPath, appBuild);
          console.log('[withGradleWrapper] Set REACT_NATIVE_NODE_MODULES_DIR');
        }
      }

      return config;
    },
  ]);
};

module.exports = withGradleWrapper;
