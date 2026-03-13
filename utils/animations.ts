import { withSpring, withTiming, Easing } from 'react-native-reanimated';

// ─── Spring Configurations ───
export const SPRING_CONFIG = {
    damping: 15,
    stiffness: 150,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
};

export const SPRING_CONFIG_BOUNCE = {
    damping: 10,
    stiffness: 200,
    mass: 1,
};

// ─── Timing Configurations ───
export const TIMING_CONFIG = {
    duration: 300,
    easing: Easing.out(Easing.cubic),
};

export const TIMING_FAST = {
    duration: 150,
    easing: Easing.out(Easing.quad),
};

// ─── Reanimated Helper Transitions ───
export const smoothSpring = (toValue: any) => {
    'worklet';
    return withSpring(toValue, SPRING_CONFIG);
};

export const bouncinSpring = (toValue: any) => {
    'worklet';
    return withSpring(toValue, SPRING_CONFIG_BOUNCE);
};

export const smoothTiming = (toValue: any, customDuration?: number) => {
    'worklet';
    return withTiming(toValue, {
        duration: customDuration || TIMING_CONFIG.duration,
        easing: TIMING_CONFIG.easing,
    });
};

// ─── Moti Preset Transitions ───
export const MotiTransitions = {
    default: {
        type: 'spring' as const,
        ...SPRING_CONFIG,
    },
    bounce: {
        type: 'spring' as const,
        ...SPRING_CONFIG_BOUNCE,
    },
    fade: {
        type: 'timing' as const,
        duration: 300,
    },
};
