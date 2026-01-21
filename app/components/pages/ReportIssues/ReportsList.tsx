import React from 'react';
import { FlatList, View, Text } from 'react-native';
import { Report } from './types';
import { ReportCard } from './ReportCard';

interface ReportsListProps {
    reports: Report[];
    onRefresh?: () => void;
    refreshing?: boolean;
}

export function ReportsList({ reports, onRefresh, refreshing = false }: ReportsListProps) {
    const renderEmptyState = () => (
        <View className="items-center justify-center py-12">
            <Text className="text-gray-400 text-lg font-semibold mb-2">
                No Reports Found
            </Text>
            <Text className="text-gray-400 text-sm text-center px-8">
                Try adjusting your search or filters
            </Text>
        </View>
    );

    return (
        <FlatList
            data={reports}
            renderItem={({ item }) => <ReportCard report={item} />}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={renderEmptyState}
            onRefresh={onRefresh}
            refreshing={refreshing}
        />
    );
}
