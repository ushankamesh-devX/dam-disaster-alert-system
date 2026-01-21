// components/pages/News/NewsCard.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

interface NewsCardProps {
  id: string;
  image: string;
  category: string;
  title: string;
  description: string;
  timeAgo: string;
  onPress: () => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({
  image,
  category,
  title,
  description,
  timeAgo,
  onPress,
}) => {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className="bg-white rounded-2xl mb-4 overflow-hidden shadow-sm"
      activeOpacity={0.7}
    >
      {/* Image Section */}
      <View className="relative">
        <Image 
          source={{ uri: image }}
          className="w-full h-48"
          resizeMode="cover"
        />
       
        {/* Dam Alert Badge */}
        <View className="absolute bottom-3 left-3 bg-orange-500 px-3 py-1.5 rounded-md flex-row items-center">
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