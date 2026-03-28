import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MotiView, MotiText } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface ParticipantViewProps {
  stream: any;
  displayName: string;
  isLocal?: boolean;
}

import { RTCView } from "@/utils/webrtc.native";

export const ParticipantView: React.FC<ParticipantViewProps> = ({ stream, displayName, isLocal }) => {
  const hasStream = stream && (stream.getVideoTracks().length > 0 || stream.getAudioTracks().length > 0);

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "timing", duration: 400 }}
      style={[styles.container, isLocal && styles.localContainer]}
    >
      {hasStream ? (
        <RTCView
          stream={stream}
          objectFit="cover"
          mirror={isLocal}
          style={styles.rtcView}
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <MaterialCommunityIcons name="account" size={100} color="#6366F1" />
          <Text style={styles.avatarText}>{displayName?.[0] || "?"}</Text>
        </View>
      )}

      {/* Name Label */}
      <View style={styles.nameLabel}>
        <Text style={styles.nameText}>{isLocal ? 'Me' : displayName}</Text>
      </View>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    borderRadius: 20,
    margin: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  localContainer: {
    borderColor: "#6366F1",
    borderWidth: 2,
  },
  rtcView: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 10,
  },
  micOffIndicator: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    padding: 6,
    borderRadius: 15,
  },
  nameLabel: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  nameText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
