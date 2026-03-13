import { Toaster } from './components/ui/toaster';
import { Toaster as Sonner } from './components/ui/sonner';
import { TooltipProvider } from './components/ui/tooltip';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import BiometricLock from './components/BiometricLock';
import { CallProvider } from './context/CallContext';
import CallOverlay from './components/CallOverlay';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import OTPScreen from './pages/OTPScreen';
import NameCapturePage from './pages/NameCapturePage';
import GenderSelectionPage from './pages/GenderSelectionPage';
import LanguageSelectionPage from './pages/LanguageSelectionPage';
import EmailCapturePage from './pages/EmailCapturePage';
import DeleteAccountRequestPage from './pages/DeleteAccountRequestPage';
import DeleteAccountConfirmPage from './pages/DeleteAccountConfirmPage';
import HomePage from './pages/HomePage';
import DiscoverPage from './pages/DiscoverPage';
import WalletPage from './pages/WalletPage';
import TransactionsPage from './pages/TransactionsPage';
import PurchaseCoinsPage from './pages/PurchaseCoinsPage';
import GamesPage from './pages/GamesPage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminDashboard from './pages/AdminDashboard';
import NotFound from './pages/NotFound';
import { useEffect } from "react";
import { useAuthStore } from './store/authStore';
import { Platform, View, Text, StyleSheet } from "react-native";

const queryClient = new QueryClient();

const WebApp = () => {
  const initializeAuth = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <QueryClientProvider client={queryClient}>
      <CallProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <BiometricLock>
              <CallOverlay />
              <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/otp" element={<OTPScreen />} />
                <Route path="/name" element={<NameCapturePage />} />
                <Route path="/language" element={<LanguageSelectionPage />} />
                <Route path="/email" element={<EmailCapturePage />} />
                <Route path="/gender" element={<GenderSelectionPage />} />
                <Route path="/account/delete" element={<DeleteAccountRequestPage />} />
                <Route path="/account/delete/confirm/:token" element={<DeleteAccountConfirmPage />} />
                <Route
                  path="/home"
                  element={
                    <ProtectedRoute>
                      <HomePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/discover"
                  element={
                    <ProtectedRoute>
                      <DiscoverPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wallet"
                  element={
                    <ProtectedRoute>
                      <WalletPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wallet/transactions"
                  element={
                    <ProtectedRoute>
                      <TransactionsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/wallet/purchase"
                  element={
                    <ProtectedRoute>
                      <PurchaseCoinsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/games"
                  element={
                    <ProtectedRoute>
                      <GamesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chat/:userId"
                  element={
                    <ProtectedRoute>
                      <ChatPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile/:userId"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/leaderboard"
                  element={
                    <ProtectedRoute>
                      <LeaderboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BiometricLock>
          </BrowserRouter>
        </TooltipProvider>
      </CallProvider>
    </QueryClientProvider>
  );
};

const NativeApp = () => {
  return (
    <View style={nativeStyles.container}>
      <Text style={nativeStyles.title}>Loveable</Text>
      <Text style={nativeStyles.subtitle}>App is running on Android</Text>
      <Text style={nativeStyles.text}>
        This build currently supports full experience on web. Android native UI will be added next.
      </Text>
    </View>
  );
};

const nativeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F9FAFB",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#9CA3AF",
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
});

const App = () => {
  if (Platform.OS === "web") {
    return <WebApp />;
  }
  return <NativeApp />;
};

export default App;
