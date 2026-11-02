// app/(tabs)/news.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenLayout } from '@/components/ScreenLayout';
import { NewsCard } from '@/components/pages/News/NewsCard';
import { NewsFilterTabs } from '@/components/pages/News/NewsFilterTabs';
import { NewsDetailModal } from '@/components/pages/News/NewsDetailModal';
import { newsService, resolveImageUrl } from '@/services/news/news.service';

export interface NewsItem {
  id: string;
  image: string;
  category: string;
  title: string;
  description: string;
  fullContent: string;
  timeAgo: string;
  filter: string;
}

function formatTimeAgo(dateString?: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 0 || diffMs < 60000) return 'Just now';

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 60) {
    return `${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getCategoryFilter(
  categoryName?: string,
  categoryCode?: string,
  filterKey?: string
): string {
  const combined = `${categoryName ?? ''} ${categoryCode ?? ''} ${filterKey ?? ''}`.toLowerCase();
  if (combined.includes('dam')) return 'dam-status';
  if (combined.includes('weather')) return 'weather-alerts';
  if (
    combined.includes('emergency') ||
    combined.includes('warning') ||
    combined.includes('alert') ||
    combined.includes('landslide') ||
    combined.includes('lightning') ||
    combined.includes('hazard')
  ) {
    return 'emergency';
  }
  return combined.trim().replace(/\s+/g, '-') || 'general';
}

function mapApiArticle(item: Record<string, unknown>, currentLang?: string): NewsItem {
  const isSi = currentLang === 'si';
  const isTa = currentLang === 'ta';

  const title =
    (isSi && item.titleSi ? item.titleSi : isTa && item.titleTa ? item.titleTa : item.title) ||
    'Untitled Article';

  const summary = (isSi && item.summarySi ? item.summarySi : item.summary) as string;
  const content = (isSi && item.contentSi ? item.contentSi : item.content) as string;

  const description = summary || (content ? content.slice(0, 160) + '...' : '');
  const fullContent = content || summary || '';

  const categoryObj = item.category as Record<string, unknown> | undefined;
  const category =
    (item.categoryName as string) ||
    (categoryObj?.name as string) ||
    'General Update';

  const categoryCode = (categoryObj?.code as string) || (item.categoryCode as string);
  const filterKey = (categoryObj?.filterKey as string) || (item.categoryFilterKey as string);

  const rawDate = (item.publishDate || item.publishedAt || item.createdAt) as string;
  const timeAgo = formatTimeAgo(rawDate);
  const image = resolveImageUrl(
    (item.imageUrl || item.thumbnailUrl || item.image) as string | null
  );

  const filter = getCategoryFilter(category, categoryCode, filterKey);

  return {
    id: String(item.id ?? ''),
    image,
    category: String(category),
    title: String(title),
    description: String(description),
    fullContent: String(fullContent),
    timeAgo,
    filter,
  };
}

export default function NewsScreen() {
  const { t, i18n } = useTranslation();
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const res = await newsService.getAll({
        status: 'published',
        page: 0,
        size: 50,
      });

      const raw: Record<string, unknown>[] = Array.isArray(res.data)
        ? res.data
        : (res.data?.content ?? res.data?.data ?? res.data?.articles ?? []);

      const mapped = raw.map((item) => mapApiArticle(item, i18n.language));
      setArticles(mapped);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        t('failed_to_load_news', 'Unable to load news articles. Please check your connection and try again.');
      setError(String(message));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [i18n.language, t]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const onRefresh = useCallback(() => {
    fetchNews(true);
  }, [fetchNews]);

  const handleNewsPress = (news: NewsItem) => {
    setSelectedNews(news);
    setModalVisible(true);
  };

  const filteredNews = articles.filter((news) => {
    if (activeFilter === 'all') return true;
    if (news.filter === activeFilter) return true;
    const cat = (news.category || '').toLowerCase();
    if (activeFilter === 'dam-status') return cat.includes('dam');
    if (activeFilter === 'weather-alerts') return cat.includes('weather');
    if (activeFilter === 'emergency') {
      return (
        cat.includes('emergency') ||
        cat.includes('warning') ||
        cat.includes('alert') ||
        cat.includes('landslide') ||
        cat.includes('lightning') ||
        cat.includes('hazard')
      );
    }
    return false;
  });

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

        {/* News List */}
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563eb"
              title={t('pull_to_refresh', 'Pull to refresh')}
            />
          }
        >
          {/* Loading Indicator */}
          {loading && !refreshing && (
            <View className="py-16 items-center justify-center">
              <ActivityIndicator size="large" color="#2563eb" />
              <Text className="text-gray-500 mt-4 text-sm font-medium">
                {t('loading_news', 'Loading news articles...')}
              </Text>
            </View>
          )}

          {/* Full Screen Error State with Retry Button */}
          {!loading && error !== '' && articles.length === 0 && (
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
              <TouchableOpacity
                onPress={() => void fetchNews(false)}
                className="bg-blue-600 px-6 py-2.5 rounded-xl active:bg-blue-700"
                activeOpacity={0.8}
              >
                <Text className="text-white font-semibold text-sm">
                  {t('retry', 'Retry')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Inline Error Notice if refresh failed but cached articles exist */}
          {!loading && error !== '' && articles.length > 0 && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex-row items-center justify-between">
              <Text className="text-red-700 text-xs flex-1 mr-2">{error}</Text>
              <TouchableOpacity onPress={() => void fetchNews(false)}>
                <Text className="text-red-700 text-xs font-bold underline">
                  {t('retry', 'Retry')}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty State */}
          {!loading && error === '' && filteredNews.length === 0 && (
            <View className="py-16 px-6 items-center justify-center bg-white rounded-2xl mx-1 my-4 border border-gray-100 shadow-sm">
              <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mb-3">
                <Text className="text-gray-400 text-2xl font-bold">📰</Text>
              </View>
              <Text className="text-gray-900 font-bold text-base mb-1 text-center">
                {t('no_news_found', 'No news articles found')}
              </Text>
              <Text className="text-gray-500 text-xs text-center leading-4">
                {t('no_news_desc', 'There are no articles available in this category.')}
              </Text>
            </View>
          )}

          {/* News Cards */}
          {!loading &&
            filteredNews.map((news) => (
              <NewsCard
                key={news.id}
                {...news}
                onPress={() => handleNewsPress(news)}
              />
            ))}

          <View className="h-6" />
        </ScrollView>

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
