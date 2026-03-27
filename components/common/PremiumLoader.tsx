import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MotiView, MotiText } from 'moti';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

interface PremiumLoaderProps {
  message?: string;
}

export const PremiumLoader: React.FC<PremiumLoaderProps> = ({ message = 'Loading...' }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.loaderWrapper}>
         {/* Pulsing Outer Ring */}
        <MotiView
          from={{ scale: 0.8, opacity: 0.3 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{
            type: 'timing',
            duration: 2000,
            loop: true,
            repeatReverse: false,
          }}
          style={[styles.ring, { borderColor: colors.primary }]}
        />
        
        {/* Rotating Gradient Core */}
        <MotiView
          animate={{ rotate: '360deg' }}
          transition={{
            type: 'timing',
            duration: 1500,
            loop: true,
            repeatReverse: false,
          }}
          style={styles.coreContainer}
        >
          <LinearGradient
            colors={[colors.accent, colors.primary, colors.accentLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.core}
          />
        </MotiView>

        {/* Inner Pulsing Circle */}
        <MotiView
          from={{ scale: 0.9 }}
          animate={{ scale: 1.1 }}
          transition={{
            type: 'timing',
            duration: 800,
            loop: true,
          }}
          style={styles.innerCircle}
        />
      </View>

      <MotiText
        from={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{
          type: 'timing',
          duration: 1000,
          loop: true,
        }}
        style={[styles.loadingText, { color: colors.textSecondary }]}
      >
        {message}
      </MotiText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loaderWrapper: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  ring: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  coreContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  core: {
    flex: 1,
  },
  innerCircle: {
      position: 'absolute',
      width: 15,
      height: 15,
      borderRadius: 7.5,
      backgroundColor: '#FFFFFF',
      zIndex: 10,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
