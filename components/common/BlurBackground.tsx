import React from 'react';
import { StyleSheet, View, ImageBackground, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface BlurBackgroundProps {
  children?: React.ReactNode;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

import { useTheme } from '@/context/ThemeContext';

export const BlurBackground: React.FC<BlurBackgroundProps> = ({ 
  children, 
  intensity = 30, 
  tint = 'dark',
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      {/* Base Background Image (Abstract premium mesh) */}
      <ImageBackground 
        source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000' }} 
        style={styles.bgImage}
        resizeMode="cover"
      >
        <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill}>
           <LinearGradient
            colors={[colors.background + 'B3', 'transparent', colors.background]}
            style={StyleSheet.absoluteFill}
          />
          {children}
        </BlurView>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A091E',
  },
  bgImage: {
    width,
    height,
    flex: 1,
  },
});
