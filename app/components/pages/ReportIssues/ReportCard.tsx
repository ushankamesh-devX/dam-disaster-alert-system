import React from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Report } from './types';
import { ISSUE_TYPES } from './mockData';

interface ReportCardProps {
    report: Report;
}

export function ReportCard({ report }: ReportCardProps) {
    const issueTypeConfig = ISSUE_TYPES.find(type => type.value === report.issueType);

    const getStatusColor = (status: Report['status']) => {
        switch (status) {
            case 'pending':
                return '#F59E0B';
            case 'reviewing':
                return '#3B82F6';
            case 'resolved':
                return '#10B981';
            default:
                return '#6B7280';
        }
    };

    const getStatusLabel = (status: Report['status']) => {
        switch (status) {
            case 'pending':
                return 'Pending';
            case 'reviewing':
                return 'Under Review';
            case 'resolved':
                return 'Resolved';
            default:
                return status;
        }
    };

    const formatTimestamp = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else {
            return `${diffDays}d ago`;
        }
    };

    return (
        <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1">
                    {/* User Avatar */}
                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                        <Text className="text-blue-600 font-semibold text-base">
                            {report.userName.charAt(0)}
                        </Text>
                    </View>

                    {/* User Info */}
                    <View className="flex-1">
                        <Text className="text-gray-900 font-semibold text-base">
                            {report.userName}
                        </Text>
                        <Text className="text-gray-500 text-xs">
                            {formatTimestamp(report.timestamp)}
                        </Text>
                    </View>
                </View>

                {/* Status Badge */}
                <View
                    className="px-3 py-1 rounded-full"
                    style={{ backgroundColor: `${getStatusColor(report.status)}20` }}
                >
                    <Text
                        className="text-xs font-semibold"
                        style={{ color: getStatusColor(report.status) }}
                    >
                        {getStatusLabel(report.status)}
                    </Text>
                </View>
            </View>

            {/* Dam Location */}
            <View className="flex-row items-center mb-2">
                <MaterialCommunityIcons name="map-marker" size={16} color="#6B7280" />
                <Text className="text-gray-700 font-medium ml-1 text-sm">
                    {report.damName}
                </Text>
            </View>

            {/* Issue Type Badge */}
            <View className="flex-row items-center mb-3">
                <View
                    className="flex-row items-center px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: `${issueTypeConfig?.color}15` }}
                >
                    <MaterialCommunityIcons
                        name={issueTypeConfig?.icon as any}
                        size={16}
                        color={issueTypeConfig?.color}
                    />
                    <Text
                        className="ml-1.5 font-semibold text-sm"
                        style={{ color: issueTypeConfig?.color }}
                    >
                        {issueTypeConfig?.label}
                    </Text>
                </View>
            </View>

            {/* Description */}
            <Text className="text-gray-700 text-sm leading-5 mb-3">
                {report.description}
            </Text>

            {/* Media Preview - Multiple Images */}
            {report.mediaUris && report.mediaUris.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="rounded-xl"
                >
                    {report.mediaUris.map((uri, index) => (
                        <View
                            key={index}
                            className={`rounded-xl overflow-hidden ${index < report.mediaUris!.length - 1 ? 'mr-2' : ''}`}
                            style={{ width: report.mediaUris!.length === 1 ? '100%' : 200 }}
                        >
                            <Image
                                source={{ uri }}
                                style={{
                                    width: report.mediaUris!.length === 1 ? '100%' : 200,
                                    height: 150
                                }}
                                resizeMode="cover"
                            />
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );
}
