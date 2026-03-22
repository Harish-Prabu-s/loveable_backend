const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to patch MainApplication.kt for React Native 0.81.5 Old Architecture.
 * New Architecture (newArchEnabled) is disabled to ensure compatibility with:
 *   - react-native-worklets 0.5.1
 *   - react-native-vector-icons 10.x
 *   - react-native-webrtc 124.x
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

      // Fix 1: Remove bad ReactNativeApplicationEntryPoint import (old RN API)
      if (contents.includes('ReactNativeApplicationEntryPoint')) {
        contents = contents.replace(
          /import com\.facebook\.react\.ReactNativeApplicationEntryPoint\.loadReactNative\n?/g,
          ''
        );
        console.log('[withMainApplication] Removed ReactNativeApplicationEntryPoint import');
      }

      // Fix 2: Remove New Architecture specific imports (not needed without newArchEnabled)
      contents = contents.replace(/import com\.facebook\.react\.common\.ReleaseLevel\n?/g, '');
      contents = contents.replace(/import com\.facebook\.react\.defaults\.DefaultNewArchitectureEntryPoint\n?/g, '');
      // Remove the load import — not needed in Old Arch mode
      contents = contents.replace(/import com\.facebook\.react\.defaults\.DefaultNewArchitectureEntryPoint\.load\n?/g, '');

      // Fix 3: Add SoLoader import if missing
      if (!contents.includes('import com.facebook.soloader.SoLoader')) {
        contents = contents.replace(
          'import com.facebook.react.defaults.DefaultReactNativeHost',
          'import com.facebook.react.defaults.DefaultReactNativeHost\nimport com.facebook.soloader.SoLoader'
        );
        console.log('[withMainApplication] Added SoLoader import');
      }

      // Fix 4: Add WebRTCModulePackage import if missing
      if (!contents.includes('import com.oney.WebRTCModule.WebRTCModulePackage')) {
        contents = contents.replace(
          'import com.facebook.react.defaults.DefaultReactNativeHost',
          'import com.facebook.react.defaults.DefaultReactNativeHost\nimport com.oney.WebRTCModule.WebRTCModulePackage'
        );
        console.log('[withMainApplication] Added WebRTCModulePackage import');
      }

      // Fix 5: Replace old loadReactNative(this) call with SoLoader.init (Old Arch pattern)
      if (contents.includes('loadReactNative(this)')) {
        contents = contents.replace(
          /\s*DefaultNewArchitectureEntryPoint\.releaseLevel = try \{[\s\S]*?\} catch \(e: IllegalArgumentException\) \{[\s\S]*?\}\s*\n\s*loadReactNative\(this\)/,
          '\n    SoLoader.init(this, false)'
        );
        console.log('[withMainApplication] Replaced loadReactNative with SoLoader.init');
      }

      // Fix 6: Remove the entire IS_NEW_ARCHITECTURE_ENABLED block (not needed in Old Arch)
      // This removes "if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) { load(...) }" block
      contents = contents.replace(
        /\s*if \(BuildConfig\.IS_NEW_ARCHITECTURE_ENABLED\) \{[\s\S]*?load\(.*?\)[\s\S]*?\}/g,
        ''
      );
      console.log('[withMainApplication] Removed IS_NEW_ARCHITECTURE_ENABLED block');

      // Fix 7: Ensure SoLoader.init(this, false) is present in onCreate
      if (!contents.includes('SoLoader.init(this, false)')) {
        contents = contents.replace(
          'super.onCreate()',
          'super.onCreate()\n    SoLoader.init(this, false)'
        );
        console.log('[withMainApplication] Added SoLoader.init(this, false)');
      }

      // Fix 8: Catch-all — remove any remaining bad load(this,...) calls
      if (contents.includes('load(this,')) {
        contents = contents.replace(/load\(this,/g, 'load(true,');
        console.log('[withMainApplication] Replaced load(this,...) with load(true,...)');
      }

      // Fix 9: Manually add WebRTCModulePackage registration if missing
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
