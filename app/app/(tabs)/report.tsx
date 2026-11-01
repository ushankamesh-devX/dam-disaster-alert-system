import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenLayout } from '@/components/ScreenLayout';
import {
  SearchBar,
  ReportsList,
  AddReportModal,
  Report,
  IssueType,
} from '@/components/pages/ReportIssues';
import { reportsService, resolveReportMediaUrl, ReportFeedItem } from '@/services/reports/reports.service';
import { useTranslation } from 'react-i18next';

export default function ReportScreen() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<IssueType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mapFeedItemToReport = (item: ReportFeedItem): Report => {
    const rawUrls = item.mediaUrls || [];
    return {
      id: String(item.id),
      userName: item.reporterDisplayName || 'Anonymous User',
      damName: item.damName || 'Dam Location',
      issueType: (item.issueType?.toLowerCase() || 'other') as IssueType,
      description: item.description || '',
      mediaUris: rawUrls.map(resolveReportMediaUrl),
      media: rawUrls.map((url) => ({
        uri: resolveReportMediaUrl(url),
        type: url.match(/\.(mp4|mov|m4v|webm)$/i) ? 'video' : 'image',
      })),
      timestamp: item.createdAt ? new Date(item.createdAt) : new Date(),
      status: item.status?.toLowerCase() || 'pending',
      isMine: !!item.isMine,
    };
  };

  const loadFeed = useCallback(
    async (
      pageToFetch: number,
      options: { isRefresh?: boolean; isLoadMore?: boolean; search?: string; filter?: IssueType | null } = {}
    ) => {
      const { isRefresh = false, isLoadMore = false } = options;
      const query = options.search !== undefined ? options.search : searchQuery;
      const filter = options.filter !== undefined ? options.filter : selectedFilter;

      if (isLoadMore) {
        setLoadingMore(true);
      } else if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
        setError('');
      }

      try {
        const response = await reportsService.getFeed({
          page: pageToFetch,
          size: 10,
          search: query.trim() || undefined,
          issueType: filter || undefined,
        });

        const data = response.data?.data || response.data;
        const items: ReportFeedItem[] = Array.isArray(data?.content) ? data.content : [];
        const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : 1;
        const mapped = items.map(mapFeedItemToReport);

        if (pageToFetch === 0) {
          setReports(mapped);
        } else {
          setReports((prev) => [...prev, ...mapped]);
        }

        setPage(pageToFetch);
        setHasMore(pageToFetch + 1 < totalPages);
        setError('');
      } catch (err: any) {
        console.error('Failed to load incident reports feed:', err);
        if (pageToFetch === 0) {
          setError(
            err.response?.data?.message ||
              err.message ||
              'Unable to load incident reports. Please check your connection and try again.'
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [searchQuery, selectedFilter]
  );

  // Initial load and filter change
  useEffect(() => {
    loadFeed(0, { filter: selectedFilter, search: searchQuery });
  }, [selectedFilter]);

  // Debounced search query change
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      loadFeed(0, { search: searchQuery, filter: selectedFilter });
    }, 400);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [searchQuery]);

  const handleRefresh = () => {
    loadFeed(0, { isRefresh: true });
  };

  const handleRetry = () => {
    loadFeed(0);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && !refreshing && hasMore) {
      loadFeed(page + 1, { isLoadMore: true });
    }
  };

  const handleReportCreated = () => {
    setModalVisible(false);
    loadFeed(0, { isRefresh: true });
  };

  return (
    <ScreenLayout
      title={t('report_issues_title', 'Report Issues')}
      subtitle={t('report_issues_subtitle', 'Submit safety concerns and observations')}
    >
      <View className="flex-1">
        {/* Search and Filter Bar */}
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
        />

        {/* Community Reports List */}
        <ReportsList
          reports={reports}
          loading={loading}
          refreshing={refreshing}
          loadingMore={loadingMore}
          hasMore={hasMore}
          error={error}
          onRefresh={handleRefresh}
          onRetry={handleRetry}
          onLoadMore={handleLoadMore}
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
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={32} color="white" />
        </TouchableOpacity>

        {/* Add Report Modal */}
        <AddReportModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSuccess={handleReportCreated}
        />
      </View>
    </ScreenLayout>
  );
}
