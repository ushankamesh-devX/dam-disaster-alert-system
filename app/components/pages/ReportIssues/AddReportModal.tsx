import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
    Image,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { IssueType, DamOption, MediaItem } from './types';
import { ISSUE_TYPES, DAMS } from './mockData';

interface AddReportModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (report: {
        damName: string;
        issueType: IssueType;
        description: string;
        media?: MediaItem[];
    }) => void;
}

export function AddReportModal({ visible, onClose, onSubmit }: AddReportModalProps) {
    const [selectedDam, setSelectedDam] = useState<DamOption | null>(null);
    const [selectedIssueType, setSelectedIssueType] = useState<IssueType | null>(null);
    const [description, setDescription] = useState('');
    const [showDamPicker, setShowDamPicker] = useState(false);
    const [media, setMedia] = useState<MediaItem[]>([]);

    const resetForm = () => {
        setSelectedDam(null);
        setSelectedIssueType(null);
        setDescription('');
        setMedia([]);
        setShowDamPicker(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = () => {
        if (!selectedDam) {
            Alert.alert('Error', 'Please select a dam');
            return;
        }
        if (!selectedIssueType) {
            Alert.alert('Error', 'Please select an issue type');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Error', 'Please enter a description');
            return;
        }

        onSubmit({
            damName: selectedDam.name,
            issueType: selectedIssueType,
            description: description.trim(),
            media: media.length > 0 ? media : undefined,
        });

        resetForm();
    };

    const handleMediaPicker = async (source: 'camera' | 'gallery' | 'video') => {
        try {
            let result;

            if (source === 'camera') {
                // Request camera permissions
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
                    return;
                }

                // Launch camera for photos
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                });
            } else if (source === 'video') {
                // Request camera permissions for video
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Camera permission is required to record videos.');
                    return;
                }

                // Launch camera for video
                result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                    allowsEditing: true,
                    quality: 0.8,
                    videoMaxDuration: 60, // 60 seconds max
                });
            } else {
                // Request media library permissions
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Gallery permission is required to select media.');
                    return;
                }

                // Launch image picker for both images and videos
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
            Alert.alert('Error', 'Failed to pick media. Please try again.');
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
                        <Text className="text-xl font-bold text-gray-900">Report Issue</Text>
                        <TouchableOpacity onPress={handleClose}>
                            <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView className="px-6 py-4" showsVerticalScrollIndicator={false}>
                        {/* Dam Selection */}
                        <View className="mb-5">
                            <Text className="text-gray-700 font-semibold mb-2 text-base">
                                Select Dam *
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowDamPicker(!showDamPicker)}
                                className="bg-gray-50 rounded-xl px-4 py-4 flex-row items-center justify-between border-2 border-gray-200"
                                style={{
                                    borderColor: showDamPicker ? '#455A64' : '#E5E7EB',
                                }}
                            >
                                <View className="flex-1">
                                    <Text className={selectedDam ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                        {selectedDam ? selectedDam.name : 'Choose a dam'}
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
                                        style={{ maxHeight: 250 }}
                                        nestedScrollEnabled={true}
                                        showsVerticalScrollIndicator={true}
                                    >
                                        {DAMS.map((dam, index) => (
                                            <TouchableOpacity
                                                key={dam.id}
                                                onPress={() => {
                                                    setSelectedDam(dam);
                                                    setShowDamPicker(false);
                                                }}
                                                className={`px-4 py-3.5 ${index < DAMS.length - 1 ? 'border-b border-gray-100' : ''
                                                    } ${selectedDam?.id === dam.id ? 'bg-blue-50' : 'bg-white'}`}
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
                                Issue Type *
                            </Text>
                            <View className="flex-row flex-wrap">
                                {ISSUE_TYPES.map((issueType) => (
                                    <TouchableOpacity
                                        key={issueType.value}
                                        onPress={() => setSelectedIssueType(issueType.value)}
                                        className="mr-2 mb-2 px-4 py-2.5 rounded-xl flex-row items-center"
                                        style={{
                                            backgroundColor:
                                                selectedIssueType === issueType.value
                                                    ? issueType.color
                                                    : `${issueType.color} 15`,
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
                                Description *
                            </Text>
                            <TextInput
                                className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 text-base"
                                placeholder="Describe the issue in detail..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                value={description}
                                onChangeText={setDescription}
                                style={{ minHeight: 100 }}
                            />
                        </View>

                        {/* Media Upload */}
                        <View className="mb-6">
                            <Text className="text-gray-700 font-semibold mb-2 text-base">
                                Add Photos/Videos (Optional)
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
                                                {/* Video Play Icon Overlay */}
                                                {item.type === 'video' && (
                                                    <View className="absolute inset-0 items-center justify-center bg-black/30">
                                                        <MaterialCommunityIcons name="play-circle" size={40} color="white" />
                                                    </View>
                                                )}
                                                {/* Remove Button */}
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
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}

                            {/* Upload Buttons */}
                            <View className="gap-2">
                                {/* Top Row - Photo and Video */}
                                <View className="flex-row gap-2">
                                    <TouchableOpacity
                                        onPress={() => handleMediaPicker('camera')}
                                        className="flex-1 bg-blue-50 rounded-xl py-3.5 flex-row items-center justify-center"
                                    >
                                        <MaterialCommunityIcons name="camera" size={20} color="#3B82F6" />
                                        <Text className="ml-2 text-blue-600 font-semibold">Photo</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleMediaPicker('video')}
                                        className="flex-1 bg-red-50 rounded-xl py-3.5 flex-row items-center justify-center"
                                    >
                                        <MaterialCommunityIcons name="video" size={20} color="#EF4444" />
                                        <Text className="ml-2 text-red-600 font-semibold">Video</Text>
                                    </TouchableOpacity>
                                </View>
                                {/* Bottom Row - Gallery */}
                                <TouchableOpacity
                                    onPress={() => handleMediaPicker('gallery')}
                                    className="bg-purple-50 rounded-xl py-3.5 flex-row items-center justify-center"
                                >
                                    <MaterialCommunityIcons name="folder-image" size={20} color="#7C3AED" />
                                    <Text className="ml-2 text-purple-600 font-semibold">Gallery</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row mb-4">
                            <TouchableOpacity
                                onPress={handleClose}
                                className="flex-1 mr-2 bg-gray-100 rounded-xl py-4 items-center"
                            >
                                <Text className="text-gray-700 font-semibold text-base">Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleSubmit}
                                className="flex-1 ml-2 bg-[#455A64] rounded-xl py-4 items-center"
                            >
                                <Text className="text-white font-semibold text-base">Submit Report</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
