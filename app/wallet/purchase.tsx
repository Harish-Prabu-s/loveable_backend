import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Modal
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { walletApi } from '@/api/wallet';
import { offersApi, Offer } from '@/api/offers';

interface CoinPackage {
    id: number;
    title: string;
    coins: number;
    price: number;
    bonus?: number;
    popular?: boolean;
    offer_type: string;
}

export default function PurchaseCoinsScreen() {
    const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
    const [processing, setProcessing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [packages, setPackages] = useState<CoinPackage[]>([]);
    const [paymentStatus, setPaymentStatus] = useState<'idle' | 'confirming' | 'verifying' | 'success'>('idle');

    const { user } = useAuthStore();
    const { fetchWallet } = useWalletStore();

    const [isFirstPurchase, setIsFirstPurchase] = useState(false);
    const [firstTimePackage, setFirstTimePackage] = useState<CoinPackage | null>(null);
    const [dailyOfferPackage, setDailyOfferPackage] = useState<CoinPackage | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [wallet, offersRes] = await Promise.all([
                    walletApi.getWallet(),
                    offersApi.listOffers()
                ]);

                setIsFirstPurchase(!wallet.has_purchased);

                const regularPackages: CoinPackage[] = [];
                let foundFirstTime = null;
                let foundDaily = null;

                if (offersRes.data) {
                    offersRes.data.forEach((offer: Offer) => {
                        const pkg: CoinPackage = {
                            id: offer.id,
                            title: offer.title,
                            coins: offer.coins_awarded,
                            price: parseFloat(offer.price),
                            bonus: offer.discount_coins || 0,
                            popular: offer.title.toLowerCase().includes('pro') || offer.title.toLowerCase().includes('popular'),
                            offer_type: offer.offer_type
                        };

                        if (offer.title.toLowerCase().includes('starter') && !wallet.has_purchased) {
                            foundFirstTime = pkg;
                        } else if (offer.title.toLowerCase().includes('daily') || offer.title.toLowerCase().includes('offer')) {
                            foundDaily = pkg;
                        } else {
                            regularPackages.push(pkg);
                        }
                    });
                }

                regularPackages.sort((a, b) => a.price - b.price);

                setPackages(regularPackages);
                setFirstTimePackage(foundFirstTime);
                setDailyOfferPackage(foundDaily);

            } catch (error) {
                console.error("Failed to fetch data", error);
                // Fallback mock data if API fails to load
                setPackages([
                    { id: 1, title: 'Basic', coins: 100, price: 99, offer_type: 'coin_package' },
                    { id: 2, title: 'Pro', coins: 500, price: 399, bonus: 50, popular: true, offer_type: 'coin_package' }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handlePurchase = () => {
        if (!selectedPackage) return;
        setPaymentStatus('confirming');
    };

    const handleConfirmPayment = async () => {
        setPaymentStatus('verifying');

        // Simulate Payment flow for React Native without native integration
        setTimeout(async () => {
            try {
                // Note: Using a dummy payload for now. Real integration needs react-native-razorpay
                const dummyResponse = {
                    razorpay_payment_id: "pay_mock_dummy123",
                    razorpay_order_id: "order_dummy123",
                    razorpay_signature: "dummy_sig"
                };

                const res = await walletApi.purchase(selectedPackage!.price, selectedPackage!.coins, dummyResponse);
                if (res) {
                    await fetchWallet();
                    setPaymentStatus('success');
                    Alert.alert('Success', `Successfully purchased ${selectedPackage!.coins} Coins!`);
                    setTimeout(() => setPaymentStatus('idle'), 2000);
                }
            } catch (e) {
                console.error(e);
                Alert.alert('Payment Failed', 'Failed to verify payment');
                setPaymentStatus('idle');
            }
        }, 2000);
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.centerAll]}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Buy Coins</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Hero Section */}
                <View style={styles.heroCard}>
                    <View style={styles.heroIconBg}>
                        <MaterialCommunityIcons name="currency-usd" size={32} color="#FFFFFF" />
                    </View>
                    <Text style={styles.heroTitle}>Recharge Wallet</Text>
                    <Text style={styles.heroSub}>Get coins to make voice & video calls</Text>
                </View>

                {/* First Time Offer */}
                {isFirstPurchase && firstTimePackage && (
                    <View style={styles.offerCard}>
                        <View style={styles.offerTag}>
                            <Text style={styles.offerTagText}>FIRST TIME ONLY</Text>
                        </View>
                        <View style={styles.offerRow}>
                            <View>
                                <Text style={styles.offerTitle}>{firstTimePackage.title}</Text>
                                <Text style={styles.offerDesc}>Get {firstTimePackage.coins} Coins for just ₹{firstTimePackage.price}!</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.buyBtn}
                                onPress={() => setSelectedPackage(firstTimePackage)}
                            >
                                <Text style={styles.buyBtnText}>Buy Now</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Daily Offer */}
                {dailyOfferPackage && (
                    <View style={styles.dailyCard}>
                        <View style={styles.offerRow}>
                            <View>
                                <Text style={styles.dailyTitle}>Daily Offer (9 AM - 9 PM)</Text>
                                <Text style={styles.dailyDesc}>{dailyOfferPackage.coins} Coins for ₹{dailyOfferPackage.price}</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.applyBtn, { backgroundColor: '#16A34A' }]}
                                onPress={() => setSelectedPackage(dailyOfferPackage)}
                            >
                                <Text style={styles.applyBtnText}>Apply Offer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Packages Grid */}
                <View style={styles.grid}>
                    {packages.map((pkg) => {
                        const isSelected = selectedPackage?.id === pkg.id;
                        return (
                            <TouchableOpacity
                                key={pkg.id}
                                style={[styles.pkgCard, isSelected && styles.pkgCardSelected]}
                                onPress={() => setSelectedPackage(pkg)}
                            >
                                {pkg.popular && (
                                    <View style={styles.popularTag}>
                                        <Text style={styles.popularTagText}>MOST POPULAR</Text>
                                    </View>
                                )}

                                <Text style={styles.coinsText}>{pkg.coins}</Text>
                                <Text style={styles.coinsLabel}>COINS</Text>

                                {pkg.bonus && pkg.bonus > 0 ? (
                                    <View style={styles.bonusTag}>
                                        <Text style={styles.bonusText}>+{pkg.bonus} Bonus</Text>
                                    </View>
                                ) : (
                                    <View style={{ height: 24, marginBottom: 12 }} />
                                )}

                                <View style={styles.priceTag}>
                                    <Text style={styles.priceText}>₹{pkg.price}</Text>
                                </View>

                                {isSelected && (
                                    <View style={styles.checkIcon}>
                                        <MaterialCommunityIcons name="check" size={12} color="#FFFFFF" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Payment Bottom Sheet (simplified) */}
            {selectedPackage && paymentStatus === 'idle' && (
                <View style={styles.bottomSheet}>
                    <View style={styles.bottomHeaderRow}>
                        <View>
                            <Text style={styles.bottomLabel}>Total to pay</Text>
                            <Text style={styles.bottomPrice}>₹{selectedPackage.price}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.bottomLabel}>You get</Text>
                            <View style={styles.flexRow}>
                                <MaterialCommunityIcons name="currency-usd" size={16} color="#D97706" />
                                <Text style={styles.totalCoins}>{selectedPackage.coins + (selectedPackage.bonus || 0)}</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.payBtn} onPress={handlePurchase}>
                        <MaterialCommunityIcons name="credit-card" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                        <Text style={styles.payBtnText}>Pay Securely</Text>
                    </TouchableOpacity>

                    <View style={styles.secureLine}>
                        <MaterialCommunityIcons name="shield-check" size={12} color="#94A3B8" />
                        <Text style={styles.secureText}>100% Secure Payment</Text>
                    </View>
                </View>
            )}

            {/* Confirmation Modal */}
            <Modal visible={paymentStatus === 'confirming' || paymentStatus === 'verifying' || paymentStatus === 'success'} transparent>
                <View style={styles.modalBg}>
                    <View style={styles.modalContent}>
                        {paymentStatus === 'confirming' && (
                            <>
                                <Text style={styles.modalTitle}>Confirm Purchase</Text>
                                <Text style={styles.modalDesc}>Pay ₹{selectedPackage?.price} for {selectedPackage?.coins} coins?</Text>
                                <TouchableOpacity style={styles.payBtnTextOnly} onPress={handleConfirmPayment}>
                                    <Text style={styles.payBtnText}>Confirm & Pay</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setPaymentStatus('idle')}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            </>
                        )}
                        {paymentStatus === 'verifying' && (
                            <>
                                <ActivityIndicator size="large" color="#8B5CF6" />
                                <Text style={styles.modalDesc}>Processing payment...</Text>
                            </>
                        )}
                        {paymentStatus === 'success' && (
                            <>
                                <MaterialCommunityIcons name="check-circle" size={48} color="#22C55E" />
                                <Text style={styles.modalTitle}>Success!</Text>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    centerAll: { justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
    },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
    scrollContent: { padding: 16, paddingBottom: 120 },

    heroCard: {
        backgroundColor: '#F59E0B',
        borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24
    },
    heroIconBg: {
        backgroundColor: 'rgba(255,255,255,0.2)', width: 64, height: 64,
        borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12
    },
    heroTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
    heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },

    offerCard: {
        backgroundColor: '#EC4899', borderRadius: 16, padding: 16, marginBottom: 24,
        position: 'relative'
    },
    offerTag: {
        position: 'absolute', top: 0, right: 0, backgroundColor: '#FACC15',
        paddingHorizontal: 8, paddingVertical: 4, borderBottomLeftRadius: 8, borderTopRightRadius: 16
    },
    offerTagText: { fontSize: 10, fontWeight: '800', color: '#000000' },
    offerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    offerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    offerDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 12, marginTop: 4 },
    buyBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    buyBtnText: { color: '#EC4899', fontWeight: '700', fontSize: 14 },

    dailyCard: {
        backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderWidth: 1,
        borderRadius: 16, padding: 16, marginBottom: 24
    },
    dailyTitle: { fontSize: 14, fontWeight: '700', color: '#065F46' },
    dailyDesc: { fontSize: 12, color: '#047857', marginTop: 2 },
    applyBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    applyBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    pkgCard: {
        width: '48%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
        alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'transparent',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05,
        elevation: 2, position: 'relative'
    },
    pkgCardSelected: { borderColor: '#8B5CF6', backgroundColor: '#F5F3FF' },
    popularTag: {
        position: 'absolute', top: -10, backgroundColor: '#EF4444',
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12
    },
    popularTagText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
    coinsText: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
    coinsLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', marginBottom: 8 },
    bonusTag: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 12 },
    bonusText: { color: '#166534', fontSize: 10, fontWeight: '700' },
    priceTag: { backgroundColor: '#F1F5F9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    priceText: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
    checkIcon: {
        position: 'absolute', top: 8, right: 8, backgroundColor: '#8B5CF6',
        borderRadius: 10, padding: 2
    },

    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#FFFFFF', padding: 24, borderTopLeftRadius: 32, borderTopRightRadius: 32,
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 10,
        elevation: 20
    },
    bottomHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    bottomLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
    bottomPrice: { fontSize: 28, fontWeight: '800', color: '#0F172A' },
    flexRow: { flexDirection: 'row', alignItems: 'center' },
    totalCoins: { fontSize: 20, fontWeight: '800', color: '#D97706' },
    payBtn: {
        backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 16, borderRadius: 16
    },
    payBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    secureLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
    secureText: { fontSize: 10, color: '#94A3B8', marginLeft: 4 },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: '#FFFFFF', padding: 24, borderRadius: 16, alignItems: 'center', width: '100%' },
    modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
    modalDesc: { color: '#64748B', marginBottom: 24, textAlign: 'center' },
    payBtnTextOnly: { backgroundColor: '#8B5CF6', width: '100%', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
    cancelBtn: { padding: 14, width: '100%', alignItems: 'center' },
    cancelBtnText: { color: '#64748B', fontWeight: '600' }
});
