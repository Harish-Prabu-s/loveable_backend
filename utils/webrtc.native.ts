import Constants from 'expo-constants';
import { View } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

let RTCView: any, RTCPeerConnection: any, RTCIceCandidate: any, RTCSessionDescription: any, mediaDevices: any, MediaStream: any;

function fallbackToMocks() {
    RTCView = View;
    RTCPeerConnection = class RTCPeerConnectionMock {
        ontrack() {}
        close() {}
        createOffer() { return Promise.resolve({}); }
        createAnswer() { return Promise.resolve({}); }
        setLocalDescription() { return Promise.resolve(); }
        setRemoteDescription() { return Promise.resolve(); }
        addIceCandidate() { return Promise.resolve(); }
        addTrack() {}
        getSenders() { return []; }
    };
    RTCIceCandidate = class RTCIceCandidateMock {};
    RTCSessionDescription = class RTCSessionDescriptionMock {};
    mediaDevices = {
        getUserMedia: async () => ({
            getTracks: () => [],
            getAudioTracks: () => [],
            getVideoTracks: () => [],
            release: () => {}
        })
    };
    MediaStream = class MediaStreamMock {
        getTracks() { return []; }
        getAudioTracks() { return []; }
        getVideoTracks() { return []; }
    };
}

if (!isExpoGo) {
    const WebRTC = require('react-native-webrtc');
    RTCView = WebRTC.RTCView;
    RTCPeerConnection = WebRTC.RTCPeerConnection;
    RTCIceCandidate = WebRTC.RTCIceCandidate;
    RTCSessionDescription = WebRTC.RTCSessionDescription;
    mediaDevices = WebRTC.mediaDevices;
    MediaStream = WebRTC.MediaStream;
} else {
    fallbackToMocks();
}

export { RTCView, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, MediaStream };
