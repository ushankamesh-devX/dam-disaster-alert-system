// components/pages/News/NewsDetailModal.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  PanResponder,
  Share,
} from 'react-native';

interface NewsDetailModalProps {
  visible: boolean;
  onClose: () => void;
  news: {
    id?: string;
    image?: string;
    imageUrl?: string;
    image_url?: string;
    category: string;
    title: string;
    description?: string;
    fullContent: string;
    timeAgo: string;
    source?: string;
  } | null;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const NewsDetailModal: React.FC<NewsDetailModalProps> = ({
  visible,
  onClose,
  news,
}) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const lastGestureDy = useRef(0);
  const targetUri = (news?.image || news?.imageUrl || news?.image_url || '').trim();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (visible) {
      setImgError(false);
      // Slide up animation
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      // Slide down animation
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, targetUri]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to vertical swipes
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          // Only allow downward swipes
          translateY.setValue(gestureState.dy);
          lastGestureDy.current = gestureState.dy;
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Close modal if swiped down enough
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 300,
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          // Bounce back to original position
          Animated.spring(translateY, {
            toValue: 0,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  if (!news) return null;

  const hasImage = Boolean(targetUri);
  const showImage = hasImage && !imgError;
  const hasDistinctSummary = news.description && news.description.trim() !== news.fullContent.trim();

  const handleShare = async () => {
    try {
      await Share.share({
        title: news.title,
        message: `${news.title}\n\n${news.description || news.fullContent}`,
      });
    } catch {
      // ignore
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      {/* Backdrop */}
      <TouchableOpacity 
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 bg-black/50"
      >
        <Animated.View
          style={{
            transform: [{ translateY }],
            flex: 1,
            marginTop: 80,
          }}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            className="flex-1 bg-white rounded-t-3xl overflow-hidden"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <View className="items-center py-3 bg-white">
              <View className="w-12 h-1 bg-gray-300 rounded-full" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-3 bg-white border-b border-gray-100">
              <TouchableOpacity 
                onPress={onClose} 
                className="p-2 -ml-2 rounded-full active:bg-gray-100"
                activeOpacity={0.7}
              >
                <Text className="text-2xl text-gray-700">×</Text>
              </TouchableOpacity>
              
              <Text className="text-lg font-bold text-gray-900">Latest News</Text>
              
              <View className="w-10" />
            </View>

            <ScrollView 
              className="flex-1"
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              {/* Image with rounded corners */}
              <View className="relative mx-4 mt-4 rounded-2xl overflow-hidden bg-slate-800 h-56 justify-center items-center">
                {showImage ? (
                  <Image
                    source={{ uri: targetUri }}
                    className="w-full h-56"
                    resizeMode="cover"
                    onError={(err) => {
                      console.warn(`[NewsDetailModal] Failed to load image from URL: "${targetUri}"`, err?.nativeEvent);
                      setImgError(true);
                    }}
                  />
                ) : (
                  <View className="w-full h-full bg-slate-700 items-center justify-center p-4">
                    <Text className="text-4xl mb-2">📰</Text>
                    <Text className="text-white text-sm font-medium text-center" numberOfLines={1}>
                      {news.category}
                    </Text>
                  </View>
                )}
               
                {/* Alert Badge */}
                <View className="absolute bottom-3 left-3 bg-orange-500 px-3 py-2 rounded-lg shadow-md flex-row items-center">
                  <Text className="text-white text-xs font-bold">⚠ {news.category}</Text>
                </View>
              </View>

              {/* Content */}
              <View className="px-5 py-5">
                <Text className="text-gray-900 text-2xl font-bold mb-3 leading-tight">
                  {news.title}
                </Text>

                {/* Source & Time */}
                <View className="flex-row items-center mb-4">
                  {news.source && (
                    <Text className="text-blue-600 text-xs font-semibold mr-2 bg-blue-50 px-2 py-0.5 rounded">
                      {news.source}
                    </Text>
                  )}
                  <View className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2" />
                  <Text className="text-gray-500 text-xs">{news.timeAgo}</Text>
                </View>
                
                {hasDistinctSummary && (
                  <View className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                    <Text className="text-gray-800 text-base font-medium leading-6">
                      {news.description}
                    </Text>
                  </View>
                )}

                <View className="bg-blue-50/50 rounded-xl p-4 mb-4 border border-blue-100">
                  <Text className="text-gray-700 text-base leading-7">
                    {news.fullContent}
                  </Text>
                </View>

                {/* Bottom spacing */}
                <View className="h-24" />
              </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View className="bg-white border-t border-gray-100 shadow-2xl">
              <View className="px-5 py-4 flex-row gap-3">
                <TouchableOpacity 
                  className="flex-1 flex-row items-center justify-center gap-2 py-3.5 bg-blue-600 rounded-xl shadow-md active:bg-blue-700"
                  onPress={handleShare}
                  activeOpacity={0.8}
                >
                  <Text className="text-white text-base font-semibold">Share Article</Text>
                  <Text className="text-white text-lg">↗</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};
