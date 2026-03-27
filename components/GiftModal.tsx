import React, { useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { MotiView, MotiText, AnimatePresence } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/context/ThemeContext';

const { width, height } = Dimensions.get('window');

interface GiftModalProps {
  visible: boolean;
  onClose: () => void;
  giftName?: string;
  senderName?: string;
}

export const GiftModal: React.FC<GiftModalProps> = ({ 
  visible, 
  onClose, 
  giftName = 'Diamond Heart', 
  senderName = 'Someone Special' 
}) => {
  const { colors, isDark } = useTheme();
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <BlurView intensity={isDark ? 80 : 60} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        
        <AnimatePresence>
          {visible && (
            <View style={styles.content}>
               {/* Celebration Particles (Mock) */}
              <MotiView
                from={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ type: 'timing', duration: 2000, loop: true }}
                style={styles.particle}
              />

              {/* Gift Box Container */}
              <MotiView
                from={{ translateY: 100, opacity: 0, scale: 0.5 }}
                animate={{ translateY: 0, opacity: 1, scale: 1 }}
                exit={{ translateY: -100, opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', damping: 15 }}
                style={[styles.giftCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  style={styles.cardHeader}
                >
                  <MotiView
                    from={{ rotate: '-10deg' }}
                    animate={{ rotate: '10deg' }}
                    transition={{ type: 'timing', duration: 500, loop: true, repeatReverse: true }}
                  >
                    <MaterialCommunityIcons name="gift" size={80} color="#FFFFFF" />
                  </MotiView>
                </LinearGradient>

                <View style={styles.cardBody}>
                  <MotiText 
                    from={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 400 }}
                    style={[styles.congratsText, { color: colors.primary }]}
                  >
                    YOU RECEIVED A GIFT!
                  </MotiText>
                  
                  <Text style={[styles.giftTitle, { color: colors.text }]}>{giftName}</Text>
                  <Text style={[styles.senderText, { color: colors.textSecondary }]}>from {senderName}</Text>

                  <MotiView
                    from={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 600 }}
                  >
                    <TouchableOpacity style={[styles.claimBtn, { backgroundColor: colors.text }]} onPress={onClose}>
                      <Text style={[styles.claimBtnText, { color: colors.background }]}>THX! YOU'RE THE BEST</Text>
                    </TouchableOpacity>
                  </MotiView>
                </View>

                {/* Sparkling Stars */}
                {[...Array(5)].map((_, i) => (
                  <MotiView
                    key={i}
                    from={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ 
                      type: 'timing', 
                      duration: 1000, 
                      delay: 800 + i * 200, 
                      loop: true 
                    }}
                    style={[
                      styles.star, 
                      { 
                        top: Math.random() * 150, 
                        left: `${Math.random() * 100}%` as any
                      }
                    ]}
                  >
                    <MaterialCommunityIcons name="star" size={20} color="#FDE047" />
                  </MotiView>
                ))}
              </MotiView>
            </View>
          )}
        </AnimatePresence>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftCard: {
    width: width * 0.85,
    backgroundColor: '#1E293B',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 20,
  },
  cardHeader: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 32,
    alignItems: 'center',
  },
  congratsText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#8B5CF6',
    letterSpacing: 2,
    marginBottom: 8,
  },
  giftTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  senderText: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 32,
  },
  claimBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  claimBtnText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  particle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#EC4899',
  },
  star: {
    position: 'absolute',
  }
});
