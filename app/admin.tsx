import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, SafeAreaView, Switch,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import apiClient from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { monetizationApi, callsApi } from '@/api/vibely';

type AdminTab = 'users' | 'monetization' | 'calls' | 'betmatch';

// ── Users Tab ──────────────────────────────────────────────────────────────
function UsersTab() {
    const [q, setQ] = useState('');
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState<any[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/admin/users/', { params: { q, page } });
            setRows(res.data?.results || []);
            setCount(res.data?.count || 0);
        } catch { Alert.alert('Error', 'Failed to load users'); }
        finally { setLoading(false); }
    }, [q, page]);

    useEffect(() => { load(); }, [page]);

    const banUser = (id: number, name: string) => {
        Alert.alert('Ban User', `Ban ${name}?`, [
            {
                text: 'Ban', style: 'destructive', onPress: async () => {
                    try {
                        await apiClient.post(`/admin/users/${id}/ban/`);
                        Alert.alert('Done', `${name} has been banned.`);
                        load();
                    } catch { Alert.alert('Error', 'Could not ban user.'); }
                }
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    return (
        <View style={styles.tabContent}>
            <View style={styles.searchRow}>
                <TextInput style={styles.searchInput} placeholder="Search name/phone" placeholderTextColor="#64748B" value={q} onChangeText={setQ} />
                <TouchableOpacity style={styles.searchBtn} onPress={() => { setPage(1); load(); }}>
                    <Text style={styles.searchBtnText}>Search</Text>
                </TouchableOpacity>
            </View>
            {loading ? <ActivityIndicator style={{ marginTop: 30 }} color="#8B5CF6" /> : (
                <>
                    {rows.map(r => (
                        <View key={r.id} style={styles.userRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.userName2}>{r.name}</Text>
                                <Text style={styles.userPhone}>{r.phone_number}</Text>
                                <View style={styles.callStats}>
                                    <Text style={styles.statChip}>📹 {r.video_call_count}</Text>
                                    <Text style={styles.statChip}>📞 {r.audio_call_count}</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.banBtn} onPress={() => banUser(r.id, r.name)}>
                                <Text style={styles.banBtnText}>Ban</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                    {rows.length === 0 && <Text style={styles.emptyMsg}>No users found.</Text>}
                    <View style={styles.pagination}>
                        <TouchableOpacity disabled={page <= 1} onPress={() => setPage(p => p - 1)} style={[styles.pageBtn, page <= 1 && { opacity: 0.4 }]}>
                            <Text style={styles.pageBtnText}>← Prev</Text>
                        </TouchableOpacity>
                        <Text style={styles.pageInfo}>Page {page} / {Math.ceil(count / 10) || 1}</Text>
                        <TouchableOpacity disabled={page * 10 >= count} onPress={() => setPage(p => p + 1)} style={[styles.pageBtn, page * 10 >= count && { opacity: 0.4 }]}>
                            <Text style={styles.pageBtnText}>Next →</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}

// ── Monetization Tab ────────────────────────────────────────────────────────
function MonetizationTab() {
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try { setRules(await monetizationApi.getRules()); }
        catch { Alert.alert('Error', 'Could not load rules.'); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const updateRule = async (rule: any) => {
        try {
            await monetizationApi.updateRule(rule.id, rule);
            Alert.alert('Saved', `${rule.action_type} updated.`);
        } catch { Alert.alert('Error', 'Could not save.'); }
    };

    const setField = (id: number, field: string, value: any) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    if (loading) return <ActivityIndicator style={{ marginTop: 30 }} color="#8B5CF6" />;

    return (
        <View style={styles.tabContent}>
            {rules.map(rule => (
                <View key={rule.id} style={styles.ruleCard}>
                    <View style={styles.ruleHeader}>
                        <Text style={styles.ruleType}>{rule.action_type.replace(/_/g, ' ').toUpperCase()}</Text>
                        <Switch value={rule.is_active} onValueChange={v => setField(rule.id, 'is_active', v)} />
                    </View>
                    {[
                        { label: 'Cost/min (coins)', field: 'cost_per_minute' },
                        { label: 'Cost/message', field: 'cost_per_message' },
                        { label: 'Cost/media', field: 'cost_per_media' },
                        { label: 'Night multiplier', field: 'night_cost_multiplier' },
                        { label: 'Reward (male coins)', field: 'reward_male' },
                        { label: 'Reward (female ₹)', field: 'reward_female' },
                    ].map(({ label, field }) => (
                        <View key={field} style={styles.ruleRow}>
                            <Text style={styles.ruleLabel}>{label}</Text>
                            <TextInput
                                style={styles.ruleInput}
                                value={String(rule[field])}
                                keyboardType="decimal-pad"
                                onChangeText={v => setField(rule.id, field, v)}
                            />
                        </View>
                    ))}
                    <TouchableOpacity style={styles.saveBtn} onPress={() => updateRule(rule)}>
                        <Text style={styles.saveBtnText}>Save</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </View>
    );
}

// ── Call Logs Tab ────────────────────────────────────────────────────────────
function CallLogsTab() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        callsApi.getLogs().then(setLogs).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <ActivityIndicator style={{ marginTop: 30 }} color="#8B5CF6" />;

    return (
        <View style={styles.tabContent}>
            {logs.map(log => (
                <View key={log.id} style={styles.logRow}>
                    <MaterialCommunityIcons name={log.call_type === 'VIDEO' ? 'video' : 'phone'} size={20} color={log.call_type === 'VIDEO' ? '#3B82F6' : '#10B981'} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.logTitle}>{log.caller_name || 'Unknown'} → {log.callee_name || 'Unknown'}</Text>
                        <Text style={styles.logSub}>{log.call_type} · {Math.floor((log.duration_seconds || 0) / 60)}m {(log.duration_seconds || 0) % 60}s · {log.coins_spent || 0} coins</Text>
                        <Text style={styles.logDate}>{new Date(log.started_at).toLocaleDateString()}</Text>
                    </View>
                </View>
            ))}
            {logs.length === 0 && <Text style={styles.emptyMsg}>No call logs.</Text>}
        </View>
    );
}

// ── Bet Match Tab ────────────────────────────────────────────────────────────
function BetMatchTab() {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiClient.get('/betmatch/list/?status=completed').then(r => setMatches(r.data || [])).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <ActivityIndicator style={{ marginTop: 30 }} color="#8B5CF6" />;

    return (
        <View style={styles.tabContent}>
            {matches.map(m => (
                <View key={m.id} style={styles.logRow}>
                    <Text style={{ fontSize: 20 }}>{m.winner_gender === 'M' ? '♂️' : '♀️'}</Text>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.logTitle}>Match #{m.id} · {m.status}</Text>
                        <Text style={styles.logSub}>{m.male_user_name} vs {m.female_user_name || 'Waiting…'}</Text>
                        <Text style={styles.logSub}>Winner: {m.winner_gender === 'M' ? `${m.male_user_name} (+${m.result_coins} coins)` : m.winner_gender === 'F' ? `${m.female_user_name} (₹${m.result_money})` : 'TBD'}</Text>
                    </View>
                </View>
            ))}
            {matches.length === 0 && <Text style={styles.emptyMsg}>No completed bet matches.</Text>}
        </View>
    );
}

// ── Main Admin Screen ─────────────────────────────────────────────────────
export default function AdminScreen() {
    const { user } = useAuthStore();
    const isAdmin = !!(user as any)?.is_superuser || !!(user as any)?.is_staff;
    const [tab, setTab] = useState<AdminTab>('users');

    useEffect(() => {
        if (!isAdmin) { router.replace('/(tabs)'); }
    }, [isAdmin]);

    if (!isAdmin) return null;

    const tabs: { key: AdminTab; label: string; icon: any }[] = [
        { key: 'users', label: 'Users', icon: 'account-group' },
        { key: 'monetization', label: 'Pricing', icon: 'currency-inr' },
        { key: 'calls', label: 'Call Logs', icon: 'phone-log' },
        { key: 'betmatch', label: 'Bet Matches', icon: 'sword-cross' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={22} color="#F1F5F9" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>👑 Admin Dashboard</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
                {tabs.map(t => (
                    <TouchableOpacity key={t.key} style={[styles.adminTab, tab === t.key && styles.adminTabActive]} onPress={() => setTab(t.key)}>
                        <MaterialCommunityIcons name={t.icon} size={16} color={tab === t.key ? '#FFF' : '#64748B'} />
                        <Text style={[styles.adminTabLabel, tab === t.key && { color: '#FFF' }]}>{t.label}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                {tab === 'users' && <UsersTab />}
                {tab === 'monetization' && <MonetizationTab />}
                {tab === 'calls' && <CallLogsTab />}
                {tab === 'betmatch' && <BetMatchTab />}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#F1F5F9' },
    tabsRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
    adminTab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B' },
    adminTabActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
    adminTabLabel: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    tabContent: { padding: 16 },

    // Users tab
    searchRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    searchInput: { flex: 1, backgroundColor: '#0F172A', borderRadius: 10, paddingHorizontal: 12, height: 44, color: '#F1F5F9', borderWidth: 1, borderColor: '#1E293B', fontSize: 14 },
    searchBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' },
    searchBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1E293B' },
    userName2: { fontSize: 15, fontWeight: '700', color: '#F1F5F9' },
    userPhone: { fontSize: 12, color: '#64748B', marginTop: 2 },
    callStats: { flexDirection: 'row', gap: 10, marginTop: 6 },
    statChip: { fontSize: 11, color: '#94A3B8' },
    banBtn: { backgroundColor: 'rgba(239,68,68,0.15)', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
    banBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 12 },
    pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
    pageBtn: { backgroundColor: '#0F172A', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
    pageBtnText: { color: '#F1F5F9', fontWeight: '600', fontSize: 13 },
    pageInfo: { color: '#64748B', fontSize: 13 },
    emptyMsg: { textAlign: 'center', color: '#64748B', padding: 30 },

    // Monetization tab
    ruleCard: { backgroundColor: '#0F172A', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#1E293B' },
    ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    ruleType: { fontSize: 13, fontWeight: '800', color: '#8B5CF6', letterSpacing: 0.5 },
    ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    ruleLabel: { fontSize: 12, color: '#94A3B8', flex: 1 },
    ruleInput: { backgroundColor: '#1E293B', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 5, color: '#F1F5F9', width: 80, textAlign: 'right', fontSize: 14 },
    saveBtn: { backgroundColor: '#8B5CF6', paddingVertical: 8, borderRadius: 8, alignItems: 'center', marginTop: 6 },
    saveBtnText: { color: '#FFF', fontWeight: '700' },

    // Logs
    logRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#0F172A', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1E293B' },
    logTitle: { fontSize: 14, fontWeight: '700', color: '#F1F5F9' },
    logSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
    logDate: { fontSize: 11, color: '#475569', marginTop: 3 },
});
