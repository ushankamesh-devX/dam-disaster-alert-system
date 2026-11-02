import React from 'react';
import { FlatList, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Report } from './types';
import { ReportCard } from './ReportCard';
import { useTranslation } from 'react-i18next';

interface ReportsListProps {
    reports: Report[];
    loading?: boolean;
    refreshing?: boolean;
    error?: string;
    onRefresh?: () => void;
    onRetry?: () => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
    loadingMore?: boolean;
}

export function ReportsList({
    reports,
    loading = false,
    refreshing = false,
    error = '',
    onRefresh,
    onRetry,
    onLoadMore,
    hasMore = false,
    loadingMore = false,
}: ReportsListProps) {
    const { t } = useTranslation();

    const renderEmptyState = () => {
        if (loading && !refreshing) {
            return (
                <View className="items-center justify-center py-16">
                    <ActivityIndicator size="large" color="#455A64" />
                    <Text className="text-gray-500 mt-4 text-sm font-medium">
                        {t('loading_reports', 'Loading reports...')}
                    </Text>
                </View>
            );
        }

        if (error && !loading && reports.length === 0) {
            return (
                <View className="py-12 px-6 items-center justify-center bg-white rounded-2xl mx-1 my-4 border border-red-100 shadow-sm">
                    <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center mb-3">
                        <Text className="text-red-600 text-xl font-bold">!</Text>
                    </View>
                    <Text className="text-gray-900 font-bold text-lg mb-1 text-center">
                        {t('error', 'Error')}
                    </Text>
                    <Text className="text-gray-600 text-sm text-center mb-4 leading-5">
                        {error}
                    </Text>
                    {onRetry && (
                        <TouchableOpacity
                            onPress={onRetry}
                            className="bg-[#455A64] px-6 py-2.5 rounded-xl active:bg-[#37474F]"
                            activeOpacity={0.8}
                        >
                            <Text className="text-white font-semibold text-sm">
                                {t('retry', 'Retry')}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            );
        }

        return (
            <View className="items-center justify-center py-16 px-6 bg-white rounded-2xl mx-1 my-4 border border-gray-100 shadow-sm">
                <Text className="text-3xl mb-2">📋</Text>
                <Text className="text-gray-800 text-base font-semibold mb-1 text-center">
                    {t('no_reports_found', 'No Reports Found')}
                </Text>
                <Text className="text-gray-400 text-xs text-center px-4 leading-4">
                    {t('no_reports_desc', 'There are no active reports matching your criteria. Tap the + button to report an issue.')}
                </Text>
            </View>
        );
    };

    const renderFooter = () => {
        if (error && !loading && reports.length > 0) {
            return (
                <View className="py-4 px-4 items-center">
                    <Text className="text-red-600 text-sm text-center mb-3">{error}</Text>
                    <TouchableOpacity onPress={onRetry} accessibilityRole="button" className="bg-[#455A64] px-6 py-3 rounded-xl">
                        <Text className="text-white font-semibold">{t('retry', 'Retry')}</Text>
                    </TouchableOpacity>
                </View>
            );
        }
        if (!loadingMore) return <View style={{ height: 100 }} />;
        return (
            <View className="py-4 items-center justify-center">
                <ActivityIndicator size="small" color="#455A64" />
            </View>
        );
    };

    return (
        <FlatList
            data={reports}
            renderItem={({ item }) => <ReportCard report={item} />}
            keyExtractor={(item) => String(item.id)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={renderEmptyState}
            onRefresh={onRefresh}
            refreshing={refreshing}
            onEndReached={hasMore && !loading && !refreshing && !loadingMore && !error ? onLoadMore : undefined}
            onEndReachedThreshold={0.4}
            ListFooterComponent={renderFooter}
        />
    );
}
