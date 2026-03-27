import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useMeeting } from "@videosdk.live/react-native-sdk";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MotiView } from "moti";
import { useTheme } from "@/context/ThemeContext";

export const MeetingControls: React.FC = () => {
  const { colors } = useTheme();
  const { localMicOn, localWebcamOn, toggleMic, toggleWebcam, leave, changeWebcam } = useMeeting();

  return (
    <MotiView
      from={{ translateY: 100, opacity: 0 }}
      animate={{ translateY: 0, opacity: 1 }}
      transition={{ type: "spring", damping: 15 }}
      style={styles.container}
    >
      <View style={[styles.controlsRow, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
        {/* Mic Toggle */}
        <TouchableOpacity
          onPress={() => toggleMic()}
          style={[styles.iconBtn, !localMicOn && styles.iconBtnActive]}
        >
          <MaterialCommunityIcons
            name={localMicOn ? "microphone" : "microphone-off"}
            size={28}
            color={localMicOn ? "#FFF" : "#EF4444"}
          />
        </TouchableOpacity>

        {/* Video Toggle */}
        <TouchableOpacity
          onPress={() => toggleWebcam()}
          style={[styles.iconBtn, !localWebcamOn && styles.iconBtnActive]}
        >
          <MaterialCommunityIcons
            name={localWebcamOn ? "video" : "video-off"}
            size={28}
            color={localWebcamOn ? "#FFF" : "#EF4444"}
          />
        </TouchableOpacity>

        {/* Camera Switch */}
        <TouchableOpacity
          onPress={() => changeWebcam()}
          style={styles.iconBtn}
        >
          <MaterialCommunityIcons name="camera-flip" size={28} color="#FFF" />
        </TouchableOpacity>

        {/* Leave Meeting (End Call) */}
        <TouchableOpacity
          onPress={() => leave()}
          style={styles.endCallBtn}
        >
          <MaterialCommunityIcons name="phone-hangup" size={32} color="#FFF" />
        </TouchableOpacity>
      </View>
    </MotiView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 40 : 20,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 40,
    width: "100%",
  },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnActive: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
  },
  endCallBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
});
