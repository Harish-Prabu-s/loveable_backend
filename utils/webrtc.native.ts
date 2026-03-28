import Constants from 'expo-constants';
import { View } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

let RTCView: any, RTCPeerConnection: any, RTCIceCandidate: any, RTCSessionDescription: any, mediaDevices: any, MediaStream: any, InCallManager: any;

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
        createDataChannel() { return { onopen: null, onmessage: null, send: () => {} }; }
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
        release() {}
    };
    InCallManager = {
        start: () => {},
        stop: () => {},
        setKeepScreenOn: () => {},
        setSpeakerphoneOn: () => {},
        checkCameraPermission: () => Promise.resolve('granted'),
        checkRecordPermission: () => Promise.resolve('granted'),
    };
}

if (!isExpoGo) {
    try {
        const WebRTC = require('@videosdk.live/react-native-webrtc');
        RTCView = WebRTC.RTCView;
        RTCPeerConnection = WebRTC.RTCPeerConnection;
        RTCIceCandidate = WebRTC.RTCIceCandidate;
        RTCSessionDescription = WebRTC.RTCSessionDescription;
        mediaDevices = WebRTC.mediaDevices;
        MediaStream = WebRTC.MediaStream;
        
        try {
            InCallManager = require('@videosdk.live/react-native-incallmanager').default || require('@videosdk.live/react-native-incallmanager');
        } catch (e) {
            console.warn('InCallManager load failed, using mock');
            InCallManager = { start: () => {}, stop: () => {}, checkCameraPermission: () => Promise.resolve('granted'), checkRecordPermission: () => Promise.resolve('granted') };
        }
    } catch (e) {
        console.warn('WebRTC load failed, using mocks');
        fallbackToMocks();
    }
} else {
    fallbackToMocks();
}

export { RTCView, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, MediaStream, InCallManager };
