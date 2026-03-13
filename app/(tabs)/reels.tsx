import React from 'react';
import { StyleSheet, View } from 'react-native';
import ReelsFeed from '@/components/ReelsFeed';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ReelsScreen() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ReelsFeed />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
});
