import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { authErrorMessage } from '@/services/auth/error-message';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import '../i18n/i18n'; // Import i18n config

export default function SettingsScreen() {
    const { t, i18n } = useTranslation();
    const router = useRouter();
    const { user, logout, completeOnboarding } = useAuth();
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const changeLanguage = async (lang: string) => {
        if (!user?.preferredDamId || saving) return;
        setSaving(true); setError('');
        try { await completeOnboarding(user.preferredDamId, lang); }
        catch (failure) { setError(authErrorMessage(failure)); }
        finally { setSaving(false); }
    };

    return (
        <ScreenLayout title={t('settings')}>
            <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
            >
                <TouchableOpacity onPress={() => router.back()} className="mb-5"><Text className="text-[#0F766E] font-semibold">← Back</Text></TouchableOpacity>
                <View className="bg-gray-50 rounded-2xl p-5 mb-6">
                    <Text className="text-xl font-bold text-gray-800">{user?.fullName}</Text>
                    <Text className="text-gray-500 mt-1">{user?.email}</Text>
                    <TouchableOpacity disabled={saving} onPress={() => router.push('/onboarding')} className="mt-5"><Text className="text-[#0F766E] font-semibold">Change the dam you follow</Text></TouchableOpacity>
                </View>
                {!!error && <Text accessibilityLiveRegion="polite" className="text-red-700 mb-4">{error}</Text>}
                <Text className="text-lg font-bold mb-4 text-gray-700">{t('language')}</Text>

                <View className="bg-gray-100 rounded-xl overflow-hidden">
                    <TouchableOpacity
                        disabled={saving}
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
                        disabled={saving}
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
                <TouchableOpacity disabled={saving} onPress={() => { void logout().catch(failure => setError(authErrorMessage(failure))); }} className="mt-8 mb-10 p-4 rounded-xl border border-red-200"><Text className="text-red-700 text-center font-semibold">Sign out</Text></TouchableOpacity>
            </ScrollView>
        </ScreenLayout>
    );
}
