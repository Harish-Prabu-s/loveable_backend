# App Build and Launch Fix - Bugfix Design

## Overview

The Android app crashes immediately on launch due to critical version incompatibilities in the React Native/Expo dependency stack. The root cause is React Native 0.81.5 being incompatible with Expo SDK 54 (requires 0.76.x), React 19.1.0 (requires 0.76.5+), and expo-router 6.x (requires 0.76.x+). The fix involves upgrading React Native to 0.76.x and downgrading React to 18.x to align all dependencies within their compatibility ranges, ensuring the app launches successfully while preserving web build functionality and existing features.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the app is built with incompatible dependency versions (React Native 0.81.5 + Expo SDK 54 + React 19.1.0)
- **Property (P)**: The desired behavior - the app launches successfully on Android without version-related crashes
- **Preservation**: Existing web build functionality, Capacitor native features, UI rendering, Firebase authentication, and styling that must remain unchanged
- **React Native**: The framework for building native mobile apps using React (currently 0.81.5, needs upgrade to 0.76.x)
- **Expo SDK**: Development platform and tooling for React Native apps (currently ~54.0.32, requires React Native 0.76.x)
- **expo-router**: File-based routing library for Expo apps (currently ~6.0.23, requires React Native 0.76.x+)
- **Dependency Alignment**: Ensuring all packages in the dependency tree have compatible version requirements

## Bug Details

### Fault Condition

The bug manifests when the Android app is built and launched with incompatible versions of React Native, Expo SDK, React, and expo-router. The build process completes but the resulting app crashes immediately after opening due to version mismatch errors during initialization.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type BuildConfiguration
  OUTPUT: boolean
  
  RETURN (input.reactNativeVersion == "0.81.5")
         AND (input.expoSdkVersion == "~54.0.32")
         AND (input.reactVersion == "19.1.0")
         AND (input.expoRouterVersion == "~6.0.23")
         AND (input.platform == "android")
         AND (input.buildType == "native")
END FUNCTION
```

### Examples

- **Example 1**: Building Android app with React Native 0.81.5 + Expo SDK 54 → App opens briefly then crashes with "Expo SDK 54 requires React Native 0.76.x" error
- **Example 2**: Initializing app with React 19.1.0 + React Native 0.81.5 → App crashes with "React Native 0.81.5 only supports React 18.x" error
- **Example 3**: Running expo-router 6.0.23 with React Native 0.81.5 → App fails to initialize routing with "expo-router 6.x requires React Native 0.76.x+" error
- **Edge Case**: Building for web platform with same versions → Web build works correctly (not affected by React Native version)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Web version builds and serves correctly through Vite
- Capacitor native features (camera, filesystem, etc.) continue to work
- React components and UI elements render with the same visual appearance and behavior
- Firebase authentication authenticates users correctly
- Radix UI components and Tailwind CSS styling render as expected

**Scope:**
All functionality that does NOT depend on the specific React Native version should be completely unaffected by this fix. This includes:
- Web builds using Vite (not React Native)
- UI component rendering and styling
- Application logic and state management
- Firebase integration
- Non-version-specific Capacitor features

## Hypothesized Root Cause

Based on the bug description and dependency analysis, the root causes are:

1. **React Native Version Too Old**: React Native 0.81.5 is incompatible with Expo SDK 54
   - Expo SDK 54 requires React Native 0.76.x or higher
   - The version gap (0.81.5 vs 0.76.x) suggests a versioning scheme issue or the 0.81.5 is actually older than 0.76.x

2. **React Version Too New**: React 19.1.0 is incompatible with React Native 0.81.5
   - React Native 0.81.5 only supports React 18.x
   - React 19 introduced breaking changes that require React Native 0.76.5+

3. **expo-router Version Incompatibility**: expo-router 6.0.23 requires React Native 0.76.x+
   - The current React Native 0.81.5 doesn't meet this requirement
   - This causes routing initialization failures

4. **Cascading Dependency Conflicts**: Multiple packages have conflicting peer dependency requirements
   - The combination creates an unsatisfiable dependency tree
   - Build tools may resolve to incompatible versions

## Correctness Properties

Property 1: Fault Condition - App Launches Successfully with Compatible Versions

_For any_ build configuration where compatible versions of React Native (0.76.x), Expo SDK (54), React (18.x), and expo-router (6.x) are used, the fixed dependency configuration SHALL allow the Android app to launch successfully without version-related crashes, initialize all frameworks correctly, and render the UI.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Non-Android and Non-Version-Dependent Features

_For any_ functionality that does NOT depend on the specific React Native version (web builds, UI rendering, Firebase auth, styling), the fixed dependency configuration SHALL produce exactly the same behavior as the original configuration, preserving all existing functionality for web platform, component rendering, and application logic.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `package.json`

**Dependencies to Update**:

**Specific Changes**:
1. **Upgrade React Native**: Change from 0.81.5 to 0.76.x (latest stable in 0.76 range)
   - This satisfies Expo SDK 54's requirement for React Native 0.76.x
   - This satisfies expo-router 6.x's requirement for React Native 0.76.x+
   - Check React Native 0.76 changelog for breaking changes

2. **Downgrade React and React DOM**: Change from 19.1.0 to 18.x (latest stable in 18 range)
   - React Native 0.76.x supports React 18.x
   - This resolves the React 19 incompatibility
   - Verify no React 19-specific features are used in codebase

3. **Verify Expo SDK Compatibility**: Keep Expo ~54.0.32 but verify it works with React Native 0.76.x
   - Check Expo SDK 54 documentation for exact React Native version requirements
   - May need to adjust to specific patch version (e.g., 0.76.5)

4. **Verify expo-router Compatibility**: Keep expo-router ~6.0.23 but verify it works with React Native 0.76.x
   - Confirm expo-router 6.0.23 supports React Native 0.76.x
   - Check for any routing-related breaking changes

5. **Update Related React Native Dependencies**: Update packages that depend on React Native version
   - `react-native-safe-area-context`: Verify ~5.6.0 is compatible with React Native 0.76.x
   - `react-native-screens`: Verify ~4.16.0 is compatible with React Native 0.76.x
   - `react-native-web`: Verify ^0.21.2 is compatible with React 18.x
   - `@react-native-async-storage/async-storage`: Verify ^2.2.0 is compatible with React Native 0.76.x

6. **Verify Type Definitions**: Update React type definitions to match React 18.x
   - `@types/react`: Change from ~19.1.10 to ~18.x.x
   - `@types/react-dom`: Change from ~19.1.7 to ~18.x.x

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, confirm the bug exists with current versions by attempting to build and launch the Android app, then verify the fix works correctly with updated versions and preserves existing functionality.

### Exploratory Fault Condition Checking

**Goal**: Confirm the bug exists with current dependency versions BEFORE implementing the fix. Document the exact error messages and failure modes.

**Test Plan**: Attempt to build and launch the Android app with the current dependency versions (React Native 0.81.5, Expo SDK 54, React 19.1.0, expo-router 6.0.23). Capture error logs and crash reports to confirm the root cause analysis.

**Test Cases**:
1. **Android Build Test**: Run `expo run:android` with current versions (will fail with version incompatibility errors)
2. **App Launch Test**: If build succeeds, launch the app on Android device/emulator (will crash immediately)
3. **Error Log Analysis**: Examine logcat output for version-related error messages (will show React Native/Expo version mismatch)
4. **Dependency Resolution Test**: Run `npm ls` to check for peer dependency warnings (will show conflicts)

**Expected Counterexamples**:
- App crashes on launch with "Expo SDK 54 requires React Native 0.76.x" error
- App fails to initialize with "React Native 0.81.5 only supports React 18.x" error
- Build warnings about peer dependency conflicts in npm/yarn output
- Possible causes: version mismatch, incompatible peer dependencies, breaking changes between versions

### Fix Checking

**Goal**: Verify that with compatible dependency versions, the Android app launches successfully and all frameworks initialize correctly.

**Pseudocode:**
```
FOR ALL buildConfig WHERE isBugCondition(buildConfig) == FALSE DO
  // buildConfig has compatible versions (RN 0.76.x, React 18.x, Expo 54, expo-router 6.x)
  result := buildAndLaunchApp(buildConfig)
  ASSERT result.buildSucceeds == TRUE
  ASSERT result.appLaunches == TRUE
  ASSERT result.noVersionErrors == TRUE
  ASSERT result.uiRenders == TRUE
END FOR
```

### Preservation Checking

**Goal**: Verify that functionality not dependent on React Native version continues to work exactly as before.

**Pseudocode:**
```
FOR ALL feature WHERE NOT dependsOnReactNativeVersion(feature) DO
  ASSERT fixedApp.behavior(feature) == originalApp.behavior(feature)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across different features and inputs
- It catches edge cases in UI rendering, state management, and navigation
- It provides strong guarantees that behavior is unchanged for web builds and non-version-dependent features

**Test Plan**: Test web build and core features with UNFIXED code first to establish baseline behavior, then verify identical behavior after dependency updates.

**Test Cases**:
1. **Web Build Preservation**: Build web version with `vite build` and verify it works identically (should be unchanged)
2. **UI Rendering Preservation**: Verify all Radix UI components and Tailwind styles render identically (should be unchanged)
3. **Firebase Auth Preservation**: Test login/logout flow and verify authentication works identically (should be unchanged)
4. **Capacitor Features Preservation**: Test native features (if any) and verify they work identically (should be unchanged)

### Unit Tests

- Test that package.json has correct dependency versions after update
- Test that React Native version is in 0.76.x range
- Test that React version is in 18.x range
- Test that all peer dependencies are satisfied
- Test that TypeScript types are compatible with React 18.x

### Property-Based Tests

- Generate random navigation flows and verify routing works correctly with updated expo-router
- Generate random component render scenarios and verify UI renders identically
- Generate random authentication flows and verify Firebase auth works correctly
- Test that web builds work across many different build configurations

### Integration Tests

- Test full Android build and launch flow with updated dependencies
- Test app initialization and verify all frameworks load correctly
- Test navigation between screens using expo-router
- Test that web build continues to work with Vite
- Test that both Android and web platforms work from same codebase
