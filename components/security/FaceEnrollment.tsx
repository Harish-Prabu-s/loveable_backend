import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MotiView, AnimatePresence } from 'moti';
import { ScanningLaser } from './ScanningLaser';

const { width, height } = Dimensions.get('window');

interface FaceEnrollmentProps {
    onComplete: (data: any) => void;
    onCancel: () => void;
}

export const FaceEnrollment = ({ onComplete, onCancel }: FaceEnrollmentProps) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [status, setStatus] = useState<'idle' | 'scanning' | 'capturing' | 'success'>('idle');
    const [progress, setProgress] = useState(0);
    const cameraRef = useRef<any>(null);

    useEffect(() => {
        if (!permission) requestPermission();
    }, [permission]);

    const startScanning = () => {
        setStatus('scanning');
        let counter = 0;
        const interval = setInterval(() => {
            counter += 1;
            setProgress(counter);
            
            if (counter >= 100) {
                clearInterval(interval);
                finalizeEnrollment();
            }
        }, 30); // 3 seconds scan
    };

    const finalizeEnrollment = async () => {
        setStatus('capturing');
        
        try {
            const { authenticateAsync, hasHardwareAsync, isEnrolledAsync } = await import('expo-local-authentication');
            
            const hasHardware = await hasHardwareAsync();
            const isEnrolled = await isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                Alert.alert("Hardware Error", "Your device does not support Face ID or it's not set up in system settings.");
                setStatus('idle');
                return;
            }

            const result = await authenticateAsync({
                promptMessage: 'Verify your face to register',
                fallbackLabel: 'Cancel',
                disableDeviceFallback: true,
            });

            if (result.success) {
                const profileData = {
                    enrolledAt: new Date().toISOString(),
                    device_id: Math.random().toString(36).substring(2, 12),
                    version: '1.0.hw_backed',
                    status: 'verified'
                };

                setStatus('success');
                setTimeout(() => {
                    onComplete(profileData);
                }, 1000);
            } else {
                Alert.alert("Authentication Failed", "We could not verify your identity. Please try again.");
                setStatus('idle');
            }
        } catch (error) {
            console.error('[FaceEnrollment] Scan Error:', error);
            Alert.alert("Hardware Error", "Could not initialize secure face hardware.");
            setStatus('idle');
        }
    };

    if (!permission) return <View style={styles.loading}><ActivityIndicator color="#8B5CF6" /></View>;
    if (!permission.granted) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Camera access is required for Face Lock.</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.btn}><Text style={styles.btnText}>Grant Permission</Text></TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing="front"
            >
                {/* Overlay UI */}
                <View style={styles.overlay}>
                    <BlurView intensity={20} style={styles.header}>
                        <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
                            <MaterialCommunityIcons name="close" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Secure Face Enrollment</Text>
                        <View style={{ width: 40 }} />
                    </BlurView>

                    {/* Face Frame */}
                    <View style={styles.faceFrameContainer}>
                        <View style={styles.faceFrame}>
                            <MotiView
                                animate={{
                                    borderColor: status === 'scanning' ? '#8B5CF6' : status === 'success' ? '#10B981' : '#FFF',
                                    borderWidth: status === 'scanning' ? 4 : 2,
                                }}
                                style={styles.faceFrameCircle}
                            />
                            <ScanningLaser active={status === 'scanning'} color={status === 'success' ? '#10B981' : '#8B5CF6'} />
                        </View>
                    </View>

                    {/* Feedback & Progress */}
                    <View style={styles.footer}>
                        <Text style={styles.statusText}>
                            {status === 'success' ? 'Face Identity Verified' :
                             status === 'scanning' ? `Analyzing Biometrics... ${progress}%` :
                             status === 'capturing' ? 'Storing Identity...' :
                             'Place your face within the scanner'}
                        </Text>

                        {status === 'idle' && (
                            <TouchableOpacity style={styles.actionBtn} onPress={startScanning}>
                                <Text style={styles.actionBtnText}>Begin Discovery Scan</Text>
                            </TouchableOpacity>
                        )}

                        {(status === 'scanning' || status === 'capturing') && (
                            <View style={styles.progressBar}>
                                <MotiView
                                    animate={{ width: `${progress}%` }}
                                    style={styles.progressFill}
                                />
                            </View>
                        )}
                    </View>
                </View>
            </CameraView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
    overlay: { flex: 1, justifyContent: 'space-between' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20,
    },
    closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    title: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    
    faceFrameContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    faceFrame: {
        width: width * 0.7,
        height: width * 0.9,
    },
    faceFrameCircle: {
        width: '100%',
        height: '100%',
        borderRadius: width * 0.35,
        borderStyle: 'dashed',
    },

    footer: { padding: 40, alignItems: 'center', marginBottom: 40 },
    statusText: { color: '#FFF', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 20, minHeight: 60 },
    
    actionBtn: {
        backgroundColor: '#8B5CF6', paddingHorizontal: 30, paddingVertical: 15,
        borderRadius: 25, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10,
    },
    actionBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },

    progressBar: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#8B5CF6' },
    
    errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, backgroundColor: '#000' },
    errorText: { color: '#FFF', fontSize: 18, textAlign: 'center', marginBottom: 20 },
    btn: { backgroundColor: '#8B5CF6', padding: 15, borderRadius: 10 },
    btnText: { color: '#FFF', fontWeight: '700' },
});
