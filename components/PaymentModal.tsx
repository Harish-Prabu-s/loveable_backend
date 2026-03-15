import * as React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  coins: number;
  onConfirm: () => void;
  status: 'idle' | 'processing' | 'success';
}

export function PaymentModal({ isOpen, onClose, amount, coins, onConfirm, status }: PaymentModalProps) {
  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={() => status !== 'processing' && status !== 'success' && onClose()}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Secure Payment</Text>
              <Text style={styles.description}>
                Complete your purchase of {coins} coins for ₹{amount}
              </Text>
            </View>
            {status === 'idle' && (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>

          {status === 'idle' && (
            <View style={styles.content}>
              <View style={styles.amountBox}>
                <Text style={styles.amountLabel}>Total Amount</Text>
                <Text style={styles.amountValue}>₹{amount}</Text>
              </View>

              <TouchableOpacity style={styles.payBtn} onPress={onConfirm}>
                <Text style={styles.payBtnText}>Pay ₹{amount}</Text>
              </TouchableOpacity>

              <View style={styles.secureFooter}>
                <MaterialCommunityIcons name="shield-check" size={14} color="#64748B" />
                <Text style={styles.secureText}>Secured by Razorpay</Text>
              </View>
            </View>
          )}

          {status === 'processing' && (
            <View style={styles.statusContent}>
              <ActivityIndicator size="large" color="#8B5CF6" style={{ marginBottom: 16 }} />
              <Text style={styles.statusTitle}>Verifying Payment</Text>
              <Text style={styles.statusDesc}>Please do not close this window...</Text>
            </View>
          )}

          {status === 'success' && (
            <View style={styles.statusContent}>
              <View style={styles.successIconBox}>
                <MaterialCommunityIcons name="check-circle" size={48} color="#16A34A" />
              </View>
              <Text style={[styles.statusTitle, { color: '#16A34A' }]}>Payment Successful!</Text>
              <Text style={styles.statusDesc}>Your coins have been added to your wallet.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#64748B',
  },
  closeBtn: {
    padding: 4,
    marginLeft: 16,
  },
  content: {
    padding: 24,
  },
  amountBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
  },
  payBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  secureText: {
    fontSize: 12,
    color: '#64748B',
  },
  statusContent: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  statusDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  successIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  }
});
