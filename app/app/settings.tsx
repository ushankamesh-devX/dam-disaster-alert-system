import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import '../i18n/i18n'; // Import i18n config

export default function SettingsScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();

    const changeLanguage = async (lang: string) => {
        await AsyncStorage.setItem('user-language', lang);
        i18n.changeLanguage(lang);
    };

    return (
        <ScreenLayout title={t('settings')}>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
            >
                <Text className="text-lg font-bold mb-4 text-gray-700">{t('language')}</Text>

                <View className="bg-gray-100 rounded-xl overflow-hidden">
                    <TouchableOpacity
                        className={`p-4 border-b border-gray-200 bg-white ${i18n.language === 'en' ? 'bg-[#455A64]' : ''}`}
                        onPress={() => changeLanguage('en')}
                    >
                        <View className="flex-row justify-between items-center">
                            <Text className={`text-base ${i18n.language === 'en' ? 'text-white font-semibold' : 'text-gray-700'}`}>
                                English
                            </Text>
                            {i18n.language === 'en' && <MaterialCommunityIcons name="check" size={20} color="white" />}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className={`p-4 border-b border-gray-200 bg-white ${i18n.language === 'si' ? 'bg-[#455A64]' : ''}`}
                        onPress={() => changeLanguage('si')}
                    >
                        <View className="flex-row justify-between items-center">
                            <Text className={`text-base ${i18n.language === 'si' ? 'text-white font-semibold' : 'text-gray-700'}`}>
                                සිංහල (Sinhala)
                            </Text>
                            {i18n.language === 'si' && <MaterialCommunityIcons name="check" size={20} color="white" />}
                        </View>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </ScreenLayout>
    );
}
