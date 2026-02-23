import React from 'react';
import { View, Text, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface AlertCardProps {
    title: string;
    description: string;
    location: string;
    timestamp: string;
    imageUrl?: string;
    type?: 'critical' | 'warning' | 'info' | 'maintenance';
}

export function AlertCard({ title, description, location, timestamp, imageUrl, type = 'critical' }: AlertCardProps) {
    const getStyles = () => {
        switch (type) {
            case 'critical':
                return {
                    icon: 'alert-decagram',
                    iconBg: 'bg-red-500',
                    titleColor: 'text-red-600',
                    badge: 'bg-red-100 text-red-700',
                };
            case 'warning':
                return {
                    icon: 'alert',
                    iconBg: 'bg-amber-500',
                    titleColor: 'text-amber-700',
                    badge: 'bg-amber-100 text-amber-700',
                };
            case 'info':
                return {
                    icon: 'information',
                    iconBg: 'bg-blue-500',
                    titleColor: 'text-blue-700',
                    badge: 'bg-blue-100 text-blue-700',
                };
            case 'maintenance':
                return {
                    icon: 'wrench',
                    iconBg: 'bg-gray-500',
                    titleColor: 'text-gray-700',
                    badge: 'bg-gray-100 text-gray-700',
                };
            default:
                return {
                    icon: 'alert',
                    iconBg: 'bg-orange-500',
                    titleColor: 'text-red-600',
                    badge: 'bg-red-50 text-red-600',
                };
        }
    };

    const styles = getStyles();

    return (
        <View className="bg-white rounded-3xl mb-4 shadow-md border border-gray-100 overflow-hidden">
            <View className="flex-row items-start p-5">
                {/* Icon with Ring Decoration */}
                <View className={`${styles.iconBg} rounded-2xl w-12 h-12 items-center justify-center mr-4 shadow-sm`}>
                    <MaterialCommunityIcons name={styles.icon as any} size={28} color="white" />
                </View>

                {/* Content */}
                <View className="flex-1">
                    <View className="flex-row justify-between items-center mb-1">
                        <Text className={`${styles.titleColor} font-bold text-base uppercase tracking-wider`}>{title}</Text>
                        <View className={`${styles.badge} px-2 py-0.5 rounded-full`}>
                            <Text className="text-[10px] font-bold uppercase">{type}</Text>
                        </View>
                    </View>
                    <Text className="text-gray-700 text-sm leading-5 font-medium">{description}</Text>

                    {/* Bottom Info Row */}
                    <View className="flex-row items-center justify-between mt-3">
                        <View className="flex-row items-center bg-gray-50 px-2 py-1 rounded-lg">
                            <MaterialCommunityIcons name="map-marker" size={14} color="#6B7280" />
                            <Text className="text-gray-500 text-xs ml-1 font-semibold">{location}</Text>
                        </View>
                        <View className="flex-row items-center">
                            <MaterialCommunityIcons name="clock-outline" size={12} color="#9CA3AF" />
                            <Text className="text-gray-400 text-xs ml-1 italic">{timestamp}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Optional Image with Gradient Overlay placeholder feel */}
            {imageUrl && (
                <View className="mx-4 mb-4 rounded-2xl overflow-hidden shadow-sm">
                    <Image
                        source={{ uri: imageUrl }}
                        className="w-full h-44"
                        resizeMode="cover"
                    />
                </View>
            )}
        </View>
    );
}
