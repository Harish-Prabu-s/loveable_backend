const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to patch MainApplication.kt for React Native 0.79 compatibility.
 * Replaces the removed ReactNativeApplicationEntryPoint.loadReactNative API
 * with SoLoader.init() which is the correct RN 0.79 pattern.
 */
const withMainApplication = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const mainApplicationPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'java',
        'com',
        'loveable',
        'loveableapp',
        'MainApplication.kt'
      );

      if (!fs.existsSync(mainApplicationPath)) {
        console.warn('[withMainApplication] MainApplication.kt not found at:', mainApplicationPath);
        return config;
      }

      let contents = fs.readFileSync(mainApplicationPath, 'utf8');

      // Fix 1: Remove the bad import
      if (contents.includes('ReactNativeApplicationEntryPoint')) {
        contents = contents.replace(
          /import com\.facebook\.react\.ReactNativeApplicationEntryPoint\.loadReactNative\n?/g,
          ''
        );
        console.log('[withMainApplication] Removed ReactNativeApplicationEntryPoint import');
      }

      // Fix 2: Add SoLoader import if not already present
      if (!contents.includes('import com.facebook.soloader.SoLoader')) {
        contents = contents.replace(
          'import com.facebook.react.defaults.DefaultReactNativeHost',
          'import com.facebook.react.defaults.DefaultReactNativeHost\nimport com.facebook.soloader.SoLoader\nimport com.oney.WebRTCModule.WebRTCModulePackage'
        );
        console.log('[withMainApplication] Added SoLoader and WebRTCModulePackage imports');
      }

      // Fix 3: Replace the bad ReleaseLevel block + loadReactNative call with SoLoader.init
      if (contents.includes('loadReactNative(this)')) {
        contents = contents.replace(
          /\s*DefaultNewArchitectureEntryPoint\.releaseLevel = try \{[\s\S]*?\} catch \(e: IllegalArgumentException\) \{[\s\S]*?\}\s*\n\s*loadReactNative\(this\)/,
          '\n    SoLoader.init(this, false)\n    if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {\n      // Disabling Bridgeless mode for stability in 0.81.5\n      load(true, true, false)\n    }'
        );
        console.log('[withMainApplication] Replaced loadReactNative with SoLoader.init (Bridgeless disabled)');
      }

      // Fix 4: Remove ReleaseLevel and DefaultNewArchitectureEntryPoint imports (non-.load version)
      contents = contents.replace(
        /import com\.facebook\.react\.common\.ReleaseLevel\n?/g,
        ''
      );
      contents = contents.replace(
        /import com\.facebook\.react\.defaults\.DefaultNewArchitectureEntryPoint\n?/g,
        ''
      );

      // Fix 5: Ensure DefaultNewArchitectureEntryPoint.load is imported
      if (!contents.includes('DefaultNewArchitectureEntryPoint.load')) {
        contents = contents.replace(
          'import com.facebook.react.defaults.DefaultReactNativeHost',
          'import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load\nimport com.facebook.react.defaults.DefaultReactNativeHost'
        );
        console.log('[withMainApplication] Added DefaultNewArchitectureEntryPoint.load import');
      }

      // Fix 6: Manually add WebRTCModulePackage if autolinking fails
      if (!contents.includes('add(WebRTCModulePackage())')) {
        contents = contents.replace(
          '// add(MyReactNativePackage())',
          '// add(MyReactNativePackage())\n              add(WebRTCModulePackage())'
        );
        console.log('[withMainApplication] Manually registered WebRTCModulePackage');
      }

      fs.writeFileSync(mainApplicationPath, contents, 'utf8');
      console.log('[withMainApplication] MainApplication.kt patched successfully');
      return config;
    },
  ]);
};

module.exports = withMainApplication;
