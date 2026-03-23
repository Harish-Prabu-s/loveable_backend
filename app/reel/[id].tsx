import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text, Dimensions } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ReelItem } from '@/components/ReelItem';
import { reelsApi, Reel } from '@/api/reels';
import { useTheme } from '@/context/ThemeContext';
import { toast } from '@/utils/toast';

const { height, width } = Dimensions.get('window');

export default function ReelDetailScreen() {
  const { id } = useLocalSearchParams();
  const { colors } = useTheme();
  const [reel, setReel] = useState<Reel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReel();
  }, [id]);

  const loadReel = async () => {
    try {
      setLoading(true);
      const data = await reelsApi.getReel(Number(id));
      setReel(data);
    } catch (e) {
      console.error('Failed to load reel:', e);
      toast.error("Failed to load reel");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (reelId: number) => {
    router.back();
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#000' }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (!reel) {
    return (
      <View style={[styles.center, { backgroundColor: '#000' }]}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#FFF" />
        <Text style={[styles.errorText, { color: '#FFF' }]}>Reel not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={{ color: '#8B5CF6' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        headerShown: false,
      }} />
      
      <ReelItem 
        item={reel} 
        isVisible={true} 
        isFocused={true} 
        onDelete={handleDelete} 
      />

      <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
        <MaterialCommunityIcons name="close" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { marginTop: 10, fontSize: 16 },
  backBtn: { marginTop: 20 },
  closeButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  }
});
