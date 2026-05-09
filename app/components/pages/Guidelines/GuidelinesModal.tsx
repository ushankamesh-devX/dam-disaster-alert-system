import React from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Guideline } from '@/models/guideline';

interface GuidelinesModalProps {
  visible: boolean;
  guidelines: Guideline[];
  onClose: () => void;
  title?: string;
}

const severityColors: Record<NonNullable<Guideline['severity']>, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#b91c1c',
};

export function GuidelinesModal({
  visible,
  guidelines,
  onClose,
  title = 'Guidelines',
}: GuidelinesModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-4">
        <View className="bg-white w-full rounded-2xl overflow-hidden">
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-gray-200">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="book-open-variant" size={22} color="#111827" />
              <Text className="text-lg font-semibold text-gray-900 ml-2">{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close guidelines">
              <MaterialCommunityIcons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="max-h-[70vh]">
            <View className="px-5 py-4">
              {guidelines.map((g) => (
                <View key={g.id} className="mb-4 rounded-xl border border-gray-200 p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-base font-semibold text-gray-900">{g.title}</Text>
                    {g.severity && (
                      <View
                        style={{ backgroundColor: severityColors[g.severity] }}
                        className="px-2 py-[2px] rounded-full"
                      >
                        <Text className="text-white text-[10px] font-bold uppercase">{g.severity}</Text>
                      </View>
                    )}
                  </View>

                  {g.description && (
                    <Text className="text-sm text-gray-600 mt-2">{g.description}</Text>
                  )}

                  {g.steps && g.steps.length > 0 && (
                    <View className="mt-3 space-y-2">
                      {g.steps.map((step, idx) => (
                        <View key={`${g.id}-s-${idx}`} className="flex-row">
                          <Text className="text-sm text-gray-500 mr-2">•</Text>
                          <Text className="text-sm text-gray-700 flex-1">{step}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          <View className="px-5 pb-4">
            <TouchableOpacity
              onPress={onClose}
              className="bg-gray-900 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
