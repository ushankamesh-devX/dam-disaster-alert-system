import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    Image,
    ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { IssueType, DamOption, MediaItem } from './types';
import { ISSUE_TYPES, DAMS as FALLBACK_DAMS } from './mockData';
import { damService } from '@/services/dams/dam.service';
import { reportsService, CreateReportPayload } from '@/services/reports/reports.service';
import { useTranslation } from 'react-i18next';

interface AddReportModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddReportModal({ visible, onClose, onSuccess }: AddReportModalProps) {
    const { t } = useTranslation();
    const [dams, setDams] = useState<DamOption[]>(FALLBACK_DAMS);
    const [selectedDam, setSelectedDam] = useState<DamOption | null>(null);
    const [selectedIssueType, setSelectedIssueType] = useState<IssueType | null>(null);
    const [description, setDescription] = useState('');
    const [showDamPicker, setShowDamPicker] = useState(false);
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>('');

    useEffect(() => {
        let isMounted = true;
        damService.getActive()
            .then(res => {
                const rows: any[] = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
                if (isMounted && rows.length > 0) {
                    const mapped: DamOption[] = rows.map(d => ({
                        id: String(d.id),
                        name: d.name,
                        location: d.regionName || d.code || 'Sri Lanka',
                    }));
                    setDams(mapped);
                }
            })
            .catch(() => {
                // Keep fallback dams on error
            });
        return () => { isMounted = false; };
    }, []);

    const resetForm = () => {
        setSelectedDam(null);
        setSelectedIssueType(null);
        setDescription('');
        setMedia([]);
        setShowDamPicker(false);
        setSubmitting(false);
        setUploadProgress('');
    };

    const handleClose = () => {
        if (submitting) return;
        resetForm();
        onClose();
    };

    const handleSubmit = async () => {
        if (!selectedDam) {
            Alert.alert(t('error', 'Error'), t('please_select_dam', 'Please select a dam'));
            return;
        }
        if (!selectedIssueType) {
            Alert.alert(t('error', 'Error'), t('please_select_issue_type', 'Please select an issue type'));
            return;
        }
        if (!description.trim()) {
            Alert.alert(t('error', 'Error'), t('please_enter_description', 'Please enter a description'));
            return;
        }

        setSubmitting(true);
        setUploadProgress(t('submitting_report', 'Submitting report...'));

        const payload: CreateReportPayload = {
            damId: Number(selectedDam.id) || undefined,
            damName: selectedDam.name,
            issueType: selectedIssueType,
            description: description.trim(),
            media: media.length > 0 ? media : undefined,
        };

        try {
            await reportsService.createReport(payload, (event) => {
                if (event.total && event.total > 0) {
                    const percent = Math.round((event.loaded * 100) / event.total);
                    setUploadProgress(`${percent}%`);
                }
            });

            resetForm();
            onClose();
            onSuccess();

            Alert.alert(
                t('report_submitted_success_title', 'Report Submitted'),
                t('report_submitted_success_desc', 'Report submitted. It will appear after admin review.')
            );
        } catch (err: any) {
            const message = err?.response?.data?.message || err?.message || 'Failed to submit report. Please try again.';
            Alert.alert(t('error', 'Error'), message);
        } finally {
            setSubmitting(false);
            setUploadProgress('');
        }
    };

    const handleMediaPicker = async (source: 'camera' | 'gallery' | 'video') => {
        try {
            let result;

            if (source === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(t('permission_denied', 'Permission Denied'), t('camera_permission_required', 'Camera permission is required to take photos.'));
                    return;
                }

                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                });
            } else if (source === 'video') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(t('permission_denied', 'Permission Denied'), t('video_permission_required', 'Camera permission is required to record videos.'));
                    return;
                }

                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                    allowsEditing: true,
                    quality: 0.8,
                    videoMaxDuration: 60,
                });
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(t('permission_denied', 'Permission Denied'), t('gallery_permission_required', 'Gallery permission is required to select media.'));
                    return;
                }

                result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.All,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                    videoMaxDuration: 60,
                });
            }

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const mediaType = asset.type === 'video' ? 'video' : 'image';
                setMedia([...media, { uri: asset.uri, type: mediaType }]);
            }
        } catch (error) {
            console.error('Error picking media:', error);
            Alert.alert(t('error', 'Error'), t('failed_to_pick_media', 'Failed to pick media. Please try again.'));
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View className="flex-1 bg-black/50 justify-end">
                <View className="bg-white rounded-t-3xl max-h-[90%]">
                    {/* Header */}
                    <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
                        <Text className="text-xl font-bold text-gray-900">{t('report_issue_modal_title', 'Report Issue')}</Text>
                        <TouchableOpacity onPress={handleClose} disabled={submitting}>
                            <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
                        {/* Dam Selection */}
                        <View className="mb-5">
                            <Text className="text-gray-700 font-semibold mb-2 text-base">
                                {t('select_dam', 'Select Dam *')}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowDamPicker(!showDamPicker)}
                                disabled={submitting}
                                className="bg-gray-50 rounded-xl px-4 py-4 flex-row items-center justify-between border-2 border-gray-200"
                                style={{
                                    borderColor: showDamPicker ? '#455A64' : '#E5E7EB',
                                }}
                            >
                                <View className="flex-1">
                                    <Text className={selectedDam ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                        {selectedDam ? selectedDam.name : t('choose_a_dam', 'Choose a dam')}
                                    </Text>
                                    {selectedDam && (
                                        <Text className="text-gray-500 text-xs mt-0.5">
                                            {selectedDam.location}
                                        </Text>
                                    )}
                                </View>
                                <MaterialCommunityIcons
                                    name={showDamPicker ? 'chevron-up' : 'chevron-down'}
                                    size={24}
                                    color={showDamPicker ? '#455A64' : '#6B7280'}
                                />
                            </TouchableOpacity>

                            {/* Dam Picker Dropdown */}
                            {showDamPicker && (
                                <View
                                    className="mt-2 bg-white rounded-xl overflow-hidden border-2 border-gray-200"
                                    style={{
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 4 },
                                        shadowOpacity: 0.1,
                                        shadowRadius: 8,
                                        elevation: 5,
                                    }}
                                >
                                    <ScrollView
                                        style={{ maxHeight: 220 }}
                                        nestedScrollEnabled={true}
                                        showsVerticalScrollIndicator={true}
                                    >
                                        {dams.map((dam, index) => (
                                            <TouchableOpacity
                                                key={dam.id}
                                                onPress={() => {
                                                    setSelectedDam(dam);
                                                    setShowDamPicker(false);
                                                }}
                                                className={`px-4 py-3.5 ${index < dams.length - 1 ? 'border-b border-gray-100' : ''} ${selectedDam?.id === dam.id ? 'bg-blue-50' : 'bg-white'}`}
                                            >
                                                <View className="flex-row items-center">
                                                    {selectedDam?.id === dam.id && (
                                                        <MaterialCommunityIcons
                                                            name="check-circle"
                                                            size={20}
                                                            color="#3B82F6"
                                                            style={{ marginRight: 8 }}
                                                        />
                                                    )}
                                                    <View className="flex-1">
                                                        <Text className="text-gray-900 font-semibold text-base">
                                                            {dam.name}
                                                        </Text>
                                                        <Text className="text-gray-500 text-sm mt-0.5">
                                                            {dam.location}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        {/* Issue Type Selection */}
                        <View className="mb-5">
                            <Text className="text-gray-700 font-semibold mb-2 text-base">
                                {t('issue_type', 'Issue Type *')}
                            </Text>
                            <View className="flex-row flex-wrap">
                                {ISSUE_TYPES.map((issueType) => (
                                    <TouchableOpacity
                                        key={issueType.value}
                                        disabled={submitting}
                                        onPress={() => setSelectedIssueType(issueType.value)}
                                        className="mr-2 mb-2 px-4 py-2.5 rounded-xl flex-row items-center"
                                        style={{
                                            backgroundColor:
                                                selectedIssueType === issueType.value
                                                    ? issueType.color
                                                    : `${issueType.color}15`,
                                            borderWidth: 2,
                                            borderColor:
                                                selectedIssueType === issueType.value
                                                    ? issueType.color
                                                    : 'transparent',
                                        }}
                                    >
                                        <MaterialCommunityIcons
                                            name={issueType.icon as any}
                                            size={18}
                                            color={
                                                selectedIssueType === issueType.value ? 'white' : issueType.color
                                            }
                                        />
                                        <Text
                                            className="ml-2 font-semibold text-sm"
                                            style={{
                                                color:
                                                    selectedIssueType === issueType.value ? 'white' : issueType.color,
                                            }}
                                        >
                                            {issueType.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Description */}
                        <View className="mb-5">
                            <Text className="text-gray-700 font-semibold mb-2 text-base">
                                {t('description', 'Description *')}
                            </Text>
                            <TextInput
                                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 text-base"
                                placeholder={t('describe_issue_placeholder', 'Describe the issue in detail...')}
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                value={description}
                                onChangeText={setDescription}
                                editable={!submitting}
                                style={{ minHeight: 100 }}
                            />
                        </View>

                        {/* Media Upload */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2 text-base">
                                {t('add_media_optional', 'Add Photos/Videos (Optional)')}
                            </Text>

                            {/* Media Preview - Horizontal Scroll */}
                            {media.length > 0 && (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    className="mb-3"
                                >
                                    {media.map((item, index) => (
                                        <View key={index} className="mr-3">
                                            <View className="relative rounded-xl overflow-hidden" style={{ width: 120, height: 120 }}>
                                                <Image
                                                    source={{ uri: item.uri }}
                                                    style={{ width: 120, height: 120 }}
                                                    resizeMode="cover"
                                                />
                                                {item.type === 'video' && (
                                                    <View className="absolute inset-0 items-center justify-center bg-black/30">
                                                        <MaterialCommunityIcons name="play-circle" size={40} color="white" />
                                                    </View>
                                                )}
                                                {!submitting && (
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            const newMedia = media.filter((_, i) => i !== index);
                                                            setMedia(newMedia);
                                                        }}
                                                        className="absolute top-1 right-1 bg-red-500 rounded-full p-1.5"
                                                        style={{
                                                            shadowColor: '#000',
                                                            shadowOffset: { width: 0, height: 2 },
                                                            shadowOpacity: 0.3,
                                                            shadowRadius: 3,
                                                            elevation: 5,
                                                        }}
                                                    >
                                                        <MaterialCommunityIcons name="close" size={16} color="white" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}

                            {/* Upload Buttons */}
                            <View className="gap-2">
                                <View className="flex-row gap-2">
                                    <TouchableOpacity
                                        onPress={() => handleMediaPicker('camera')}
                                        disabled={submitting}
                                        className="flex-1 bg-blue-50 rounded-xl py-3.5 flex-row items-center justify-center"
                                    >
                                        <MaterialCommunityIcons name="camera" size={20} color="#3B82F6" />
                                        <Text className="ml-2 text-blue-600 font-semibold">{t('photo', 'Photo')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleMediaPicker('video')}
                                        disabled={submitting}
                                        className="flex-1 bg-red-50 rounded-xl py-3.5 flex-row items-center justify-center"
                                    >
                                        <MaterialCommunityIcons name="video" size={20} color="#EF4444" />
                                        <Text className="ml-2 text-red-600 font-semibold">{t('video', 'Video')}</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    onPress={() => handleMediaPicker('gallery')}
                                    disabled={submitting}
                                    className="bg-purple-50 rounded-xl py-3.5 flex-row items-center justify-center"
                                >
                                    <MaterialCommunityIcons name="folder-image" size={20} color="#7C3AED" />
                                    <Text className="ml-2 text-purple-600 font-semibold">{t('gallery', 'Gallery')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Upload Status / Progress Indicator */}
                        {submitting && (
                            <View className="flex-row items-center justify-center mb-4 p-3 bg-gray-50 rounded-xl">
                                <ActivityIndicator size="small" color="#455A64" />
                                <Text className="ml-3 text-sm text-gray-700 font-medium">
                                    {uploadProgress || t('submitting_report', 'Submitting report...')}
                                </Text>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View className="flex-row mb-6">
                            <TouchableOpacity
                                onPress={handleClose}
                                disabled={submitting}
                                className="flex-1 mr-2 bg-gray-100 rounded-xl py-4 items-center"
                            >
                                <Text className="text-gray-700 font-semibold text-base">{t('cancel', 'Cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSubmit}
                                disabled={submitting}
                                className={`flex-1 ml-2 rounded-xl py-4 items-center flex-row justify-center ${submitting ? 'bg-[#78909C]' : 'bg-[#455A64]'}`}
                            >
                                {submitting && <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />}
                                <Text className="text-white font-semibold text-base">
                                    {submitting ? t('submitting_report', 'Submitting...') : t('submit_report', 'Submit Report')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
