import React from 'react';
import { View, Text } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let MeetingProvider: any;
let useMeeting: any;
let useParticipant: any;

if (!isExpoGo) {
    try {
        const SDK = require('@videosdk.live/react-native-sdk');
        MeetingProvider = SDK.MeetingProvider;
        useMeeting = SDK.useMeeting;
        useParticipant = SDK.useParticipant;
    } catch (e) {
        console.warn('VideoSDK load failed, using mocks');
        MeetingProvider = ({ children }: any) => React.createElement(View, { style: { flex: 1 } }, children);
        useMeeting = () => ({ participants: new Map(), join: () => {}, leave: () => {} });
        useParticipant = () => ({ webcamOn: false, micOn: false, displayName: 'User' });
    }
} else {
    MeetingProvider = ({ children }: any) => React.createElement(
        View, 
        { style: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' } },
        children,
        React.createElement(
            View,
            { style: { position: 'absolute', top: 50, padding: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12 } },
            React.createElement(Text, { style: { color: '#EF4444', fontWeight: 'bold' } }, 'VideoSDK not available in Expo Go')
        )
    );
    useMeeting = () => ({ participants: new Map(), join: () => {}, leave: () => {} });
    useParticipant = () => ({ webcamOn: false, micOn: false, displayName: 'User' });
}

export { MeetingProvider, useMeeting, useParticipant };
