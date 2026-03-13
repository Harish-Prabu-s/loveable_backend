import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { Gift, giftsApi } from '@/api/gifts';
import { useWalletStore } from '@/store/walletStore';
import { MotiTransitions } from '@/utils/animations';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  runOnJS
} from 'react-native-reanimated';

interface GiftOverlayProps {
  onClose: () => void;
  receiverId: number;
}

export const GiftOverlay: React.FC<GiftOverlayProps> = ({ onClose, receiverId }) => {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loading, setLoading] = useState(true);
  const { wallet, fetchWallet } = useWalletStore();
  const [flyingGift, setFlyingGift] = useState<Gift | null>(null);

  const flyProgress = useSharedValue(0);

  useEffect(() => {
    giftsApi.getGifts()
      .then(setGifts)
      .catch(() => Alert.alert('Error', 'Failed to load gifts'))
      .finally(() => setLoading(false));
  }, []);

  const flyingStyle = useAnimatedStyle(() => {
    return {
      opacity: flyProgress.value > 0 ? 1 : 0,
      transform: [
        { translateY: -flyProgress.value * 400 },
        { scale: 1 + flyProgress.value * 0.5 },
        { rotate: `${flyProgress.value * 360}deg` }
      ] as any[],
      position: 'absolute',
      alignSelf: 'center',
      top: '40%',
      zIndex: 999,
    };
  });

  const handleSend = async (gift: Gift) => {
    if (!wallet) return;
    if (wallet.coin_balance < gift.cost) {
      Alert.alert('Insufficient Coins', 'Please top up your wallet to send this gift.');
      return;
    }

    // Trigger flying animation
    setFlyingGift(gift);
    flyProgress.value = 0;
    flyProgress.value = withSequence(
      withTiming(1, { duration: 800 }),
      withTiming(0, { duration: 0 }, () => {
        runOnJS(setFlyingGift)(null);
      })
    );

    try {
      const res = await giftsApi.sendGift(gift.id, receiverId);

      // @ts-ignore
      if (res && (res.success || res.status === 'success' || res.coins_spent)) {
        Alert.alert('Success', `Sent ${gift.name}!`);
        fetchWallet(); // Sync wallet
        onClose();
      } else {
        Alert.alert('Notice', 'Gift sent but no confirmation received');
      }
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to send gift');
    }
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        {flyingGift && (
          <Animated.View style={flyingStyle}>
            <Text style={{ fontSize: 40 }}>{flyingGift.icon}</Text>
          </Animated.View>
        )}
        <MotiView
          style={styles.card}
          from={{ opacity: 0, translateY: 100 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={MotiTransitions.default}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <MaterialCommunityIcons name="gift" size={24} color="#EC4899" />
              <Text style={styles.title}>Send a Gift</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#EC4899" />
              <Text style={styles.loadingText}>Loading gifts...</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {gifts.map((gift, index) => (
                <MotiView
                  key={gift.id}
                  style={styles.giftItemWrapper}
                  from={{ opacity: 0, scale: 0.8, translateY: 20 }}
                  animate={{ opacity: 1, scale: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 300, delay: index * 50 }}
                >
                  <TouchableOpacity
                    style={styles.giftItem}
                    onPress={() => handleSend(gift)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.giftIcon}>{gift.icon}</Text>
                    <Text style={styles.giftName} numberOfLines={1}>{gift.name}</Text>
                    <View style={styles.costBadge}>
                      <Text style={styles.costText}>{gift.cost}</Text>
                      <View style={styles.coinDot} />
                    </View>
                  </TouchableOpacity>
                </MotiView>
              ))}
            </View>
          )}

          {/* Footer */}
          <Text style={styles.footerText}>Coins deducted from your wallet</Text>
        </MotiView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: 24,
    width: '100%',
    maxWidth: 400,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  giftItemWrapper: {
    width: '32%', // Adjusted to fit 3 in a row better with gap
  },
  giftItem: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  giftIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  giftName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E2E8F0',
    marginBottom: 6,
    textAlign: 'center',
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  costText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FACC15',
  },
  coinDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FACC15',
  },
  footerText: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
  }
});
