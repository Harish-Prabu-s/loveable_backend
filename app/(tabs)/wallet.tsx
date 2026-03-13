import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { walletApi } from '@/api/wallet';
import { useAuthStore } from '@/store/authStore';
import { useWalletStore } from '@/store/walletStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { router } from 'expo-router';

export default function WalletScreen() {
  const { user } = useAuthStore();
  const { wallet, isLoading: loading, fetchWallet } = useWalletStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const isFemale = user?.gender === 'F';

  const isOfferTime = () => {
    const now = new Date();
    const h = now.getHours();
    return h >= 9 && h < 21;
  };

  const getOfferCountKey = () => {
    const d = new Date();
    return `offer_claim_count_${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  };

  const [offerClaimsToday, setOfferClaimsToday] = useState(0);

  const loadOfferClaims = async () => {
    try {
      const val = await AsyncStorage.getItem(getOfferCountKey());
      setOfferClaimsToday(val ? parseInt(val, 10) || 0 : 0);
    } catch { /* ignore */ }
  };

  const remainingClaims = Math.max(0, 2 - offerClaimsToday);
  const rupees = Math.floor((wallet?.coin_balance ?? 0) / 10);
  const minWithdraw = isFemale ? 50 : 500;

  const loadData = async () => {
    try {
      await fetchWallet();
      const txData = await walletApi.getTransactions();
      setTransactions(txData.results || []);
    } catch (error) {
      console.error('Failed to load wallet data', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
    loadOfferClaims();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F9FAFB" />
        }
      >
        <Text style={styles.headerTitle}>My Wallet</Text>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <View style={styles.coinContainer}>
              <MaterialCommunityIcons name="database" size={32} color="#FBBF24" />
              <Text style={styles.balanceValue}>{loading ? '...' : wallet?.coin_balance ?? 0}</Text>
            </View>
          </View>

          {/* Offer Section */}
          <View style={styles.offerContainer}>
            <View style={styles.offerInfo}>
              <Text style={styles.offerTitle}>Today's Offer (9 AM - 9 PM)</Text>
              <Text style={styles.offerText}>700 Coins for ₹199</Text>
              <Text style={styles.offerSubtext}>
                Remaining: {isOfferTime() ? `${remainingClaims}/2` : '0/2'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.offerButton,
                (!isOfferTime() || remainingClaims <= 0) && styles.disabledButton
              ]}
              disabled={!isOfferTime() || remainingClaims <= 0}
              onPress={() => router.push('/wallet/purchase' as any)}
            >
              <Text style={styles.offerButtonText}>Get Offer</Text>
            </TouchableOpacity>
          </View>

          {isFemale ? (
            <View style={styles.earningsContainer}>
              <View>
                <Text style={styles.earningsLabel}>Estimated Earnings</Text>
                <Text style={styles.earningsValue}>₹ {rupees}</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.withdrawButton,
                  rupees < minWithdraw && styles.disabledButton
                ]}
                disabled={rupees < minWithdraw}
                onPress={() => Alert.alert(
                  'Withdraw Request',
                  `Minimum withdrawal is ₹${minWithdraw}. Your current balance is ₹${rupees}. Please contact support@loveableapp.com to process your withdrawal.`,
                  [{ text: 'OK' }]
                )}
              >
                <Text style={styles.withdrawButtonText}>Withdraw</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              label="Add Coins"
              onPress={() => router.push('/wallet/purchase' as any)}
              style={styles.addCoinsButton}
            />
          )}
        </View>

        {/* Transactions Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/wallet/transactions' as any)}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transactionsCard}>
          {loading && !refreshing ? (
            <ActivityIndicator size="large" color="#F9FAFB" style={styles.loader} />
          ) : transactions.length > 0 ? (
            transactions.slice(0, 10).map((tx, index) => (
              <View key={tx.id || index} style={styles.transactionItem}>
                <View style={styles.txIconContainer}>
                  <MaterialCommunityIcons
                    name={tx.type === 'credit' ? 'plus-circle' : 'minus-circle'}
                    size={24}
                    color={tx.type === 'credit' ? '#10B981' : '#EF4444'}
                  />
                </View>
                <View style={styles.txInfo}>
                  <Text style={styles.txDescription}>{tx.description}</Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[
                  styles.txAmount,
                  { color: tx.type === 'credit' ? '#10B981' : '#F9FAFB' }
                ]}>
                  {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No transactions yet</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1F2937',
    marginBottom: 32,
  },
  balanceHeader: {
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  offerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  offerInfo: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  offerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  offerSubtext: {
    fontSize: 10,
    color: '#64748B',
  },
  offerButton: {
    backgroundColor: '#FBBF24',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  offerButtonText: {
    color: '#020617',
    fontSize: 12,
    fontWeight: '700',
  },
  earningsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  withdrawButton: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  withdrawButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  addCoinsButton: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  transactionsCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
    overflow: 'hidden',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  txIconContainer: {
    marginRight: 12,
  },
  txInfo: {
    flex: 1,
  },
  txDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  txDate: {
    fontSize: 12,
    color: '#64748B',
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  loader: {
    padding: 40,
  },
  emptyText: {
    padding: 40,
    textAlign: 'center',
    color: '#64748B',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
