import React from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import StreakViewer from '@/components/StreakViewer';

export default function StreakDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    return (
        <StreakViewer
            visible={true}
            uploadId={id ? parseInt(id) : null}
            onClose={() => router.back()}
        />
    );
}
