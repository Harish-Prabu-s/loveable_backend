import * as React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  ViewStyle, 
  TextStyle,
  TouchableOpacityProps
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  style,
  textStyle,
  disabled,
  ...props
}) => {
  const { colors } = useTheme();

  const getVariantStyle = () => {
    switch (variant) {
      case 'secondary': return { backgroundColor: colors.surfaceAlt };
      case 'outline': return { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border };
      case 'ghost': return { backgroundColor: 'transparent' };
      default: return {}; // Gradient handles primary
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline': return { color: colors.primary };
      case 'ghost': return { color: colors.textSecondary };
      case 'secondary': return { color: colors.text };
      default: return { color: '#FFFFFF' };
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'sm': return styles.sm;
      case 'lg': return styles.lg;
      default: return styles.md;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.base, getVariantStyle(), getSizeStyle(), style, (disabled || loading) && styles.disabled]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {variant === 'primary' && (
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
      )}
      {loading ? (
        <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? colors.primary : '#FFFFFF'} />
      ) : (
        <Text style={[styles.textBase, getTextStyle(), textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  textBase: {
    fontWeight: '600',
    textAlign: 'center',
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  disabled: {
    opacity: 0.5,
  },
});
