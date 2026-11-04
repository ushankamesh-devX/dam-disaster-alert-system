// app/(tabs)/news.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenLayout } from '@/components/ScreenLayout';
import { NewsCard } from '@/components/pages/News/NewsCard';
import { NewsFilterTabs } from '@/components/pages/News/NewsFilterTabs';
import { NewsDetailModal } from '@/components/pages/News/NewsDetailModal';
import { newsService, mapNewsArticle, NewsArticleItem } from '@/services/news/news.service';

export default function NewsScreen() {
  const { t } = useTranslation();
  const [articles, setArticles] = useState<NewsArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedNews, setSelectedNews] = useState<NewsArticleItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchNews = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await newsService.getAll({ status: 'published', size: 50 });
      const raw: Record<string, unknown>[] = Array.isArray(res.data)
        ? res.data
        : (res.data?.content ?? res.data?.data ?? res.data?.articles ?? []);

      const mapped = raw.map(mapNewsArticle);
      setArticles(mapped);
    } catch (err: any) {
      const errMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load news articles. Please check your connection and try again.';
      setError(errMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(false);
  }, [fetchNews]);

  const onRefresh = useCallback(() => {
    fetchNews(true);
  }, [fetchNews]);

  const handleNewsPress = (news: NewsArticleItem) => {
    setSelectedNews(news);
    setModalVisible(true);
  };

  const filteredNews = articles.filter(news =>
    activeFilter === 'all' || news.filter === activeFilter
  );

  return (
    <ScreenLayout
      title={t('title_news')}
      subtitle={t('stay_informed')}
    >
      <View className="flex-1 bg-gray-50">
        {/* Filter Tabs */}
        <NewsFilterTabs
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Content Area */}
        {loading && !refreshing ? (
          <View className="flex-1 items-center justify-center py-20 px-4">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="text-gray-500 text-sm mt-3 font-medium">
              Loading news articles…
            </Text>
          </View>
        ) : error && articles.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6 py-20">
            <View className="w-14 h-14 rounded-full bg-red-100 items-center justify-center mb-3">
              <Text className="text-2xl text-red-600">⚠</Text>
            </View>
            <Text className="text-gray-900 text-base font-bold text-center mb-1">
              Failed to Load News
            </Text>
            <Text className="text-gray-500 text-xs text-center mb-6 leading-5">
              {error}
            </Text>
            <TouchableOpacity
              onPress={() => fetchNews(false)}
              className="bg-blue-600 px-6 py-3 rounded-xl shadow-sm active:bg-blue-700"
              activeOpacity={0.8}
            >
              <Text className="text-white text-sm font-semibold">Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-4"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#2563eb"
                title={t('pull_to_refresh') || 'Pull to refresh'}
              />
            }
          >
            {/* Transient error banner if refresh failed while old data is visible */}
            {error && articles.length > 0 && (
              <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex-row items-center justify-between">
                <Text className="text-red-700 text-xs flex-1 mr-2" numberOfLines={2}>
                  {error}
                </Text>
                <TouchableOpacity onPress={() => fetchNews(true)}>
                  <Text className="text-blue-600 text-xs font-bold">Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {filteredNews.length === 0 ? (
              <View className="items-center justify-center py-16 px-4">
                <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mb-3">
                  <Text className="text-2xl">📰</Text>
                </View>
                <Text className="text-gray-800 text-base font-bold text-center mb-1">
                  No Articles Found
                </Text>
                <Text className="text-gray-500 text-xs text-center leading-5">
                  {activeFilter !== 'all'
                    ? 'No articles match the selected category right now.'
                    : 'There are currently no published news articles.'}
                </Text>
              </View>
            ) : (
              filteredNews.map((news) => (
                <NewsCard
                  key={news.id}
                  {...news}
                  onPress={() => handleNewsPress(news)}
                />
              ))
            )}

            <View className="h-6" />
          </ScrollView>
        )}

        {/* News Detail Modal */}
        <NewsDetailModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          news={selectedNews}
        />
      </View>
    </ScreenLayout>
  );
}
