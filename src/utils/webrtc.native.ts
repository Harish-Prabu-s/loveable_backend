import { NativeModules } from 'react-native';

let WebRTC: any = {};

if (NativeModules.WebRTCModule) {
    // Only require the real library if the native module exists
    WebRTC = require('react-native-webrtc');
} else {
    console.warn('[WebRTC] Native module not found. Using mocks for Expo Go compatibility.');
    // Mock implementations to prevent top-level crashes
    WebRTC = {
        RTCPeerConnection: class RTCPeerConnection {
            addEventListener() {}
            removeEventListener() {}
            close() {}
        },
        RTCIceCandidate: class RTCIceCandidate {},
        RTCSessionDescription: class RTCSessionDescription {},
        mediaDevices: {
            getUserMedia: async () => {
                throw new Error("WebRTC is not supported in Expo Go. Please use a Development Build.");
            },
            enumerateDevices: async () => []
        },
        MediaStream: class MediaStream {
            getTracks() { return []; }
            getAudioTracks() { return []; }
            getVideoTracks() { return []; }
        },
        RTCView: () => null,
    };
}

export const {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    mediaDevices,
    MediaStream,
    RTCView
} = WebRTC;
