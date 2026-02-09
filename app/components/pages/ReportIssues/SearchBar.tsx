import React from 'react';
import { View, TextInput, TouchableOpacity, Text, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IssueType } from './types';
import { ISSUE_TYPES } from './mockData';

interface SearchBarProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedFilter: IssueType | null;
    onFilterChange: (filter: IssueType | null) => void;
}

import { useTranslation } from 'react-i18next';

export function SearchBar({
    searchQuery,
    onSearchChange,
    selectedFilter,
    onFilterChange
}: SearchBarProps) {
    const { t } = useTranslation();
    return (
        <View className="mb-4">
            {/* Search Input */}
            <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-3">
                <MaterialCommunityIcons name="magnify" size={22} color="#6B7280" />
                <TextInput
                    className="flex-1 ml-2 text-gray-900 text-base"
                    placeholder={t('search_reports_placeholder')}
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={onSearchChange}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => onSearchChange('')}>
                        <MaterialCommunityIcons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="flex-row"
            >
                {/* All Filter */}
                <TouchableOpacity
                    onPress={() => onFilterChange(null)}
                    className={`mr-2 px-4 py-2 rounded-full ${selectedFilter === null ? 'bg-[#455A64]' : 'bg-gray-100'
                        }`}
                >
                    <Text
                        className={`font-semibold text-sm ${selectedFilter === null ? 'text-white' : 'text-gray-700'
                            }`}
                    >
                        {t('filter_all')}
                    </Text>
                </TouchableOpacity>

                {/* Issue Type Filters */}
                {ISSUE_TYPES.map((issueType) => (
                    <TouchableOpacity
                        key={issueType.value}
                        onPress={() => onFilterChange(
                            selectedFilter === issueType.value ? null : issueType.value
                        )}
                        className="mr-2 px-4 py-2 rounded-full flex-row items-center"
                        style={{
                            backgroundColor: selectedFilter === issueType.value
                                ? issueType.color
                                : `${issueType.color}15`,
                        }}
                    >
                        <MaterialCommunityIcons
                            name={issueType.icon as any}
                            size={16}
                            color={selectedFilter === issueType.value ? 'white' : issueType.color}
                        />
                        <Text
                            className="ml-1.5 font-semibold text-sm"
                            style={{
                                color: selectedFilter === issueType.value ? 'white' : issueType.color,
                            }}
                        >
                            {/* In a real app, these values from mockData should also be mapped to translation keys */}
                            {issueType.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}
