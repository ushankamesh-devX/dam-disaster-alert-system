import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenLayout } from '@/components/ScreenLayout';
import {
  SearchBar,
  ReportsList,
  AddReportModal,
  MOCK_REPORTS,
  Report,
  IssueType,
} from '@/components/pages/ReportIssues';

export default function ReportScreen() {
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<IssueType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Filter and search reports
  const filteredReports = useMemo(() => {
    let filtered = [...reports];

    // Apply issue type filter
    if (selectedFilter) {
      filtered = filtered.filter((report) => report.issueType === selectedFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.description.toLowerCase().includes(query) ||
          report.damName.toLowerCase().includes(query) ||
          report.userName.toLowerCase().includes(query)
      );
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [reports, searchQuery, selectedFilter]);

  const handleAddReport = (newReportData: {
    damName: string;
    issueType: IssueType;
    description: string;
    media?: import('@/components/pages/ReportIssues').MediaItem[];
  }) => {
    const newReport: Report = {
      id: Date.now().toString(),
      userName: 'You',
      damName: newReportData.damName,
      issueType: newReportData.issueType,
      description: newReportData.description,
      media: newReportData.media,
      timestamp: new Date(),
      status: 'pending',
    };

    setReports([newReport, ...reports]);
    setModalVisible(false);
  };

  const handleRefresh = () => {
    // In a real app, this would fetch fresh data from the server
    console.log('Refreshing reports...');
  };

  return (
    <ScreenLayout
      title="Report Issues"
      subtitle="Submit safety concerns and observations"
    >
      <View className="flex-1">
        {/* Search and Filter Bar */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
        />

        {/* Reports List */}
        <ReportsList
          reports={filteredReports}
          onRefresh={handleRefresh}
          refreshing={false}
        />

        {/* Floating Action Button */}
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          className="absolute bottom-6 right-6 w-16 h-16 bg-[#455A64] rounded-full items-center justify-center shadow-lg"
          style={{
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
          }}
        >
          <MaterialCommunityIcons name="plus" size={32} color="white" />
        </TouchableOpacity>

        {/* Add Report Modal */}
        <AddReportModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={handleAddReport}
        />
      </View>
    </ScreenLayout>
  );
}
