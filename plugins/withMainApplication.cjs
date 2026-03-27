const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to patch MainApplication.kt for React Native 0.81.5.
 * Handles both Old and New Architecture based on config.
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

      // Fix 4: Add WebRTCModulePackage import if missing OR REPLACE OLD ONE
      if (contents.includes('import com.oney.WebRTCModule.WebRTCModulePackage')) {
        contents = contents.replace(
          'import com.oney.WebRTCModule.WebRTCModulePackage',
          'import live.videosdk.rnwebrtc.WebRTCModulePackage'
        );
        console.log('[withMainApplication] Replaced OLD WebRTCModulePackage import with VideoSDK one');
      }

      if (!contents.includes('import live.videosdk.rnwebrtc.WebRTCModulePackage')) {
        contents = contents.replace(
          'import com.facebook.react.defaults.DefaultReactNativeHost',
          'import com.facebook.react.defaults.DefaultReactNativeHost\nimport live.videosdk.rnwebrtc.WebRTCModulePackage'
        );
        console.log('[withMainApplication] Added WebRTCModulePackage import (VideoSDK)');
      }

      // Fix 4.1: Add InCallManagerPackage import if missing
      if (!contents.includes('import live.videosdk.rnincallmanager.InCallManagerPackage')) {
        contents = contents.replace(
          'import com.facebook.react.defaults.DefaultReactNativeHost',
          'import com.facebook.react.defaults.DefaultReactNativeHost\nimport live.videosdk.rnincallmanager.InCallManagerPackage'
        );
        console.log('[withMainApplication] Added InCallManagerPackage import (VideoSDK)');
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

      // Fix 6.1: Remove isNewArchEnabled and isBridgelessEnabled overrides
      contents = contents.replace(/override val isNewArchEnabled: Boolean = [\s\S]*?\n/g, '');
      contents = contents.replace(/override val isBridgelessEnabled: Boolean = [\s\S]*?\n/g, '');
      console.log('[withMainApplication] Removed isNewArchEnabled and isBridgelessEnabled overrides');

      // Fix 7: Ensure SoLoader.init(this, false) is present in onCreate
      if (!contents.includes('SoLoader.init(this, false)')) {
        contents = contents.replace(
          'super.onCreate()',
          'super.onCreate()\n    SoLoader.init(this, false)'
        );
        console.log('[withMainApplication] Added SoLoader.init(this, false)');
      }

      // Fix 8: Catch-all — ensure load(...) call exists if needed and has correct signature
      // RN 0.81 signature is often load(newArchEnabled, bridgelessEnabled) OR load(context, newArch, bridge)
      // If we see the error "MainApplication but Boolean expected", it wants Boolean first.
      if (contents.includes('load(this,')) {
        contents = contents.replace(/load\(this,\s*/g, 'load(');
        console.log('[withMainApplication] Removed "this" from load call');
      }

      // Fix 9: Manually add WebRTCModulePackage registration if missing
      if (!contents.includes('add(WebRTCModulePackage())')) {
        contents = contents.replace(
          '// add(MyReactNativePackage())',
          '// add(MyReactNativePackage())\n              add(WebRTCModulePackage())'
        );
        console.log('[withMainApplication] Manually registered WebRTCModulePackage');
      }

      // Fix 9.1: Manually add InCallManagerPackage registration if missing
      if (!contents.includes('add(InCallManagerPackage())')) {
        if (contents.includes('add(WebRTCModulePackage())')) {
             contents = contents.replace(
               'add(WebRTCModulePackage())',
               'add(WebRTCModulePackage())\n              add(InCallManagerPackage())'
             );
        } else {
             // In RN 0.81.5, we use .packages.toMutableList().apply
             contents = contents.replace(
               /\.packages\.apply\s*\{/g,
               '.packages.toMutableList().apply {'
             );
             contents = contents.replace(
               /\.packages\.toMutableList\(\)\.apply\s*\{/,
               '.packages.toMutableList().apply {\n              add(InCallManagerPackage())'
             );
        }
        console.log('[withMainApplication] Manually registered InCallManagerPackage');
      }


      fs.writeFileSync(mainApplicationPath, contents, 'utf8');
      console.log('[withMainApplication] MainApplication.kt patched successfully');
      return config;
    },
  ]);
};

module.exports = withMainApplication;
