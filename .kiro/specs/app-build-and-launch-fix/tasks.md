# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - App Crashes with Incompatible Dependency Versions
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing case - React Native 0.81.5 + Expo SDK 54 + React 19.1.0 + expo-router 6.0.23 on Android
  - Test that building and launching the Android app with incompatible versions (React Native 0.81.5, Expo SDK ~54.0.32, React 19.1.0, expo-router ~6.0.23) results in a crash or version error
  - The test assertions should verify: app launches successfully, no version-related errors, UI renders correctly, frameworks initialize properly
  - Run test on UNFIXED code (current dependency versions)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: specific error messages from logcat, crash reports, peer dependency warnings
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Android and Non-Version-Dependent Features
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (web builds, UI rendering, Firebase auth, Capacitor features, styling)
  - Write property-based tests capturing observed behavior patterns:
    - Web build with Vite produces working application
    - React components render with same visual appearance
    - Firebase authentication flow works correctly
    - Radix UI components and Tailwind CSS styling render as expected
    - Capacitor native features function correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for React Native/Expo dependency version incompatibilities

  - [x] 3.1 Update package.json with compatible dependency versions
    - Upgrade React Native from 0.81.5 to 0.76.x (latest stable in 0.76 range)
    - Downgrade React from 19.1.0 to 18.x (latest stable in 18 range)
    - Downgrade react-dom from 19.1.0 to 18.x (matching React version)
    - Update @types/react from ~19.1.10 to ~18.x.x (matching React version)
    - Update @types/react-dom from ~19.1.7 to ~18.x.x (matching React version)
    - Verify Expo SDK ~54.0.32 is compatible with React Native 0.76.x
    - Verify expo-router ~6.0.23 is compatible with React Native 0.76.x
    - Verify react-native-safe-area-context ~5.6.0 is compatible with React Native 0.76.x
    - Verify react-native-screens ~4.16.0 is compatible with React Native 0.76.x
    - Verify react-native-web ^0.21.2 is compatible with React 18.x
    - Verify @react-native-async-storage/async-storage ^2.2.0 is compatible with React Native 0.76.x
    - _Bug_Condition: isBugCondition(input) where input.reactNativeVersion == "0.81.5" AND input.expoSdkVersion == "~54.0.32" AND input.reactVersion == "19.1.0" AND input.expoRouterVersion == "~6.0.23" AND input.platform == "android"_
    - _Expected_Behavior: App launches successfully, no version errors, UI renders, frameworks initialize correctly_
    - _Preservation: Web builds work, Capacitor features work, UI renders identically, Firebase auth works, styling unchanged_
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Install updated dependencies
    - Run npm install or yarn install to update lockfile
    - Verify no peer dependency warnings or conflicts
    - Check that all packages resolve to compatible versions
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - App Launches Successfully with Compatible Versions
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.4 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Android and Non-Version-Dependent Features
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
