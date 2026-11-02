import React, { useState, useEffect } from 'react';
import { View, Text, Image, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Report } from './types';
import { ISSUE_TYPES } from './mockData';
import { resolveReportMediaUrl } from '@/services/reports/reports.service';
import { tokenStorage } from '@/services/api/token.storage';

interface ReportCardProps {
    report: Report;
}

export function ReportCard({ report }: ReportCardProps) {
    const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});
    const [authToken, setAuthToken] = useState<string | null>(null);

    useEffect(() => {
        tokenStorage.get().then(token => {
            if (token) setAuthToken(token);
        }).catch(() => {});
    }, []);

    const issueTypeConfig = ISSUE_TYPES.find(type => type.value === report.issueType) || {
        value: 'other',
        label: report.issueType ? String(report.issueType).toUpperCase() : 'Other',
        color: '#6B7280',
        icon: 'information',
    };

    const getStatusColor = (status: Report['status']) => {
        switch (status) {
            case 'pending':
                return '#F59E0B'; // Amber
            case 'reviewing':
                return '#3B82F6'; // Blue
            case 'in_progress':
                return '#8B5CF6'; // Purple
            case 'resolved':
                return '#10B981'; // Emerald
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
            case 'in_progress':
                return 'In Progress';
            case 'resolved':
                return 'Resolved';
            default:
                return typeof status === 'string' ? status.replace('_', ' ') : 'Pending';
        }
    };

    const formatTimestamp = (date: Date) => {
        if (!date || isNaN(date.getTime())) return '';
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'Just now';
        } else if (diffMins < 60) {
            return `${diffMins}m ago`;
        } else if (diffHours < 24) {
            return `${diffHours}h ago`;
        } else if (diffDays < 7) {
            return `${diffDays}d ago`;
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    // Combine media items or mediaUris
    const mediaList: string[] = [];
    if (report.mediaUris && report.mediaUris.length > 0) {
        mediaList.push(...report.mediaUris);
    } else if (report.media && report.media.length > 0) {
        mediaList.push(...report.media.map(m => m.uri));
    }

    const reporterInitial = (report.userName && report.userName.trim().length > 0)
        ? report.userName.trim().charAt(0).toUpperCase()
        : 'R';

    return (
        <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center flex-1 mr-2">
                    {/* User Avatar */}
                    <View className="w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3">
                        <Text className="text-blue-600 font-semibold text-base">
                            {reporterInitial}
                        </Text>
                    </View>

                    {/* User Info */}
                    <View className="flex-1">
                        <View className="flex-row items-center">
                            <Text className="text-gray-900 font-semibold text-base" numberOfLines={1}>
                                {report.userName}
                            </Text>
                            {report.isMine && (
                                <View className="ml-2 bg-gray-100 px-1.5 py-0.5 rounded">
                                    <Text className="text-[10px] text-gray-600 font-bold">YOU</Text>
                                </View>
                            )}
                        </View>
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
                        className="text-xs font-semibold capitalize"
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
                    style={{ backgroundColor: `${issueTypeConfig.color}15` }}
                >
                    <MaterialCommunityIcons
                        name={issueTypeConfig.icon as any}
                        size={16}
                        color={issueTypeConfig.color}
                    />
                    <Text
                        className="ml-1.5 font-semibold text-sm"
                        style={{ color: issueTypeConfig.color }}
                    >
                        {issueTypeConfig.label}
                    </Text>
                </View>
            </View>

            {/* Description */}
            <Text className="text-gray-700 text-sm leading-5 mb-3">
                {report.description}
            </Text>

            {/* Media Preview - Multiple Images */}
            {mediaList.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="rounded-xl mt-1"
                >
                    {mediaList.map((rawUri, index) => {
                        const fullUri = resolveReportMediaUrl(rawUri);
                        const isFailed = failedImages[index];

                        return (
                            <View
                                key={index}
                                className={`rounded-xl overflow-hidden bg-gray-100 ${index < mediaList.length - 1 ? 'mr-2' : ''}`}
                                style={{ width: mediaList.length === 1 ? 260 : 180, height: 140 }}
                            >
                                {isFailed ? (
                                    <View className="w-full h-full items-center justify-center bg-gray-50 border border-gray-200 rounded-xl p-2">
                                        <MaterialCommunityIcons name="image-broken-variant" size={32} color="#9CA3AF" />
                                        <Text className="text-gray-500 text-[11px] mt-1.5 font-medium text-center">
                                            Image unavailable
                                        </Text>
                                    </View>
                                ) : (
                                    <Image
                                        source={{
                                            uri: fullUri,
                                            headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
                                        }}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                        }}
                                        resizeMode="cover"
                                        onError={(e) => {
                                            console.warn(`[ReportCard] Failed to load image at: ${fullUri}`, e.nativeEvent?.error);
                                            setFailedImages(prev => ({ ...prev, [index]: true }));
                                        }}
                                    />
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}
