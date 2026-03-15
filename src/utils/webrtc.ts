// This file acts as the default if neither .web nor .native are picked up.
// Metro bundler will automatically select webrtc.web.ts or webrtc.native.ts
// based on the platform.
// @ts-ignore - Metro bundler handles `.web.ts` and `.native.ts` automatically, ignoring TS extension resolution quirks
export * from './webrtc.web'; // Fallback to web mock for non-native environments if needed
