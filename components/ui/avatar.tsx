import React, { useState } from 'react';
import { View, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';

interface AvatarProps {
    className?: string;
    style?: ViewStyle;
    children: React.ReactNode;
}

export const Avatar: React.FC<AvatarProps> = ({ style, children }) => {
    return (
        <View style={[styles.avatar, style]}>
            {children}
        </View>
    );
};

interface AvatarImageProps {
    className?: string;
    src?: string;
    style?: ImageStyle;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({ src, style }) => {
    const [error, setError] = useState(false);

    if (!src || error) {
        return null;
    }

    return (
        <Image
            source={{ uri: src }}
            style={[styles.image, style]}
            onError={() => setError(true)}
        />
    );
};

interface AvatarFallbackProps {
    className?: string;
    children: React.ReactNode;
    style?: ViewStyle;
}

export const AvatarFallback: React.FC<AvatarFallbackProps> = ({ children, style }) => {
    return (
        <View style={[styles.fallback, style]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    avatar: {
        position: 'relative',
        display: 'flex',
        height: 48, // default size, can be overridden by style
        width: 48,
        overflow: 'hidden',
        borderRadius: 9999,
        backgroundColor: '#e5e7eb', // gray-200 equivalent
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        height: '100%',
        width: '100%',
        borderRadius: 9999,
    },
    fallback: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 9999,
        backgroundColor: '#f3f4f6', // gray-100 equivalent
    },
});
