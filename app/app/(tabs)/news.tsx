// app/(tabs)/news.tsx
import React, { useState } from 'react';
import { ScrollView, View, RefreshControl } from 'react-native';
import { ScreenLayout } from '@/components/ScreenLayout';
import { NewsCard } from '@/components/pages/News/NewsCard';
import { NewsFilterTabs } from '@/components/pages/News/NewsFilterTabs';
import { NewsDetailModal } from '@/components/pages/News/NewsDetailModal';

// Mock data - Replace with actual API calls
const mockNewsData = [
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800',
    category: 'Dam Alert',
    title: 'Dam Breaking Alert Warning',
    description: 'A dam breaking alert has been issued due to sudden crack detected. A dam breaking warning has been issued due to sudden crack detected',
    fullContent: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    timeAgo: '1 hour ago',
    filter: 'dam-status'
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1605106702734-205df224ecce?w=800',
    category: 'Dam Alert',
    title: 'Dam Breaking Alert Warning',
    description: 'A dam breaking warning has been issued due to sudden crack detected. A dam breaking warning has been issued due to sudden crack detected',
    fullContent: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    timeAgo: '2 hours ago',
    filter: 'emergency'
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800',
    category: 'Dam Alert',
    title: 'Dam Breaking Alert Warning',
    description: 'A dam breaking warning has been issued due to sudden crack detected. A dam breaking warning has been issued due to sudden crack detected',
    fullContent: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    timeAgo: '3 hours ago',
    filter: 'weather-alerts'
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=800',
    category: 'Dam Alert',
    title: 'Emergency Flood Warning Issued',
    description: 'Authorities have issued an emergency flood warning. Residents advised to evacuate immediately to higher ground.',
    fullContent: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    timeAgo: '4 hours ago',
    filter: 'emergency'
  },
];

export default function NewsScreen() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedNews, setSelectedNews] = useState<typeof mockNewsData[0] | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleNewsPress = (news: typeof mockNewsData[0]) => {
    setSelectedNews(news);
    setModalVisible(true);
  };

  const filteredNews = mockNewsData.filter(news => 
    activeFilter === 'all' || news.filter === activeFilter
  );

  return (
    <ScreenLayout 
      title="Latest News" 
      subtitle="Stay informed with live updateson the dam"
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
            />
          }
        >
          {filteredNews.map((news) => (
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