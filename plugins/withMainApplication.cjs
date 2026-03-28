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

      if (!contents.includes('import live.videosdk.rnwebrtc.WebRTCModulePackage')) {
        contents = contents.replace(
          /import com\.facebook\.react\.defaults\.DefaultReactNativeHost\s*?\n/,
          'import com.facebook.react.defaults.DefaultReactNativeHost\nimport live.videosdk.rnwebrtc.WebRTCModulePackage\n'
        );
        console.log('[withMainApplication] Added WebRTCModulePackage import');
      }

      if (!contents.includes('import live.videosdk.rnincallmanager.InCallManagerPackage')) {
        contents = contents.replace(
          /import com\.facebook\.react\.defaults\.DefaultReactNativeHost\s*?\n/,
          'import com.facebook.react.defaults.DefaultReactNativeHost\nimport live.videosdk.rnincallmanager.InCallManagerPackage\n'
        );
        console.log('[withMainApplication] Added InCallManagerPackage import');
      }

      // Add SoLoader if missing
      if (!contents.includes('import com.facebook.soloader.SoLoader')) {
        contents = contents.replace(
          /import com\.facebook\.react\.defaults\.DefaultReactNativeHost\s*?\n/,
          'import com.facebook.react.defaults.DefaultReactNativeHost\nimport com.facebook.soloader.SoLoader\n'
        );
      }

      // Robustly patch getPackages()
      if (!contents.includes('add(WebRTCModulePackage())')) {
        // Find PackageList(...).packages and add to it
        if (contents.includes('PackageList(this).packages')) {
           contents = contents.replace(
             /PackageList\(this\)\.packages/,
             'PackageList(this).packages.toMutableList().apply { add(WebRTCModulePackage()) }'
           );
        } else if (contents.includes('PackageList(this).getPackages()')) {
           contents = contents.replace(
             /PackageList\(this\)\.getPackages\(\)/,
             'PackageList(this).getPackages().toMutableList().apply { add(WebRTCModulePackage()) }'
           );
        }
        console.log('[withMainApplication] Manually registered WebRTCModulePackage');
      }

      if (!contents.includes('add(InCallManagerPackage())')) {
        if (contents.includes('add(WebRTCModulePackage())')) {
           contents = contents.replace(
             /add\(WebRTCModulePackage\(\)\)/,
             'add(WebRTCModulePackage()); add(InCallManagerPackage())'
           );
        }
        console.log('[withMainApplication] Manually registered InCallManagerPackage');
      }

      // Ensure SoLoader.init is in onCreate
      if (!contents.includes('SoLoader.init(this, false)')) {
        contents = contents.replace(
          /super\.onCreate\(\)/,
          'super.onCreate()\n    SoLoader.init(this, false)'
        );
      }

      fs.writeFileSync(mainApplicationPath, contents, 'utf8');
      console.log('[withMainApplication] MainApplication.kt patched successfully');
      return config;
    },
  ]);
};

module.exports = withMainApplication;
