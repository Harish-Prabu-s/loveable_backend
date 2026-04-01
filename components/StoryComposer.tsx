// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
  SafeAreaView, Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import { storiesApi } from '@/api/stories';

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export default function StoryComposer({ onClose, onCreated }: Props) {
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [selectedMedia, setSelectedMedia] = useState<{ uri: string, type: 'image' | 'video' } | null>(null);
  const [textOverlay, setTextOverlay] = useState<string>('');
  const [filter, setFilter] = useState({ brightness: 100, contrast: 100, blur: 0 });
  const [uploading, setUploading] = useState(false);

  const isVideo = selectedMedia?.type === 'video';
  const player = useVideoPlayer(isVideo ? selectedMedia.uri : null, p => {
    p.loop = true;
  });

  useEffect(() => {
    if (isVideo) {
      player.play();
    } else {
      player.pause();
    }
  }, [isVideo, selectedMedia?.uri, player]);

  const pickMedia = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mode === 'photo' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedMedia({
          uri: result.assets[0].uri,
          type: result.assets[0].type === 'video' ? 'video' : 'image'
        });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to pick media');
    }
  };

  const captureMedia = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos/videos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: mode === 'photo' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedMedia({
          uri: result.assets[0].uri,
          type: result.assets[0].type === 'video' ? 'video' : 'image'
        });
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to launch camera');
    }
  };

  const handleShare = async () => {
    if (!selectedMedia) return;

    setUploading(true);
    try {
      const { url } = await storiesApi.uploadMedia(selectedMedia.uri, selectedMedia.type);
      await storiesApi.createStory(url, selectedMedia.type);
      onCreated();
      onClose();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to upload story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide">
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, mode === 'photo' && styles.tabActive]}
                onPress={() => { setMode('photo'); setSelectedMedia(null); }}
              >
                <Text style={[styles.tabText, mode === 'photo' && styles.tabTextActive]}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'video' && styles.tabActive]}
                onPress={() => { setMode('video'); setSelectedMedia(null); }}
              >
                <Text style={[styles.tabText, mode === 'video' && styles.tabTextActive]}>Video</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
            {/* Preview or Empty State */}
            <View style={styles.previewContainer}>
              {selectedMedia ? (
                <View style={styles.mediaWrapper}>
                  {selectedMedia.type === 'video' ? (
                    <VideoView
                      player={player}
                      style={styles.media}
                      contentFit="cover"
                      nativeControls={false}
                    />
                  ) : (
                    <Image
                      source={{ uri: selectedMedia.uri }}
                      style={styles.media}
                      contentFit="cover"
                    />
                  )}

                  {/* Overlay Text Preview */}
                  {textOverlay ? (
                    <Text style={styles.overlayTextPreview}>{textOverlay}</Text>
                  ) : null}

                  <TouchableOpacity
                    style={styles.retakeBtn}
                    onPress={() => setSelectedMedia(null)}
                  >
                    <MaterialCommunityIcons name="close" size={16} color="#FFFFFF" />
                    <Text style={styles.retakeText}>Retake</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyStateRow}>
                  <TouchableOpacity style={styles.actionCard} onPress={captureMedia}>
                    <View style={styles.actionIconBg}>
                      <MaterialCommunityIcons name="camera" size={32} color="#8B5CF6" />
                    </View>
                    <Text style={styles.actionText}>Open Camera</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionCard} onPress={pickMedia}>
                    <View style={styles.actionIconBg}>
                      <MaterialCommunityIcons name="image-multiple" size={32} color="#8B5CF6" />
                    </View>
                    <Text style={styles.actionText}>Upload File</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Editing Tools (Only for Photos in this context) */}
            {mode === 'photo' && selectedMedia && (
              <View style={styles.editingTools}>
                <View style={styles.toolSection}>
                  <View style={styles.toolHeader}>
                    <MaterialCommunityIcons name="typewriter" size={16} color="#8B5CF6" />
                    <Text style={styles.toolTitle}>Text Overlay</Text>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    value={textOverlay}
                    onChangeText={setTextOverlay}
                    placeholder="Add caption text..."
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                {/* Simulated Sliders for UI representation */}
                <View style={[styles.toolSection, { marginTop: 16 }]}>
                  <View style={styles.toolHeader}>
                    <MaterialCommunityIcons name="magic-staff" size={16} color="#8B5CF6" />
                    <Text style={styles.toolTitle}>Filters & Effects (Placeholder)</Text>
                  </View>

                  <View style={styles.sliderRow}>
                    <Text style={styles.sliderLabel}>Brightness</Text>
                    <Text style={styles.sliderValue}>{filter.brightness}%</Text>
                  </View>

                  <View style={styles.sliderRow}>
                    <Text style={styles.sliderLabel}>Contrast</Text>
                    <Text style={styles.sliderValue}>{filter.contrast}%</Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelFooterBtn}
              onPress={onClose}
              disabled={uploading}
            >
              <Text style={styles.cancelFooterText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shareBtn, (!selectedMedia || uploading) && styles.shareBtnDisabled]}
              onPress={handleShare}
              disabled={!selectedMedia || uploading}
            >
              <MaterialCommunityIcons name="content-save" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.shareBtnText}>
                {uploading ? 'Uploading...' : 'Share Story'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  keyboardView: {
    backgroundColor: '#FAFAFA',
    borderRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  tabActive: {
    backgroundColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  previewContainer: {
    marginBottom: 24,
  },
  emptyStateRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginTop: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  actionIconBg: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  mediaWrapper: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000000',
    borderRadius: 16,
    overflow: 'hidden',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  overlayTextPreview: {
    position: 'absolute',
    bottom: '20%',
    left: 16,
    right: 16,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  retakeBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retakeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  editingTools: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  toolSection: {
    marginBottom: 8,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 12,
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginLeft: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  sliderValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelFooterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelFooterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 8,
  },
  shareBtnDisabled: {
    opacity: 0.5,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  }
});
