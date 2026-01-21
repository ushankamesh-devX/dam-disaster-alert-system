import React from 'react';
import { View, Text, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// this is my alertcard componenet 
/**
 * Props for the AlertCard component.
 * @property title - The title of the alert (e.g., "CRITICAL WARNING").
 * @property description - Detailed message explaining the alert.
 * @property location - The location associated with the alert.
 * @property timestamp - Time since the alert was issued.
 * @property imageUrl - (Optional) URL of an image related to the alert.
 */
interface AlertCardProps {
    title: string;
    description: string;
    location: string;
    timestamp: string;
    imageUrl?: string;
}

/**
 * AlertCard Component
 * Displays a warning or alert in a card format with an icon, details, and optional image.
 * Designed to be used in a scrollable list of alerts.
 */
export function AlertCard({ title, description, location, timestamp, imageUrl }: AlertCardProps) {
    return (
        <View className="bg-white rounded-2xl mb-4 shadow-sm border border-gray-100">
            {/* Alert Header */}
            <View className="flex-row items-start p-4">
                {/* Icon */}
                <View className="bg-orange-500 rounded-full w-10 h-10 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="alert" size={24} color="white" />
                </View>

                {/* Content */}
                <View className="flex-1">
                    <Text className="text-red-600 font-bold text-sm mb-1">{title}</Text>
                    <Text className="text-gray-700 text-sm leading-5">{description}</Text>

                    {/* Location */}
                    <View className="flex-row items-center mt-2">
                        <MaterialCommunityIcons name="map-marker" size={14} color="#6B7280" />
                        <Text className="text-gray-500 text-xs ml-1">{location}</Text>
                    </View>

                    {/* Timestamp */}
                    <Text className="text-gray-400 text-xs mt-1">{timestamp}</Text>
                </View>
            </View>

            {/* Optional Image */}
            {imageUrl && (
                <View className="px-4 pb-4">
                    <Image
                        source={{ uri: imageUrl }}
                        className="w-full h-40 rounded-xl"
                        resizeMode="cover"
                    />
                </View>
            )}
        </View>
    );
}
