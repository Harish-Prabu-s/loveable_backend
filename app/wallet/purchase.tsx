import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal, Animated, Dimensions, Platform
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { walletApi } from '@/api/wallet';
import { offersApi, Offer } from '@/api/offers';
import Constants from 'expo-constants';

// Safe WebView import — works whether or not react-native-webview is installed
let WebView: any;
try { WebView = require('react-native-webview').WebView; } catch { WebView = null; }

const { width: SCREEN_W } = Dimensions.get('window');


// ─── Razorpay Config ──────────────────────────────────────────────────────────
// Key is loaded from app.json extra or falls back to a placeholder.
const RAZORPAY_KEY_ID =
    Constants.expoConfig?.extra?.razorpayKeyId ||
    'rzp_test_placeholder'; // replace with your key in app.json extra

interface CoinPackage {
    id: number;
    title: string;
    coins: number;
    price: number;
    bonus?: number;
    popular?: boolean;
    offer_type: string;
    emoji?: string;
}

// Fallback packages shown when the API is unavailable
const FALLBACK_PACKAGES: CoinPackage[] = [
    { id: 1, title: 'Starter',   coins: 100,  price: 49,  emoji: '🪙',  offer_type: 'coin_package' },
    { id: 2, title: 'Basic',     coins: 300,  price: 129, emoji: '💰',  offer_type: 'coin_package' },
    { id: 3, title: 'Pro',       coins: 700,  price: 249, emoji: '💎',  bonus: 50,  popular: true, offer_type: 'coin_package' },
    { id: 4, title: 'Elite',     coins: 1500, price: 499, emoji: '👑',  bonus: 150, offer_type: 'coin_package' },
    { id: 5, title: 'Premium',   coins: 3000, price: 899, emoji: '🚀',  bonus: 500, offer_type: 'coin_package' },
    { id: 6, title: 'Ultimate',  coins: 6500, price: 1799,emoji: '⚡', bonus: 1500, offer_type: 'coin_package' },
];

// ─── Razorpay WebView HTML ────────────────────────────────────────────────────
function buildRazorpayHTML(
    keyId: string,
    orderId: string,
    amount: number, // in paise
    name: string,
    email: string,
    phone: string,
    description: string
): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
</head>
<body style="margin:0;background:#0F172A;display:flex;align-items:center;justify-content:center;height:100vh;">
  <p style="color:#9CA3AF;font-family:sans-serif;">Opening Payment Gateway...</p>
  <script>
    var options = {
      key: "${keyId}",
      amount: ${amount},
      currency: "INR",
      name: "Vibely",
      description: "${description}",
      order_id: "${orderId}",
      prefill: {
        name: "${name}",
        email: "${email}",
        contact: "${phone}"
      },
      theme: { color: "#6366F1" },
      modal: { ondismiss: function() { window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'dismissed' })); } },
      handler: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          status: 'success',
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id:   response.razorpay_order_id,
          razorpay_signature:  response.razorpay_signature
        }));
      }
    };
    var rzp = new Razorpay(options);
    rzp.on('payment.failed', function(resp) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ status: 'failed', error: resp.error.description }));
    });
    rzp.open();
  </script>
</body>
</html>`;
}

export default function PurchaseCoinsScreen() {
    const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState<CoinPackage[]>([]);
    const [firstTimePackage, setFirstTimePackage] = useState<CoinPackage | null>(null);
    const [isFirstPurchase, setIsFirstPurchase] = useState(false);

    // Payment flow states
    const [paymentStep, setPaymentStep] = useState<'idle' | 'creating_order' | 'checkout' | 'verifying' | 'success' | 'error'>('idle');
    const [razorpayHTML, setRazorpayHTML] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState('');

    // Animations
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const successScale = useRef(new Animated.Value(0)).current;

    const { user } = useAuthStore();
    const { wallet, fetchWallet } = useWalletStore();

    useEffect(() => {
        loadPackages();
    }, []);

    useEffect(() => {
        if (paymentStep === 'success') {
            Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 5 }).start();
        }
    }, [paymentStep]);

    const loadPackages = async () => {
        try {
            setLoading(true);
            const [walletData, offersRes] = await Promise.all([
                walletApi.getWallet().catch(() => null),
                offersApi.listOffers().catch(() => ({ data: [] }))
            ]);

            if (walletData) setIsFirstPurchase(!walletData.has_purchased);

            const regular: CoinPackage[] = [];
            let firstTime: CoinPackage | null = null;

            if (offersRes.data?.length > 0) {
                offersRes.data.forEach((offer: Offer) => {
                    const pkg: CoinPackage = {
                        id: offer.id,
                        title: offer.title,
                        coins: offer.coins_awarded,
                        price: parseFloat(offer.price),
                        bonus: offer.discount_coins || 0,
                        popular: offer.title.toLowerCase().includes('pro') || offer.title.toLowerCase().includes('popular'),
                        offer_type: offer.offer_type,
                    };
                    if (offer.title.toLowerCase().includes('starter') && !(walletData?.has_purchased)) {
                        firstTime = pkg;
                    } else {
                        regular.push(pkg);
                    }
                });
                regular.sort((a, b) => a.price - b.price);
                setPackages(regular);
                setFirstTimePackage(firstTime);
            } else {
                setPackages(FALLBACK_PACKAGES);
            }
        } catch {
            setPackages(FALLBACK_PACKAGES);
        } finally {
            setLoading(false);
        }
    };

    // ── Step 1: Create Razorpay order on backend ──────────────────────────────
    const handleBuyNow = async (pkg: CoinPackage) => {
        setSelectedPackage(pkg);
        setPaymentStep('creating_order');

        try {
            // Create the order via our backend (which calls Razorpay API)
            const orderRes = await walletApi.createOrder(pkg.price);

            if (!orderRes.order_id || !orderRes.key_id) {
                throw new Error('Order creation failed. Please try again.');
            }

            const html = buildRazorpayHTML(
                orderRes.key_id,
                orderRes.order_id,
                Math.round(pkg.price * 100), // Convert ₹ → paise
                user?.display_name || user?.username || 'User',
                user?.email || '',
                user?.phone_number || '',
                `${pkg.coins + (pkg.bonus || 0)} Coins`
            );

            setRazorpayHTML(html);
            setPaymentStep('checkout');
        } catch (err: any) {
            console.error('[Payment] Order creation failed:', err);
            setPaymentStep('error');
            setErrorMessage(err?.response?.data?.error || err?.message || 'Could not initiate payment. Please try again.');
        }
    };

    // ── TEST MODE: Skip Razorpay, credit coins directly ───────────────────────
    // Backend accepts pay_mock_* IDs without signature verification — safe for testing.
    const handleTestPurchase = async (pkg: CoinPackage) => {
        setSelectedPackage(pkg);
        setPaymentStep('verifying');
        try {
            await walletApi.purchase(
                pkg.price,
                pkg.coins + (pkg.bonus || 0),
                {
                    razorpay_payment_id: `pay_mock_test_${Date.now()}`,
                    razorpay_order_id:   `order_mock_${Date.now()}`,
                    razorpay_signature:  'mock_signature',
                }
            );
            await fetchWallet();
            setPaymentStep('success');
        } catch (err: any) {
            setPaymentStep('error');
            setErrorMessage(err?.response?.data?.error || 'Test purchase failed. Is the backend running?');
        }
    };

    // ── Step 2: Handle WebView message (Razorpay callback) ───────────────────
    const handleWebViewMessage = async (event: { nativeEvent: { data: string } }) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('[Payment] Razorpay callback:', data.status);

            if (data.status === 'dismissed') {
                setPaymentStep('idle');
                return;
            }

            if (data.status === 'failed') {
                setPaymentStep('error');
                setErrorMessage(data.error || 'Payment failed. Please try again.');
                return;
            }

            if (data.status === 'success') {
                setPaymentStep('verifying');
                await verifyAndCredit({
                    razorpay_payment_id: data.razorpay_payment_id,
                    razorpay_order_id: data.razorpay_order_id,
                    razorpay_signature: data.razorpay_signature,
                });
            }
        } catch (e) {
            console.warn('[Payment] Could not parse WebView message');
        }
    };

    // ── Step 3: Verify payment + credit coins ─────────────────────────────────
    const verifyAndCredit = async (paymentData: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
    }) => {
        if (!selectedPackage) return;
        try {
            await walletApi.purchase(
                selectedPackage.price,
                selectedPackage.coins + (selectedPackage.bonus || 0),
                paymentData
            );
            await fetchWallet();
            setPaymentStep('success');
        } catch (err: any) {
            setPaymentStep('error');
            setErrorMessage(err?.response?.data?.error || 'Payment verification failed. Contact support.');
        }
    };

    // ─────────────────────────────────────────────────────────────────────────

    const renderPackageCard = (pkg: CoinPackage) => {
        const isSelected = selectedPackage?.id === pkg.id;
        const totalCoins = pkg.coins + (pkg.bonus || 0);

        return (
            <TouchableOpacity
                key={pkg.id}
                activeOpacity={0.85}
                onPress={() => setSelectedPackage(pkg)}
                style={[styles.pkgCard, isSelected && styles.pkgCardSelected, pkg.popular && styles.pkgCardPopular]}
            >
                {pkg.popular && (
                    <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>⭐ MOST POPULAR</Text>
                    </LinearGradient>
                )}

                <Text style={styles.pkgEmoji}>{pkg.emoji || '🪙'}</Text>
                <Text style={styles.pkgCoins}>{totalCoins.toLocaleString()}</Text>
                <Text style={styles.pkgCoinsLabel}>COINS</Text>

                {pkg.bonus ? (
                    <View style={styles.bonusPill}>
                        <Text style={styles.bonusPillText}>+{pkg.bonus} FREE</Text>
                    </View>
                ) : <View style={{ height: 26 }} />}

                <LinearGradient
                    colors={isSelected ? ['#6366F1', '#8B5CF6'] : ['#1E293B', '#334155']}
                    style={styles.pricePill}
                >
                    <Text style={styles.priceText}>₹{pkg.price}</Text>
                </LinearGradient>

                {isSelected && (
                    <View style={styles.selectedCheck}>
                        <MaterialCommunityIcons name="check" size={12} color="#FFF" />
                    </View>
                )}

                {/* 🧪 Test Mode Button — tap to instantly credit without Razorpay */}
                <TouchableOpacity
                    style={styles.testBtn}
                    onPress={(e) => { e.stopPropagation?.(); handleTestPurchase(pkg); }}
                    activeOpacity={0.8}
                >
                    <Text style={styles.testBtnText}>🧪 Test Buy</Text>
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    // ── Loading state ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Loading packages...</Text>
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <LinearGradient colors={['#0F172A', '#1E1B4B', '#0F172A']} style={StyleSheet.absoluteFill} />

            {/* ── Razorpay Checkout Modal ─────────────────────────────────── */}
            <Modal
                visible={paymentStep === 'checkout'}
                animationType="slide"
                onRequestClose={() => setPaymentStep('idle')}
            >
                <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
                    <View style={styles.webViewHeader}>
                        <TouchableOpacity onPress={() => setPaymentStep('idle')} style={styles.closeBtn}>
                            <MaterialCommunityIcons name="close" size={22} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.webViewTitle}>Secure Payment</Text>
                        <View style={{ width: 40 }} />
                    </View>
                    <WebView
                        source={{ html: razorpayHTML }}
                        onMessage={handleWebViewMessage}
                        javaScriptEnabled
                        domStorageEnabled
                        style={{ flex: 1, backgroundColor: '#0F172A' }}
                    />
                </SafeAreaView>
            </Modal>

            {/* ── Processing / Success / Error Modal ─────────────────────── */}
            <Modal visible={['creating_order', 'verifying', 'success', 'error'].includes(paymentStep)} transparent animationType="fade">
                <View style={styles.overlayBg}>
                    <View style={styles.overlayCard}>
                        {(paymentStep === 'creating_order' || paymentStep === 'verifying') && (
                            <>
                                <ActivityIndicator size="large" color="#6366F1" />
                                <Text style={styles.overlayTitle}>
                                    {paymentStep === 'creating_order' ? 'Creating Order...' : 'Verifying Payment...'}
                                </Text>
                                <Text style={styles.overlaySubtitle}>Please wait, do not close the app</Text>
                            </>
                        )}
                        {paymentStep === 'success' && (
                            <Animated.View style={[styles.successBox, { transform: [{ scale: successScale }] }]}>
                                <LinearGradient colors={['#059669', '#10B981']} style={styles.successIcon}>
                                    <MaterialCommunityIcons name="check" size={48} color="#FFF" />
                                </LinearGradient>
                                <Text style={styles.overlayTitle}>Payment Successful! 🎉</Text>
                                <Text style={styles.overlaySubtitle}>
                                    {(selectedPackage?.coins || 0) + (selectedPackage?.bonus || 0)} coins added to your wallet
                                </Text>
                                <View style={styles.coinsAwardedRow}>
                                    <MaterialCommunityIcons name="currency-usd" size={28} color="#F59E0B" />
                                    <Text style={styles.coinsAwardedText}>
                                        {wallet?.coin_balance?.toLocaleString() || '—'}
                                    </Text>
                                    <Text style={styles.coinsAwardedLabel}>New Balance</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.doneBtn}
                                    onPress={() => { setPaymentStep('idle'); router.back(); }}
                                >
                                    <Text style={styles.doneBtnText}>Done</Text>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                        {paymentStep === 'error' && (
                            <>
                                <MaterialCommunityIcons name="alert-circle" size={56} color="#EF4444" />
                                <Text style={styles.overlayTitle}>Payment Failed</Text>
                                <Text style={styles.overlaySubtitle}>{errorMessage}</Text>
                                <TouchableOpacity
                                    style={[styles.doneBtn, { backgroundColor: '#EF4444' }]}
                                    onPress={() => setPaymentStep('idle')}
                                >
                                    <Text style={styles.doneBtnText}>Try Again</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── Main Screen ─────────────────────────────────────────────── */}
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={22} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Buy Coins</Text>
                    {/* Current balance chip */}
                    <View style={styles.balanceChip}>
                        <MaterialCommunityIcons name="currency-usd" size={14} color="#F59E0B" />
                        <Text style={styles.balanceChipText}>{wallet?.coin_balance?.toLocaleString() ?? '—'}</Text>
                    </View>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Hero Banner */}
                    <LinearGradient colors={['#4F46E5', '#7C3AED', '#A855F7']} style={styles.hero} start={[0, 0]} end={[1, 1]}>
                        <View style={styles.heroGlow} />
                        <Text style={styles.heroEmoji}>💎</Text>
                        <Text style={styles.heroTitle}>Power Up Your Experience</Text>
                        <Text style={styles.heroSub}>Use coins to make voice & video calls,{'\n'}send gifts, and unlock premium features</Text>
                        <View style={styles.heroStats}>
                            <View style={styles.heroStat}>
                                <Text style={styles.heroStatNum}>📞</Text>
                                <Text style={styles.heroStatLabel}>Voice Calls</Text>
                            </View>
                            <View style={styles.heroDivider} />
                            <View style={styles.heroStat}>
                                <Text style={styles.heroStatNum}>📹</Text>
                                <Text style={styles.heroStatLabel}>Video Calls</Text>
                            </View>
                            <View style={styles.heroDivider} />
                            <View style={styles.heroStat}>
                                <Text style={styles.heroStatNum}>🎁</Text>
                                <Text style={styles.heroStatLabel}>Gifts</Text>
                            </View>
                        </View>
                    </LinearGradient>

                    {/* First-Time Offer Banner */}
                    {isFirstPurchase && firstTimePackage && (
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => handleBuyNow(firstTimePackage)}
                            style={styles.firstTimeCard}
                        >
                            <LinearGradient colors={['#EC4899', '#F43F5E']} style={styles.firstTimeGrad}>
                                <View style={styles.firstTimeBadge}>
                                    <Text style={styles.firstTimeBadgeText}>🔥 FIRST PURCHASE OFFER</Text>
                                </View>
                                <View style={styles.firstTimeRow}>
                                    <View>
                                        <Text style={styles.firstTimeTitle}>{firstTimePackage.title}</Text>
                                        <Text style={styles.firstTimeDesc}>
                                            {firstTimePackage.coins + (firstTimePackage.bonus || 0)} Coins for just ₹{firstTimePackage.price}
                                        </Text>
                                    </View>
                                    <View style={styles.firstTimeBuyBtn}>
                                        <Text style={styles.firstTimeBuyText}>Buy Now</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {/* Packages Grid */}
                    <Text style={styles.sectionTitle}>Choose a Package</Text>
                    <View style={styles.grid}>
                        {packages.map(renderPackageCard)}
                    </View>

                    {/* Trust Badges */}
                    <View style={styles.trustRow}>
                        {[
                            { icon: 'shield-check', label: '100% Secure' },
                            { icon: 'bank', label: 'Bank Transfer' },
                            { icon: 'refresh', label: 'Instant Credit' },
                        ].map(({ icon, label }) => (
                            <View key={label} style={styles.trustItem}>
                                <MaterialCommunityIcons name={icon as any} size={20} color="#6366F1" />
                                <Text style={styles.trustLabel}>{label}</Text>
                            </View>
                        ))}
                    </View>

                    <Text style={styles.disclaimer}>
                        Payments secured by Razorpay. All transactions are encrypted.
                    </Text>
                </ScrollView>

                {/* Bottom CTA — only shown when a package is selected */}
                {selectedPackage && (
                    <View style={styles.bottomBar}>
                        <View style={styles.bottomInfo}>
                            <Text style={styles.bottomLabel}>Selected:</Text>
                            <Text style={styles.bottomPkg}>
                                {selectedPackage.emoji} {(selectedPackage.coins + (selectedPackage.bonus || 0)).toLocaleString()} Coins
                            </Text>
                        </View>
                        <View style={styles.bottomRight}>
                            <Text style={styles.bottomPrice}>₹{selectedPackage.price}</Text>
                            <TouchableOpacity
                                style={styles.buyBtn}
                                onPress={() => handleBuyNow(selectedPackage)}
                                activeOpacity={0.85}
                            >
                                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.buyBtnGrad}>
                                    <MaterialCommunityIcons name="credit-card-fast" size={18} color="#FFF" />
                                    <Text style={styles.buyBtnText}>Pay Securely</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0F172A' },
    loadingContainer: { flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },

    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    balanceChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
    balanceChipText: { color: '#F59E0B', fontWeight: '700', fontSize: 13 },

    scroll: { paddingHorizontal: 16, paddingBottom: 130 },

    // Hero
    hero: { borderRadius: 24, padding: 24, marginBottom: 20, overflow: 'hidden', position: 'relative' },
    heroGlow: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.07)' },
    heroEmoji: { fontSize: 40, marginBottom: 8 },
    heroTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
    heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', lineHeight: 20, marginBottom: 20 },
    heroStats: { flexDirection: 'row', alignItems: 'center' },
    heroStat: { flex: 1, alignItems: 'center' },
    heroStatNum: { fontSize: 24, marginBottom: 2 },
    heroStatLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
    heroDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

    // First time
    firstTimeCard: { marginBottom: 20, borderRadius: 20, overflow: 'hidden' },
    firstTimeGrad: { padding: 16 },
    firstTimeBadge: { backgroundColor: '#FBBF24', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 10 },
    firstTimeBadgeText: { color: '#000', fontSize: 10, fontWeight: '800' },
    firstTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    firstTimeTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    firstTimeDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 3 },
    firstTimeBuyBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
    firstTimeBuyText: { color: '#EC4899', fontWeight: '800', fontSize: 14 },

    // Section
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#E2E8F0', marginBottom: 14 },

    // Grid
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    pkgCard: {
        width: (SCREEN_W - 44) / 2,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.08)',
        position: 'relative',
        overflow: 'hidden',
    },
    pkgCardSelected: { borderColor: '#6366F1', backgroundColor: 'rgba(99,102,241,0.12)' },
    pkgCardPopular: { borderColor: '#8B5CF6' },
    popularBadge: { position: 'absolute', top: 0, left: 0, right: 0, paddingVertical: 5, alignItems: 'center' },
    popularBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    pkgEmoji: { fontSize: 32, marginTop: 16, marginBottom: 6 },
    pkgCoins: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
    pkgCoinsLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginBottom: 6 },
    bonusPill: { backgroundColor: 'rgba(16,185,129,0.2)', borderWidth: 1, borderColor: '#10B981', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 10 },
    bonusPillText: { color: '#10B981', fontSize: 10, fontWeight: '700' },
    pricePill: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 8, marginTop: 4 },
    priceText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    selectedCheck: { position: 'absolute', top: 8, right: 8, backgroundColor: '#6366F1', borderRadius: 10, padding: 3 },
    testBtn: {
        marginTop: 10, backgroundColor: 'rgba(234,179,8,0.15)', borderWidth: 1,
        borderColor: 'rgba(234,179,8,0.4)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    },
    testBtnText: { color: '#EAB308', fontSize: 11, fontWeight: '700' },

    // Trust
    trustRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, marginBottom: 16 },
    trustItem: { alignItems: 'center', gap: 6 },
    trustLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
    disclaimer: { color: '#475569', fontSize: 11, textAlign: 'center', lineHeight: 16 },

    // Bottom bar
    bottomBar: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(15,23,42,0.97)',
        borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 28,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    bottomInfo: { flex: 1 },
    bottomLabel: { color: '#64748B', fontSize: 11 },
    bottomPkg: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, marginTop: 2 },
    bottomRight: { alignItems: 'flex-end', gap: 6 },
    bottomPrice: { color: '#F59E0B', fontWeight: '800', fontSize: 20 },
    buyBtn: { borderRadius: 14, overflow: 'hidden' },
    buyBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
    buyBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

    // WebView modal header
    webViewHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 14,
        backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    webViewTitle: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },

    // Overlay
    overlayBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    overlayCard: {
        backgroundColor: '#1E293B', borderRadius: 28, padding: 32, width: '100%',
        alignItems: 'center', gap: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    overlayTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
    overlaySubtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
    successBox: { width: '100%', alignItems: 'center', gap: 12 },
    successIcon: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    coinsAwardedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(245,158,11,0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16, marginTop: 4 },
    coinsAwardedText: { fontSize: 24, fontWeight: '800', color: '#F59E0B' },
    coinsAwardedLabel: { fontSize: 12, color: '#94A3B8' },
    doneBtn: { backgroundColor: '#6366F1', borderRadius: 14, paddingHorizontal: 40, paddingVertical: 14, marginTop: 8, width: '100%', alignItems: 'center' },
    doneBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
