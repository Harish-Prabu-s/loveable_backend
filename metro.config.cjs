const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('mjs', 'cjs');

const defaultResolveRequest = config.resolver.resolveRequest;

// Allow standard resolution, but fix the warning for event-target-shim/index
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // react-native-webrtc imports "event-target-shim/index" which is not in its exports map.
  // We resolve it to the main module export manually.
  if (moduleName === 'event-target-shim/index' || moduleName === 'event-target-shim/index.js') {
    return context.resolveRequest(context, 'event-target-shim', platform);
  }
  
  // Standard resolution for everything else
  return defaultResolveRequest ? defaultResolveRequest(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
