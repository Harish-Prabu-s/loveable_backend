import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { reportsApi } from '@/api/reports';

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportedUserId: number;
}

const REPORT_OPTIONS = [
  { id: 'abuse', label: 'Abuse / Harassment' },
  { id: 'nudity', label: 'Nudity / Inappropriate' },
  { id: 'spam', label: 'Spam / Scam' },
  { id: 'other', label: 'Other' }
];

export default function ReportDialog({ isOpen, onClose, reportedUserId }: ReportDialogProps) {
  const [reason, setReason] = useState<'abuse' | 'nudity' | 'spam' | 'other' | ''>('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Required', 'Please select a reason');
      return;
    }
    setIsSubmitting(true);
    try {
      await reportsApi.createReport({
        reported_user_id: reportedUserId,
        reason: reason as any,
        description
      });
      Alert.alert('Success', 'Report submitted. We will investigate.');
      setReason('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <MaterialCommunityIcons name="flag" size={20} color="#DC2626" />
              <Text style={styles.headerTitle}>Report User</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.promptText}>Why are you reporting this user?</Text>

            <View style={styles.optionsContainer}>
              {REPORT_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.optionBtn,
                    reason === opt.id && styles.optionBtnActive
                  ]}
                  onPress={() => setReason(opt.id as any)}
                >
                  <Text style={[
                    styles.optionText,
                    reason === opt.id && styles.optionTextActive
                  ]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.textInput}
              placeholder="Additional details (optional)..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  promptText: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  optionBtn: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  optionBtnActive: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  optionText: {
    fontSize: 14,
    color: '#334155',
  },
  optionTextActive: {
    color: '#B91C1C',
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0F172A',
    minHeight: 100,
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
  },
  submitBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  }
});
