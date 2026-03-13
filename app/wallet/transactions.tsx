import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { walletApi } from '@/api/wallet';
import type { CoinTransaction } from '@/types';
import { useAuthStore } from '@/store/authStore';

export default function TransactionsScreen() {
    const { user } = useAuthStore();
    const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const txData = await walletApi.getTransactions();
                // Check if paginated response (.results) or direct array
                const list = Array.isArray(txData) ? txData : txData?.results || [];
                setTransactions(list);
            } catch (error) {
                console.error('Failed to load transactions', error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Transaction History</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Content */}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.cardContainer}>
                    {loading ? (
                        <View style={styles.emptyContainer}>
                            <ActivityIndicator size="large" color="#8B5CF6" />
                            <Text style={styles.emptyText}>Loading transactions...</Text>
                        </View>
                    ) : transactions.length > 0 ? (
                        <View style={styles.listContainer}>
                            {transactions.map((tx, index) => {
                                const isCredit = tx.type === 'credit';

                                return (
                                    <View
                                        key={tx.id || index.toString()}
                                        style={[styles.txItem, index !== transactions.length - 1 && styles.borderBottom]}
                                    >
                                        <View style={styles.txLeft}>
                                            <View style={[styles.iconBox, isCredit ? styles.iconBoxCredit : styles.iconBoxDebit]}>
                                                <MaterialCommunityIcons
                                                    name={isCredit ? "plus" : "arrow-top-right"}
                                                    size={20}
                                                    color={isCredit ? "#16A34A" : "#DC2626"}
                                                />
                                            </View>
                                            <View style={styles.txInfo}>
                                                <Text style={styles.txDesc}>{tx.description}</Text>
                                                <Text style={styles.txTime}>
                                                    {new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text style={[styles.txAmount, isCredit ? styles.txAmountCredit : styles.txAmountDebit]}>
                                            {isCredit ? '+' : ''}{tx.amount}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="history" size={48} color="#CBD5E1" style={{ marginBottom: 12 }} />
                            <Text style={styles.emptyText}>No transactions yet</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0F172A',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    listContainer: {
        padding: 8,
    },
    txItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    txLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 16,
    },
    iconBox: {
        padding: 10,
        borderRadius: 20,
        marginRight: 12,
    },
    iconBoxCredit: {
        backgroundColor: '#DCFCE7',
    },
    iconBoxDebit: {
        backgroundColor: '#FEE2E2',
    },
    txInfo: {
        flex: 1,
    },
    txDesc: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
        marginBottom: 4,
    },
    txTime: {
        fontSize: 12,
        color: '#64748B',
    },
    txAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    txAmountCredit: {
        color: '#16A34A',
    },
    txAmountDebit: {
        color: '#0F172A',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#64748B',
    }
});
