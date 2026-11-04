// components/pages/News/NewsCard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

interface NewsCardProps {
  id: string;
  image?: string;
  imageUrl?: string;
  image_url?: string;
  category: string;
  title: string;
  description: string;
  timeAgo: string;
  onPress: () => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({
  image,
  imageUrl,
  image_url,
  category,
  title,
  description,
  timeAgo,
  onPress,
}) => {
  const targetUri = (image || imageUrl || image_url || '').trim();
  const [imgError, setImgError] = useState(false);

  // Reset error state if the article image URL changes
  useEffect(() => {
    setImgError(false);
  }, [targetUri]);

  const hasImage = Boolean(targetUri);
  const showImage = hasImage && !imgError;

  return (
    <TouchableOpacity 
      onPress={onPress}
      className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm"
      activeOpacity={0.7}
    >
      {/* Image Section */}
      <View className="relative bg-gray-200 h-48 justify-center items-center overflow-hidden">
        {showImage ? (
          <Image 
            source={{ uri: targetUri }}
            className="w-full h-48"
            resizeMode="cover"
            onError={(err) => {
              console.warn(`[NewsCard] Failed to load image from URL: "${targetUri}"`, err?.nativeEvent);
              setImgError(true);
            }}
          />
        ) : (
          <View className="w-full h-full bg-slate-700 items-center justify-center p-4">
            <Text className="text-3xl mb-1">📰</Text>
            <Text className="text-white text-xs font-medium text-center" numberOfLines={1}>
              {category}
            </Text>
          </View>
        )}
       
        {/* Category Alert Badge */}
        <View className="absolute bottom-3 left-3 bg-orange-500 px-3 py-1.5 rounded-md flex-row items-center shadow-sm">
          <Text className="text-white text-xs font-semibold">⚠ {category}</Text>
        </View>
      </View>

      {/* Content Section */}
      <View className="p-4">
        <Text className="text-gray-900 text-lg font-bold mb-2">
          {title}
        </Text>
        <Text className="text-gray-600 text-sm leading-5 mb-3" numberOfLines={3}>
          {description}
        </Text>
        
        {/* Footer */}
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-400 text-xs">{timeAgo}</Text>
          <TouchableOpacity onPress={onPress}>
            <Text className="text-blue-600 text-sm font-semibold">See More</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};
