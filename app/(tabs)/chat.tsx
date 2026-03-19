import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chatApi } from '@/api/chat';
import { router } from 'expo-router';
import { generateAvatarUrl } from '@/utils/avatar';
import { getMediaUrl } from '@/utils/media';
import { archiveApi } from '@/api/archive';
import { toast } from '@/utils/toast';
import { Alert } from 'react-native';

export default function ChatScreen() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadContacts = async () => {
    try {
      const data = await chatApi.getContactList();
      setContacts(data || []);
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadContacts();
  };

  const filteredContacts = (Array.isArray(contacts) ? contacts : []).filter(contact =>
    (contact.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.last_message?.toLowerCase().includes(searchQuery.toLowerCase())) &&
    !contact.is_archived
  );

  const archiveChat = async (roomId: number) => {
    try {
      await archiveApi.archive('chat', roomId);
      setContacts(prev => prev.filter(c => c.room_id !== roomId));
      toast.success("Chat archived");
    } catch (e) {
      toast.error("Failed to archive chat");
    }
  };

  const handleLongPress = (contact: any) => {
    Alert.alert(
      "Chat Options",
      `Manage your conversation with ${contact.display_name || contact.username}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Archive Chat", onPress: () => archiveChat(contact.room_id) },
        { text: "Delete Chat", style: "destructive", onPress: () => {
          Alert.alert("Delete Chat", "Are you sure? This will delete all messages.", [
            { text: "Cancel", style: "cancel" },
            { text: "Delete", style: "destructive", onPress: async () => {
              try {
                await archiveApi.delete('chat', contact.room_id);
                setContacts(prev => prev.filter(c => c.room_id !== contact.room_id));
                toast.success("Chat deleted");
              } catch (e) {
                toast.error("Failed to delete chat");
              }
            }}
          ]);
        }}
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.newChatButton} onPress={() => router.push('/(tabs)/discover' as any)}>
          <MaterialCommunityIcons name="message-plus" size={24} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={20} color="#64748B" />
          <TextInput
            placeholder="Search messages..."
            placeholderTextColor="#64748B"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Chat List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F9FAFB" />
        }
      >
        {filteredContacts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="message-outline" size={64} color="#334155" />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubText}>Start a conversation with someone!</Text>
          </View>
        ) : (
          filteredContacts.map((contact) => (
            <TouchableOpacity
              key={contact.id}
              style={styles.chatItem}
              onPress={() => {
                // We navigate to /[id] where [id] is the other user's ID
                // The receiver logic in [id].tsx should handle this
                router.push({ pathname: '/chat/[id]' as any, params: { id: contact.id, isUser: 'true' } });
              }}
              onLongPress={() => handleLongPress(contact)}
            >
              <Image
                source={{
                  uri: contact.photo || generateAvatarUrl(contact.id, 'O')
                }}
                style={styles.avatar}
              />
              <View style={styles.chatInfo}>
                <View style={styles.chatHeader}>
                  <View style={styles.nameRow}>
                    <Text style={styles.roomName} numberOfLines={1}>{contact.display_name || contact.username}</Text>
                    {contact.streak_count && contact.streak_count > 0 ? (
                      <View style={styles.streakBadge}>
                        <Text style={styles.streakEmoji}>
                          {contact.streak_count >= 100 ? '💯' : '🔥'}
                        </Text>
                        <Text style={styles.streakText}>{contact.streak_count}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.time}>{contact.last_timestamp ? new Date(contact.last_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</Text>
                </View>
                <View style={styles.chatFooter}>
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {contact.last_message_type === 'post_share' ? 'Shared a post' : 
                     contact.last_message_type === 'reel_share' ? 'Shared a reel' : 
                     contact.last_message || 'Start chatting...'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  newChatButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#F1F5F9',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#0F172A',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E293B',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F1F5F9',
    marginRight: 6,
  },
  nameRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  streakEmoji: {
    fontSize: 12,
  },
  streakText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    marginLeft: 2,
  },
  time: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#94A3B8',
    flex: 1,
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
  },
});
