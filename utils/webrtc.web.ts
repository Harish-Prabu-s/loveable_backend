import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Enhanced RTCView mock for Web (using React.createElement for .ts compatibility)
export const RTCView = (props: any) => {
    const { style, streamURL } = props;
    return React.createElement(
        View,
        { style: [style, styles.fallbackContainer] },
        React.createElement(MaterialCommunityIcons, { name: "video-off", size: 48, color: "#64748B" }),
        React.createElement(Text, { style: styles.fallbackText }, "Video not supported on Web"),
        streamURL ? React.createElement(Text, { style: styles.debugText }, `Stream: ${streamURL}`) : null
    );
};

const styles = StyleSheet.create({
    fallbackContainer: {
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
    },
    fallbackText: {
        color: '#94A3B8',
        fontSize: 14,
        marginTop: 8,
        fontWeight: '500',
    },
    debugText: {
        color: '#475569',
        fontSize: 10,
        marginTop: 4,
    }
});

export const RTCPeerConnection = class {
    close() { }
    setRemoteDescription() { return Promise.resolve(); }
    createAnswer() { return Promise.resolve({}); }
    setLocalDescription() { return Promise.resolve(); }
    addIceCandidate() { return Promise.resolve(); }
    createOffer() { return Promise.resolve({}); }
    addTrack() { }
    onicecandidate: any = null;
    ontrack: any = null;
    oniceconnectionstatechange: any = null;
} as any;

export const RTCIceCandidate = class {
    constructor(obj: any) { Object.assign(this, obj); }
} as any;

export const RTCSessionDescription = class {
    constructor(obj: any) { Object.assign(this, obj); }
} as any;

export const mediaDevices = {
    getUserMedia: async () => ({
        getTracks: () => [],
        getAudioTracks: () => [],
        getVideoTracks: () => [],
        release: () => { }
    }),
    enumerateDevices: async () => []
} as any;

export class MediaStream {
    _tracks: any[] = [];
    constructor(tracks?: any[]) { this._tracks = tracks || []; }
    getTracks() { return this._tracks; }
    getAudioTracks() { return this._tracks.filter(t => t.kind === 'audio'); }
    getVideoTracks() { return this._tracks.filter(t => t.kind === 'video'); }
    toURL() { return 'mock-stream-url'; }
    release() { }
}
