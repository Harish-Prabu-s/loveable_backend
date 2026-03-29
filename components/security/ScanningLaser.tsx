import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { MotiView } from 'moti';

const { height, width } = Dimensions.get('window');

interface ScanningLaserProps {
    color?: string;
    active?: boolean;
}

export const ScanningLaser = ({ color = '#8B5CF6', active = true }: ScanningLaserProps) => {
    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {active && (
                <MotiView
                    from={{ translateY: -height * 0.2, opacity: 0 }}
                    animate={{ translateY: height * 0.6, opacity: [0, 1, 1, 0] }}
                    transition={{
                        type: 'timing',
                        duration: 2000,
                        loop: true,
                    }}
                    style={[styles.laser, { shadowColor: color, backgroundColor: color }]}
                >
                    <View style={[styles.glow, { backgroundColor: color }]} />
                </MotiView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    laser: {
        width: '100%',
        height: 2,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 10,
        zIndex: 100,
    },
    glow: {
        position: 'absolute',
        top: -10,
        width: '100%',
        height: 20,
        opacity: 0.3,
    }
});
