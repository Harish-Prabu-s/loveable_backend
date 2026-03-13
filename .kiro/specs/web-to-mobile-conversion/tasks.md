# Implementation Plan: Web to Mobile Conversion

## Overview

This implementation plan converts a fully functional web-based social connection application to React Native (Expo). The conversion involves transforming 11 web pages with web-specific code into native mobile screens using React Native components, Expo Router navigation, and mobile-native patterns. The app includes authentication, real-time chat, voice/video calling, wallet system, games, stories, and social features.

## Technology Stack

- React Native with Expo SDK 54
- TypeScript
- Expo Router (file-based navigation)
- Zustand (state management)
- AsyncStorage (persistence)
- StyleSheet API (styling)
- Axios (HTTP client)
- expo-image-picker, expo-av (media)
- expo-local-authentication (biometric)
- WebRTC (voice/video calls)

## Tasks

- [ ] 1. Set up core infrastructure and project structure
  - Create folder structure: app/(auth), app/(tabs), app/onboarding, components/ui, services/, store/, lib/
  - Configure Expo Router with proper layouts
  - Set up TypeScript configuration
  - Install and configure required dependencies (Zustand, AsyncStorage, Axios, expo-image, expo-av, expo-local-authentication)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [ ] 2. Create reusable UI components
  - [ ] 2.1 Create Button component with variants (primary, secondary, outline, ghost, danger)
    - Use Pressable for touch interactions with pressed state
    - Support loading state with ActivityIndicator
    - Add haptic feedback on press
    - Support icon + text combinations
    - _Requirements: 19.3, 19.4, 19.11_

  - [ ] 2.2 Create Input component with validation support
    - Use TextInput with custom styling
    - Support error message display
    - Add show/hide password toggle for secure inputs
    - Handle keyboard avoiding behavior
    - Support left/right icons
    - _Requirements: 19.5, 19.6, 21.1_

  - [ ] 2.3 Create Card component with elevation variants
    - Use View with shadow styles
    - Support pressable cards
    - Apply theme-aware background colors
    - _Requirements: 19.9_

  - [ ] 2.4 Create Avatar component with fallback and badges
    - Use expo-image for optimized loading
    - Show initials fallback if no image
    - Display online indicator badge
    - Support custom badge overlay
    - _Requirements: 20.3_

  - [ ] 2.5 Create Badge, Spinner, and ErrorMessage components
    - Badge: position absolutely, show dot or count, limit to 99+
    - Spinner: use ActivityIndicator, support fullScreen mode
    - ErrorMessage: display error icon, message, and optional retry button
    - _Requirements: 19.7, 19.8, 21.2_


- [ ] 3. Implement storage layer and utilities
  - [ ] 3.1 Create AsyncStorage wrapper (lib/storage.ts)
    - Implement getItem, setItem, removeItem, clear methods
    - Add JSON serialization/deserialization
    - Add error handling and logging
    - Implement getMultiple and setMultiple for batch operations
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [ ]* 3.2 Write property test for storage round-trip integrity
    - **Property 1: Storage Round-Trip Integrity**
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 3.3 Write property test for storage removal completeness
    - **Property 2: Storage Removal Completeness**
    - **Validates: Requirements 3.3**

  - [ ]* 3.4 Write property test for storage clear totality
    - **Property 3: Storage Clear Totality**
    - **Validates: Requirements 3.4**

  - [ ]* 3.5 Write property test for storage error resilience
    - **Property 4: Storage Error Resilience**
    - **Validates: Requirements 3.6**

  - [ ] 3.6 Create storage keys constants (constants/storageKeys.ts)
    - Define all storage keys for auth, settings, wallet, chat, cache
    - Use consistent naming convention with @ prefix
    - _Requirements: 3.1, 3.2_

- [ ] 4. Set up state management with Zustand
  - [ ] 4.1 Create authStore with persistence
    - Define AuthState interface (user, token, isAuthenticated, isLoading)
    - Implement login, verifyOTP, logout, updateProfile, checkAuth actions
    - Configure persistence to AsyncStorage for user and token
    - _Requirements: 5.6, 5.7, 5.8, 26.1, 26.2, 26.3_

  - [ ] 4.2 Create walletStore with persistence
    - Define WalletState interface (balance, transactions, isLoading)
    - Implement fetchBalance, fetchTransactions, purchaseCoins actions
    - Configure persistence for balance caching
    - _Requirements: 11.1, 11.8, 26.2, 26.4, 26.7_

  - [ ] 4.3 Create chatStore for messaging state
    - Define ChatState interface (conversations, activeChat, messages, isTyping)
    - Implement fetchConversations, fetchMessages, sendMessage, setTyping actions
    - Configure persistence for conversations caching
    - _Requirements: 9.1, 9.2, 9.3, 26.2, 26.7_

  - [ ] 4.4 Create settingsStore with persistence
    - Define SettingsState interface (theme, language, notifications, appLock settings)
    - Implement toggleTheme, setLanguage, toggleNotifications, enableAppLock, disableAppLock actions
    - Configure persistence for all settings
    - _Requirements: 16.3, 16.4, 16.5, 16.10, 26.2, 26.4_

- [ ] 5. Configure API client and services
  - [ ] 5.1 Create API client with interceptors (api/client.ts)
    - Configure axios with base URL and timeout
    - Add request interceptor to include auth token in headers
    - Add response interceptor for error handling (401, 403, 404, 500)
    - Implement automatic logout on 401
    - _Requirements: 18.1, 18.2, 18.3, 18.5, 18.6, 18.7, 18.8, 18.9_

  - [ ]* 5.2 Write property test for API authentication header inclusion
    - **Property 26: API Authentication Header Inclusion**
    - **Validates: Requirements 18.3**

  - [ ]* 5.3 Write property test for API response parsing
    - **Property 27: API Response Parsing**
    - **Validates: Requirements 18.4**

  - [ ]* 5.4 Write property test for API error status handling
    - **Property 28: API Error Status Handling**
    - **Validates: Requirements 18.5, 18.6, 18.7, 18.8, 18.9**

  - [ ] 5.5 Create retry logic utility (lib/retry.ts)
    - Implement retryRequest function with exponential backoff
    - Configure max retries (3) and delay (1000ms)
    - _Requirements: 18.11_

  - [ ]* 5.6 Write property test for API request retry
    - **Property 29: API Request Retry**
    - **Validates: Requirements 18.11**

  - [ ] 5.7 Create API caching utility (lib/cache.ts)
    - Implement APICache class with set, get, clear methods
    - Support TTL (time-to-live) for cache entries
    - Automatically expire stale cache entries
    - _Requirements: 20.4_

  - [ ]* 5.8 Write property test for API response caching
    - **Property 31: API Response Caching**
    - **Validates: Requirements 20.4**

- [ ] 6. Implement theme system and styling utilities
  - [ ] 6.1 Create theme configuration (constants/theme.ts)
    - Define lightTheme with colors, spacing, borderRadius, fontSize, fontWeight, shadows
    - Define darkTheme with adjusted colors
    - Export Theme type
    - _Requirements: 16.3, 19.10_

  - [ ] 6.2 Create common style utilities (lib/styles.ts)
    - Define common styles: flex, layout, spacing, text, borders, shadows
    - Make utilities theme-aware
    - _Requirements: 19.9_

  - [ ] 6.3 Create responsive design utilities (lib/responsive.ts)
    - Get device dimensions and platform
    - Implement scale and fontSize functions for responsive sizing
    - Detect device size categories (small, medium, large)
    - _Requirements: 19.2, 19.3_

- [ ] 7. Checkpoint - Ensure infrastructure is complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 8. Implement authentication screens
  - [ ] 8.1 Create login screen (app/(auth)/login.tsx)
    - Convert from pages/LoginPage.tsx
    - Replace div → View, span/p → Text, button → Pressable, input → TextInput
    - Use SafeAreaView and KeyboardAvoidingView
    - Implement phone/email input with validation
    - Add "Send OTP" button with loading state
    - Integrate with authStore.login()
    - Navigate to OTP screen on success
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 5.1, 5.2_

  - [ ] 8.2 Create OTP verification screen (app/(auth)/otp.tsx)
    - Convert from pages/OTPScreen.tsx
    - Create 6-digit OTP input boxes
    - Implement resend OTP with countdown timer
    - Add verify button with loading state
    - Integrate with authStore.verifyOTP()
    - Navigate to onboarding or main tabs based on profile completeness
    - Use router.replace() to prevent back navigation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.4, 4.14, 5.3_

  - [ ]* 8.3 Write property test for OTP authentication success
    - **Property 8: OTP Authentication Success**
    - **Validates: Requirements 5.2, 5.3**

  - [ ]* 8.4 Write property test for authentication token persistence
    - **Property 9: Authentication Token Persistence**
    - **Validates: Requirements 5.6**

  - [ ]* 8.5 Write property test for auto-login with valid token
    - **Property 10: Auto-Login with Valid Token**
    - **Validates: Requirements 5.8**

  - [ ]* 8.6 Write property test for invalid token rejection
    - **Property 11: Invalid Token Rejection**
    - **Validates: Requirements 5.9**

  - [ ] 8.7 Create root layout with auth check (app/_layout.tsx)
    - Wrap app with ErrorBoundary and theme provider
    - Check authentication status on mount using authStore.checkAuth()
    - Redirect to login if not authenticated
    - Redirect to app lock if enabled
    - _Requirements: 5.1, 5.7, 5.8, 5.9_

- [ ] 9. Implement onboarding flow
  - [ ] 9.1 Create onboarding layout (app/onboarding/_layout.tsx)
    - Configure stack navigation for onboarding screens
    - Allow back navigation between steps
    - _Requirements: 6.9_

  - [ ] 9.2 Create email capture screen (app/onboarding/email.tsx)
    - Convert from pages/EmailCapturePage.tsx
    - Show progress indicator (1/4)
    - Add email input with validation
    - Add continue and skip buttons
    - Save email to authStore on continue
    - Navigate to gender screen
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 21.6_

  - [ ] 9.3 Create gender selection screen (app/onboarding/gender.tsx)
    - Convert from pages/GenderSelectionPage.tsx
    - Show progress indicator (2/4)
    - Display gender option cards (Male, Female, Other, Prefer not to say)
    - Save selection to authStore on continue
    - Navigate to language screen
    - _Requirements: 6.3, 6.4_

  - [ ] 9.4 Create language selection screen (app/onboarding/language.tsx)
    - Convert from pages/LanguageSelectionPage.tsx
    - Show progress indicator (3/4)
    - Display language list with search
    - Save selection to settingsStore on continue
    - Navigate to name screen
    - _Requirements: 6.4, 6.5_

  - [ ] 9.5 Create name capture screen (app/onboarding/name.tsx)
    - Convert from pages/NameCapturePage.tsx
    - Show progress indicator (4/4)
    - Add name input with validation (min 2 chars, no special chars)
    - Save name to authStore on finish
    - Navigate to main tabs using router.replace()
    - _Requirements: 6.5, 6.6, 21.8_

  - [ ]* 9.6 Write property test for onboarding flow completeness
    - **Property 12: Onboarding Flow Completeness**
    - **Validates: Requirements 6.2, 6.3, 6.4, 6.5, 6.10**

  - [ ]* 9.7 Write property test for onboarding data persistence
    - **Property 13: Onboarding Data Persistence**
    - **Validates: Requirements 6.6**

  - [ ]* 9.8 Write property test for onboarding error recovery
    - **Property 14: Onboarding Error Recovery**
    - **Validates: Requirements 6.7**

  - [ ]* 9.9 Write property test for onboarding step requirement
    - **Property 15: Onboarding Step Requirement**
    - **Validates: Requirements 6.8**

- [ ] 10. Checkpoint - Ensure authentication and onboarding work
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 11. Implement media handling utilities
  - [ ] 11.1 Create media picker utility (lib/mediaPicker.ts)
    - Implement pickImage() with permission request and image picker
    - Implement capturePhoto() with camera permission and camera launch
    - Implement pickVideo() with video picker
    - Implement compressImage() to compress images to max 2MB
    - Use expo-image-picker and expo-image-manipulator
    - _Requirements: 25.1, 25.2, 25.3, 25.5, 25.6, 25.9_

  - [ ]* 11.2 Write property test for image compression before upload
    - **Property 36: Image Compression Before Upload**
    - **Validates: Requirements 25.9**

  - [ ] 11.3 Create audio recorder utility (lib/audioRecorder.ts)
    - Implement AudioRecorder class with startRecording, stopRecording, cancelRecording methods
    - Request microphone permission
    - Use expo-av for recording
    - Return audio file URI on stop
    - _Requirements: 25.4, 25.6_

  - [ ] 11.4 Create media upload utility (lib/mediaUpload.ts)
    - Implement uploadMedia() function with progress tracking
    - Compress images before upload
    - Create FormData for file upload
    - Track upload progress with XMLHttpRequest
    - Return uploaded media URL
    - _Requirements: 25.9, 25.10, 25.11_

- [ ] 12. Implement validation utilities
  - [ ] 12.1 Create validation functions (lib/validation.ts)
    - Implement validators: email, phone, required, minLength, maxLength, match
    - Create useFormValidation hook for form state management
    - Support field-level validation with error messages
    - Support form-level validation
    - _Requirements: 21.1, 21.6, 21.7, 21.8, 21.9_

  - [ ]* 12.2 Write property test for form validation error display
    - **Property 32: Form Validation Error Display**
    - **Validates: Requirements 21.1**

  - [ ]* 12.3 Write property test for email format validation
    - **Property 33: Email Format Validation**
    - **Validates: Requirements 21.6**

  - [ ]* 12.4 Write property test for phone format validation
    - **Property 34: Phone Format Validation**
    - **Validates: Requirements 21.7**

  - [ ]* 12.5 Write property test for required field validation
    - **Property 35: Required Field Validation**
    - **Validates: Requirements 21.8, 21.10**

- [ ] 13. Implement security utilities
  - [ ] 13.1 Create token manager (lib/tokenManager.ts)
    - Implement saveToken, getToken, removeToken, isTokenValid functions
    - Store tokens in AsyncStorage
    - Validate JWT token expiration
    - _Requirements: 30.1, 30.7_

  - [ ] 13.2 Create input sanitization utility (lib/sanitize.ts)
    - Implement stripHtml, escapeHtml, sanitizeInput, sanitizeUrl functions
    - Remove HTML tags and escape special characters
    - Validate and sanitize URLs
    - _Requirements: 18.6, 30.6_

  - [ ] 13.3 Create biometric authentication utility (lib/biometric.ts)
    - Implement isAvailable, getSupportedTypes, authenticate functions
    - Use expo-local-authentication
    - Support fingerprint, face, and iris recognition
    - _Requirements: 15.6, 15.7, 15.8, 15.9_

  - [ ] 13.4 Create PIN hashing utility for app lock
    - Implement hashPin and verifyPin functions using expo-crypto
    - Use SHA256 for hashing
    - _Requirements: 15.2, 15.4, 30.2_

- [ ] 14. Create app lock components
  - [ ] 14.1 Create PinLock component (components/lock/PinLock.tsx)
    - Support setup and verify modes
    - Display 4-6 digit PIN input with masked dots
    - Show number pad keyboard
    - Add shake animation on error
    - Add haptic feedback on input
    - Offer biometric fallback option
    - Setup mode: enter twice to confirm
    - Verify mode: compare with stored PIN
    - _Requirements: 15.1, 15.2, 15.4, 15.5, 15.9_

  - [ ] 14.2 Create PatternLock component (components/lock/PatternLock.tsx)
    - Support setup and verify modes
    - Display 3x3 dot grid
    - Track touch gestures and draw visual path
    - Add haptic feedback on dot connection
    - Require minimum 4 dots
    - Setup mode: draw twice to confirm
    - Verify mode: compare with stored pattern
    - Offer biometric fallback option
    - _Requirements: 15.11_

  - [ ] 14.3 Create app lock screen (app/lock.tsx)
    - Display PinLock or PatternLock based on settings
    - Check app lock settings from settingsStore
    - Unlock app on successful verification
    - Navigate to main tabs after unlock
    - _Requirements: 15.3, 15.10_

- [ ] 15. Implement main tab navigation
  - [ ] 15.1 Create tab layout (app/(tabs)/_layout.tsx)
    - Configure bottom tab navigation with 4 tabs: Explore, Discover, Wallet, Profile
    - Add tab icons and labels
    - Apply theme colors to active/inactive tabs
    - _Requirements: 4.2, 4.3, 4.5, 4.6_

  - [ ]* 15.2 Write property test for forward navigation stack growth
    - **Property 5: Forward Navigation Stack Growth**
    - **Validates: Requirements 4.12**

  - [ ]* 15.3 Write property test for back navigation stack reduction
    - **Property 6: Back Navigation Stack Reduction**
    - **Validates: Requirements 4.13**

  - [ ]* 15.4 Write property test for replace navigation stack replacement
    - **Property 7: Replace Navigation Stack Replacement**
    - **Validates: Requirements 4.14**

- [ ] 16. Checkpoint - Ensure utilities and navigation are complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 17. Implement Explore tab (Home screen)
  - [ ] 17.1 Create StoriesSection component (components/StoriesSection.tsx)
    - Display horizontal FlatList of story avatars
    - First item is "Create Story" button
    - Show ring around avatars with unseen stories
    - Display user avatar and name
    - Optimize with getItemLayout for performance
    - Handle story tap to open viewer
    - _Requirements: 14.1, 20.1_

  - [ ] 17.2 Create StoryComposer component (components/StoryComposer.tsx)
    - Full-screen modal for story creation
    - Support image picker or camera capture
    - Add text overlay editor
    - Add publish and cancel buttons
    - Show upload progress indicator
    - _Requirements: 14.5, 14.6, 14.7, 14.8_

  - [ ] 17.3 Create Explore tab screen (app/(tabs)/explore.tsx)
    - Convert from pages/HomePage.tsx
    - Replace all web components with React Native equivalents
    - Add SafeAreaView with header
    - Display StoriesSection at top
    - Display feed content in FlatList (posts, suggested connections, game invites)
    - Add floating action button for story creation
    - Implement pull-to-refresh
    - Implement infinite scroll pagination
    - Optimize FlatList with getItemLayout and memoized items
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.2, 14.1, 20.1, 20.2_

  - [ ]* 17.4 Write property test for list pagination loading
    - **Property 30: List Pagination Loading**
    - **Validates: Requirements 20.2**

- [ ] 18. Implement Discover tab
  - [ ] 18.1 Create Discover tab screen (app/(tabs)/discover.tsx)
    - Convert from pages/DiscoverPage.tsx
    - Replace all web components with React Native equivalents
    - Add search bar at top with debounced input (500ms)
    - Add filter chips (Nearby, New, Popular)
    - Display user grid in FlatList with 2 columns
    - Show avatar, name, location, follow button, message and call buttons
    - Implement pull-to-refresh
    - Implement infinite scroll pagination
    - Optimize FlatList rendering
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.3, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 20.5_

  - [ ]* 18.2 Write property test for user search filtering
    - **Property 18: User Search Filtering**
    - **Validates: Requirements 8.2**

  - [ ]* 18.3 Write property test for follow state consistency
    - **Property 19: Follow State Consistency**
    - **Validates: Requirements 8.4, 8.5, 8.6, 8.7**

  - [ ]* 18.4 Write property test for user display completeness
    - **Property 20: User Display Completeness**
    - **Validates: Requirements 8.11**

- [ ] 19. Implement Profile tab
  - [ ] 19.1 Create Profile tab screen (app/(tabs)/profile.tsx)
    - Convert from pages/ProfilePage.tsx
    - Replace all web components with React Native equivalents
    - Display header with settings button
    - Show avatar with edit button (opens image picker)
    - Display name, bio, and edit profile button
    - Show stats row: followers count, following count, level and XP
    - Display interests chips
    - Add action buttons: view wallet, view leaderboard, settings
    - Add logout button
    - Implement avatar upload with compression
    - Fetch profile on mount and focus
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.5, 7.1, 7.2, 7.3, 7.4, 7.7, 7.8, 7.11, 7.12_

  - [ ]* 19.2 Write property test for profile display completeness
    - **Property 16: Profile Display Completeness**
    - **Validates: Requirements 7.1**

  - [ ]* 19.3 Write property test for profile update persistence
    - **Property 17: Profile Update Persistence**
    - **Validates: Requirements 7.4, 7.5, 7.6**

- [ ] 20. Implement Wallet tab
  - [ ] 20.1 Create Wallet tab screen (app/(tabs)/wallet.tsx)
    - Convert from pages/WalletPage.tsx
    - Replace all web components with React Native equivalents
    - Display balance card at top with current coin balance
    - Add purchase coins button
    - Show quick actions: send gift, view transactions
    - Display recent transactions list in FlatList
    - Show transaction type icon, description, amount (+/-), date
    - Implement pull-to-refresh
    - Fetch balance and transactions on mount and focus
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.6, 11.1, 11.2, 11.9, 11.11_

  - [ ]* 20.2 Write property test for transaction display completeness
    - **Property 24: Transaction Display Completeness**
    - **Validates: Requirements 11.2**

  - [ ]* 20.3 Write property test for wallet balance update after transaction
    - **Property 25: Wallet Balance Update After Transaction**
    - **Validates: Requirements 11.8**

- [ ] 21. Checkpoint - Ensure main tabs are functional
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 22. Implement chat functionality
  - [ ] 22.1 Create CallOverlay component (components/CallOverlay.tsx)
    - Full-screen modal overlay for voice/video calls
    - Display remote video stream (if video call)
    - Show local video preview in corner
    - Add call controls: mute, speaker, video toggle, end
    - Display call duration timer
    - Handle call state changes (connecting, connected, ended)
    - Use CallContext for WebRTC management
    - _Requirements: 10.1, 10.2, 10.4, 10.5_

  - [ ] 22.2 Create chat screen (app/chat/[id].tsx)
    - Convert from pages/ChatPage.tsx
    - Replace all web components with React Native equivalents
    - Add header with back button, user avatar/name, call buttons, more options
    - Display messages in inverted FlatList (text, image, video, voice, GIF, game invites)
    - Add input bar at bottom with text input, emoji button, attachment button, voice record button, send button
    - Use KeyboardAvoidingView
    - Implement typing indicator
    - Implement message delivery status (sent, delivered, read)
    - Handle image picker, camera, video picker for media messages
    - Implement voice recording with expo-av
    - Auto-scroll to bottom on new messages
    - Paginate message loading
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14, 9.15, 9.16, 9.17, 9.18, 9.19, 19.5_

  - [ ]* 22.3 Write property test for message display with timestamps
    - **Property 21: Message Display with Timestamps**
    - **Validates: Requirements 9.1**

  - [ ]* 22.4 Write property test for message send and display
    - **Property 22: Message Send and Display**
    - **Validates: Requirements 9.3, 9.4**

  - [ ]* 22.5 Write property test for message delivery status
    - **Property 23: Message Delivery Status**
    - **Validates: Requirements 9.17**

- [ ] 23. Implement wallet screens
  - [ ] 23.1 Create transactions screen (app/wallet/transactions.tsx)
    - Convert from pages/TransactionsPage.tsx
    - Replace all web components with React Native equivalents
    - Add header with back button
    - Add filter options (All, Earned, Spent)
    - Add date range selector
    - Display transactions in SectionList grouped by date
    - Show transaction icon, description, amount with +/- indicator, time
    - Show empty state if no transactions
    - Implement pull-to-refresh
    - Implement infinite scroll pagination
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.8, 11.2_

  - [ ] 23.2 Create purchase coins screen (app/wallet/purchase.tsx)
    - Convert from pages/PurchaseCoinsPage.tsx
    - Replace all web components with React Native equivalents
    - Add header with back button
    - Display current balance
    - Show coin packages grid with coin amount, price, bonus, popular badge, purchase button
    - Add payment methods section
    - Add terms and conditions link
    - Implement payment integration
    - Handle payment success and failure
    - Show payment processing state
    - Update balance on success
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.9, 11.3, 11.4, 11.5, 11.6, 11.7_

- [ ] 24. Implement games and leaderboard
  - [ ] 24.1 Create games screen (app/games.tsx)
    - Convert from pages/GamesPage.tsx
    - Replace all web components with React Native equivalents
    - Add header with back button
    - Display games grid (2 columns) with thumbnail, name, play button, invite button
    - Show recent games section
    - Add leaderboard link
    - Navigate to game screen on play
    - Open contact picker on invite
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.7, 12.1, 12.2_

  - [ ] 24.2 Create leaderboard screen (app/leaderboard.tsx)
    - Convert from pages/LeaderboardPage.tsx
    - Replace all web components with React Native equivalents
    - Add header with back button
    - Add league selector tabs (Bronze, Silver, Gold, Platinum, Diamond)
    - Display current user position card with rank, avatar, name, XP, progress
    - Show top 3 podium display
    - Display rankings list in FlatList with rank, avatar, name, XP, level
    - Implement pull-to-refresh
    - Paginate rankings
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.7, 13.1, 13.2, 13.3, 13.4, 13.5, 13.8_

- [ ] 25. Implement settings screens
  - [ ] 25.1 Create settings screen (app/settings/index.tsx)
    - Replace all web components with React Native equivalents
    - Add header with back button
    - Display settings sections in SectionList: Account, Security, Preferences, About, Danger zone
    - Add navigation to app lock, theme toggle, language selector, delete account
    - Add logout button with confirmation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.9_

  - [ ] 25.2 Create app lock settings screen (app/settings/app-lock.tsx)
    - Add header with back button
    - Add enable/disable toggle
    - Add lock type selector (PIN, Pattern, Biometric)
    - Add setup button to configure lock
    - Add test lock button
    - Enable app lock with PIN/Pattern setup
    - Use biometric authentication if available
    - _Requirements: 15.1, 15.2, 15.6, 15.7_

  - [ ] 25.3 Create delete account screen (app/settings/delete-account.tsx)
    - Convert from pages/DeleteAccountRequestPage.tsx and pages/DeleteAccountConfirmPage.tsx
    - Replace all web components with React Native equivalents
    - Add header with back button
    - Display warning message and consequences list
    - Add confirmation checkbox
    - Add password/PIN verification
    - Add delete button (red) and cancel button
    - Send deletion request via API
    - Logout and navigate to login on success
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 16.6, 16.7, 16.8_

- [ ] 26. Checkpoint - Ensure all secondary features work
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 27. Implement admin dashboard
  - [ ] 27.1 Create admin dashboard screen (app/admin.tsx)
    - Convert from pages/AdminDashboard.tsx
    - Replace all web components with React Native equivalents
    - Add header with back button
    - Check user role on mount, show access denied if not admin
    - Display statistics cards: total users, active users, new users, total transactions, revenue
    - Add quick actions: view reports, manage users, view analytics
    - Display recent reports list in FlatList with reporter info, content type, reason, status, action buttons
    - Implement pull-to-refresh
    - Handle report actions (approve, reject, ban) via API
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.11, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

- [ ] 28. Implement feature-specific components
  - [ ] 28.1 Create GiftOverlay component (components/GiftOverlay.tsx)
    - Bottom sheet modal for gift sending
    - Display grid of available gifts
    - Show gift cost in coins
    - Add confirm before sending
    - Deduct from wallet on success
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 28.2 Create ReportDialog component (components/ReportDialog.tsx)
    - Modal dialog for content reporting
    - Display list of report reasons
    - Add optional text input for details
    - Add submit and cancel buttons
    - Show loading state during submission
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 28.3 Create PaymentModal component (components/PaymentModal.tsx)
    - Modal with payment options
    - Display package details
    - Integrate with payment gateway
    - Show processing state
    - Handle success/failure callbacks
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 29. Implement offline support
  - [ ] 29.1 Add offline detection and indicator
    - Detect network status using NetInfo
    - Display offline indicator when network unavailable
    - _Requirements: 27.1_

  - [ ] 29.2 Implement offline data caching
    - Cache user profile data
    - Cache wallet balance
    - Cache recent conversations
    - Display cached data when offline
    - _Requirements: 27.2, 27.6, 27.7, 27.8_

  - [ ]* 29.3 Write property test for offline data display
    - **Property 37: Offline Data Display**
    - **Validates: Requirements 27.2**

  - [ ] 29.4 Implement message queueing for offline
    - Queue messages locally when offline
    - Send queued messages when network restored
    - _Requirements: 27.3, 27.4_

  - [ ]* 29.5 Write property test for message queueing when offline
    - **Property 38: Message Queueing When Offline**
    - **Validates: Requirements 27.3, 27.4**

  - [ ] 29.6 Implement data sync after reconnection
    - Sync data with backend when network restored
    - _Requirements: 27.5_

  - [ ]* 29.7 Write property test for data sync after reconnection
    - **Property 39: Data Sync After Reconnection**
    - **Validates: Requirements 27.5**

  - [ ] 29.8 Block network-dependent actions when offline
    - Disable or show message for actions requiring network
    - _Requirements: 27.10_

  - [ ]* 29.9 Write property test for network-dependent action blocking
    - **Property 40: Network-Dependent Action Blocking**
    - **Validates: Requirements 27.10**

- [ ] 30. Implement error handling
  - [ ] 30.1 Create ErrorBoundary component (components/ErrorBoundary.tsx)
    - Catch React errors in component tree
    - Display fallback UI with error message
    - Add "Try Again" button to reset error state
    - Log errors to console (or error tracking service)
    - _Requirements: 21.2_

  - [ ] 30.2 Create error handler hook (hooks/useErrorHandler.ts)
    - Handle different error types (NetworkError, AuthenticationError, ValidationError, PermissionError)
    - Display user-friendly error messages
    - Show Alert with error message and OK button
    - _Requirements: 21.2, 21.3, 21.4, 21.5_

  - [ ] 30.3 Create retry hook (hooks/useRetry.ts)
    - Implement retry logic with max retries
    - Track loading, error, and retry count states
    - Provide execute and retry functions
    - _Requirements: 18.11_

- [ ] 31. Implement performance optimizations
  - [ ] 31.1 Optimize all FlatLists
    - Use removeClippedSubviews, maxToRenderPerBatch, updateCellsBatchingPeriod
    - Set initialNumToRender and windowSize
    - Implement getItemLayout where possible
    - Memoize renderItem callbacks
    - _Requirements: 20.1_

  - [ ] 31.2 Create pagination hook (hooks/usePagination.ts)
    - Implement usePagination hook with loadMore and refresh functions
    - Track data, page, loading, hasMore states
    - Support configurable page size
    - _Requirements: 20.2_

  - [ ] 31.3 Create debounce hook (hooks/useDebounce.ts)
    - Implement useDebounce hook with configurable delay
    - Use for search inputs (500ms delay)
    - _Requirements: 20.5_

  - [ ] 31.4 Add memoization to expensive components
    - Use React.memo for list items
    - Use useMemo for expensive computations
    - Use useCallback for callbacks passed to children
    - _Requirements: 20.6_

  - [ ] 31.5 Optimize image loading
    - Use expo-image for all images
    - Configure cachePolicy="memory-disk"
    - Add placeholder and transition
    - _Requirements: 20.3_

- [ ] 32. Checkpoint - Ensure all features are complete and optimized
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 33. Implement accessibility features
  - [ ] 33.1 Add accessibility labels to all interactive elements
    - Add accessibilityLabel to all buttons, inputs, and touchable elements
    - Add accessibilityHint for complex interactions
    - Add accessibilityRole for semantic meaning
    - _Requirements: 28.1, 28.9_

  - [ ] 33.2 Ensure color contrast and text sizing
    - Verify sufficient color contrast ratios (WCAG AA)
    - Support dynamic text sizing
    - Don't rely solely on color to convey information
    - _Requirements: 28.3, 28.4, 28.8_

  - [ ] 33.3 Add alternative text for images
    - Add accessibilityLabel to all Image components
    - Provide meaningful descriptions
    - _Requirements: 28.5_

  - [ ] 33.4 Add haptic feedback for important actions
    - Use Haptics.impactAsync() for button presses
    - Use Haptics.notificationAsync() for success/error
    - _Requirements: 28.7, 19.11_

  - [ ] 33.5 Ensure touch targets are minimum 44x44 points
    - Verify all touchable elements meet minimum size
    - Add padding if needed
    - _Requirements: 28.9, 19.3_

- [ ] 34. Implement notifications
  - [ ] 34.1 Set up push notifications
    - Request notification permission on first launch
    - Configure expo-notifications
    - Handle notification received while app is open
    - Handle notification tapped
    - _Requirements: 29.1, 29.5, 29.6_

  - [ ] 34.2 Implement notification navigation
    - Navigate to relevant screen when notification tapped
    - Handle deep links correctly
    - Clear notifications when user views content
    - _Requirements: 29.4, 29.9, 29.10_

  - [ ] 34.3 Add notification badge count
    - Display badge count on app icon
    - Update badge count when notifications received
    - _Requirements: 29.8_

- [ ] 35. Configure app metadata and assets
  - [ ] 35.1 Configure app.json
    - Set app name, slug, version, bundle identifier
    - Configure permissions: camera, microphone, photo library, notifications
    - Set orientation to portrait
    - Configure splash screen
    - Configure app icons
    - _Requirements: 22.7, 22.8_

  - [ ] 35.2 Add app icons and splash screen
    - Create app icons for all required sizes
    - Create splash screen image
    - Configure adaptive icon for Android
    - _Requirements: 22.8_

- [ ] 36. Testing and bug fixes
  - [ ] 36.1 Test authentication flow end-to-end
    - Test login with phone and email
    - Test OTP verification
    - Test onboarding flow
    - Test auto-login
    - Test logout
    - _Requirements: 23.9_

  - [ ] 36.2 Test all navigation flows
    - Test tab navigation
    - Test screen navigation (push, back, replace)
    - Test deep linking
    - _Requirements: 23.1_

  - [ ] 36.3 Test all button interactions
    - Verify all buttons are functional
    - Test loading states
    - Test disabled states
    - _Requirements: 23.2_

  - [ ] 36.4 Test all form submissions
    - Test validation
    - Test error handling
    - Test success flows
    - _Requirements: 23.3_

  - [ ] 36.5 Test API integrations
    - Test all API endpoints
    - Test error handling
    - Test retry logic
    - _Requirements: 23.4_

  - [ ] 36.6 Test media handling
    - Test image upload
    - Test camera capture
    - Test video upload
    - Test voice recording
    - _Requirements: 23.5, 23.6, 23.7, 23.8_

  - [ ] 36.7 Test offline functionality
    - Test offline indicator
    - Test cached data display
    - Test message queueing
    - Test data sync after reconnection
    - _Requirements: 27.1, 27.2, 27.3, 27.4, 27.5_

  - [ ] 36.8 Test error handling
    - Test network errors
    - Test validation errors
    - Test permission errors
    - Test API errors
    - _Requirements: 23.10_

  - [ ] 36.9 Fix any bugs found during testing
    - Document bugs
    - Prioritize by severity
    - Fix critical bugs first
    - Verify fixes with tests
    - _Requirements: 22.4_

- [ ] 37. Build and deployment preparation
  - [ ] 37.1 Test Android build
    - Run expo build:android or eas build --platform android
    - Verify no Metro bundler errors
    - Verify no red screen errors on launch
    - Test on physical Android device
    - _Requirements: 22.1, 22.3, 22.4, 22.10_

  - [ ] 37.2 Verify TypeScript compilation
    - Run tsc --noEmit to check for type errors
    - Fix any type errors
    - _Requirements: 22.6_

  - [ ] 37.3 Code quality review
    - Remove console.log statements
    - Remove unused imports and variables
    - Verify consistent naming conventions
    - Add comments for complex logic
    - _Requirements: 24.5, 24.6, 24.8, 24.9_

  - [ ] 37.4 Performance profiling
    - Profile app with React DevTools
    - Identify and fix performance bottlenecks
    - Verify smooth scrolling and animations
    - _Requirements: 20.1, 20.6, 20.10_

  - [ ] 37.5 Security review
    - Verify tokens stored securely
    - Verify no sensitive data logged
    - Verify all inputs sanitized
    - Verify HTTPS used for all API requests
    - _Requirements: 30.1, 30.2, 30.3, 30.6, 30.7_

- [ ] 38. Final checkpoint - Ensure app is production-ready
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All web-specific code (DOM APIs, CSS, Radix UI) must be replaced with React Native equivalents
- Use TypeScript for all code files
- Follow React Native best practices and mobile-native patterns
- Optimize for performance with FlatList, memoization, and lazy loading
- Ensure accessibility with labels, contrast, and touch targets
- Test thoroughly on physical Android devices before deployment

