import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, DimensionValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: any;
}

export const Skeleton = ({ width, height, borderRadius = 8, style }: SkeletonProps) => {
    const animatedValue = new Animated.Value(0);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const opacity = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                {
                    width,
                    height,
                    borderRadius,
                    backgroundColor: '#1E293B',
                    opacity,
                },
                style,
            ]}
        />
    );
};

export const SkeletonCard = () => (
    <View style={styles.card}>
        <Skeleton width={60} height={60} borderRadius={30} style={styles.avatar} />
        <View style={styles.content}>
            <Skeleton width="60%" height={20} style={styles.line} />
            <Skeleton width="40%" height={15} style={styles.line} />
        </View>
    </View>
);

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#0F172A',
        borderRadius: 16,
        marginBottom: 12,
        alignItems: 'center',
    },
    avatar: {
        marginRight: 16,
    },
    content: {
        flex: 1,
    },
    line: {
        marginBottom: 8,
    },
});
