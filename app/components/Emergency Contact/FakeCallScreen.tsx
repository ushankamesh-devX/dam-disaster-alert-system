import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Animated,
    Platform,
    Vibration,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface FakeCallScreenProps {
    visible: boolean;
    onAnswer: () => void;
    onDecline: () => void;
    callerName?: string;
    callerNumber?: string;
    emergencyType?: string;
}

export default function FakeCallScreen({
    visible,
    onAnswer,
    onDecline,
    callerName = 'Emergency Alert System',
    callerNumber = '108',
    emergencyType = 'Dam Emergency',
}: FakeCallScreenProps) {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(height)).current;

    // Use expo-audio player with emergency beep sound
    const player = useAudioPlayer('https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3');





    // Play and stop ringtone using expo-audio
    function playRingtone() {
        try {
            console.log('🔊 Starting ringtone...');
            player.loop = true;
            player.volume = 1.0;
            player.play();
            console.log('✅ Ringtone playing');
        } catch (error) {
            console.error('❌ Error playing ringtone:', error);
            // Fallback: Use enhanced haptic feedback
            if (Platform.OS !== 'web') {
                console.log('Using haptic fallback...');
                const hapticInterval = setInterval(() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                }, 500);
                (global as any).hapticIntervalId = hapticInterval;
            }
        }
    }

    function stopRingtone() {
        try {
            // Clear haptic fallback if it exists
            if ((global as any).hapticIntervalId) {
                clearInterval((global as any).hapticIntervalId);
                (global as any).hapticIntervalId = null;
            }

            console.log('🔇 Stopping ringtone...');
            player.pause();
            console.log('✅ Ringtone stopped');
        } catch (error) {
            console.error('❌ Error stopping ringtone:', error);
        }
    }
    useEffect(() => {
        if (visible) {
            // Start vibration pattern (vibrate for 1s, pause 0.5s, repeat)
            if (Platform.OS === 'android') {
                Vibration.vibrate([0, 1000, 500], true); // Pattern: [delay, vibrate, pause], repeat
            } else if (Platform.OS === 'ios') {
                // iOS doesn't support patterns, so use interval
                const vibrationInterval = setInterval(() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                }, 800);

                return () => clearInterval(vibrationInterval);
            }

            // Play ringtone
            playRingtone();

            // Slide in animation
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }).start();

            // Pulse animation for caller info
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.05,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            return () => {
                // Cleanup
                Vibration.cancel();
                stopRingtone();
            };
        } else {
            // Reset animations
            slideAnim.setValue(height);
            pulseAnim.setValue(1);
            Vibration.cancel();
            stopRingtone();
        }
    }, [visible]);



    const handleAnswer = () => {
        Vibration.cancel();
        stopRingtone();

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onAnswer();
    };

    const handleDecline = () => {
        Vibration.cancel();
        stopRingtone();

        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        onDecline();
    };

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent={true}
            statusBarTranslucent={true}
        >
            <Animated.View
                style={[
                    styles.container,
                    {
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Background with blur effect */}
                <BlurView intensity={100} style={StyleSheet.absoluteFill}>
                    <View style={styles.overlay} />
                </BlurView>

                {/* Call Content */}
                <View style={styles.content}>
                    {/* Emergency Badge */}
                    <View style={styles.emergencyBadge}>
                        <Ionicons name="warning" size={24} color="#fff" />
                        <Text style={styles.emergencyText}>{emergencyType}</Text>
                    </View>

                    {/* Caller Avatar */}
                    <Animated.View
                        style={[
                            styles.avatarContainer,
                            {
                                transform: [{ scale: pulseAnim }],
                            },
                        ]}
                    >
                        <View style={styles.avatar}>
                            <Ionicons name="alert-circle" size={80} color="#fff" />
                        </View>
                        <View style={styles.pulseRing} />
                    </Animated.View>

                    {/* Caller Info */}
                    <View style={styles.callerInfo}>
                        <Text style={styles.callerName}>{callerName}</Text>
                        <Text style={styles.callerNumber}>{callerNumber}</Text>
                        <Text style={styles.callStatus}>Emergency Incoming Call</Text>
                    </View>

                    {/* Turn Off Alarm Button */}
                    <TouchableOpacity
                        style={styles.turnOffButton}
                        onPress={handleAnswer}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="notifications-off" size={32} color="#fff" />
                        <Text style={styles.turnOffButtonText}>Turn Off Alarm</Text>
                    </TouchableOpacity>

                    {/* Additional Info */}
                    <View style={styles.infoContainer}>
                        <Ionicons name="information-circle-outline" size={20} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.infoText}>
                            Critical alert - Immediate action required
                        </Text>
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    content: {
        flex: 1,
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emergencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.9)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
        shadowColor: '#ff3b30',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },
    emergencyText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    avatarContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    avatar: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 59, 48, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: '#ff3b30',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 12,
    },
    pulseRing: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
        borderColor: 'rgba(255, 59, 48, 0.4)',
    },
    callerInfo: {
        alignItems: 'center',
        gap: 8,
    },
    callerName: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    callerNumber: {
        fontSize: 20,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },
    callStatus: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 4,
        fontWeight: '400',
    },
    turnOffButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#ff3b30',
        paddingHorizontal: 40,
        paddingVertical: 18,
        borderRadius: 50,
        minWidth: 240,
        shadowColor: '#ff3b30',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 12,
    },
    turnOffButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    infoText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontWeight: '500',
    },
});

// Add gradient colors for buttons
StyleSheet.create({
    declineButton: {
        ...styles.buttonIconContainer,
        backgroundColor: '#ff3b30',
    },
    answerButton: {
        ...styles.buttonIconContainer,
        backgroundColor: '#34c759',
    },
});
