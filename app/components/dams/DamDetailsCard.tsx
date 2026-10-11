import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { damService } from '@/services/dams/dam.service';
import { pickDisplayedDam } from '@/services/dams/display-dam';
import { ensureAuth } from '@/services/api/auto-auth';

export function DamDetailsCard() {
  const [dam, setDam] = useState<Record<string, unknown> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureAuth();
      const response = await damService.getActive();
      const dams: Record<string, unknown>[] = Array.isArray(response.data)
        ? response.data : (response.data?.data ?? []);
      const selected = pickDisplayedDam(dams);
      if (!selected) throw new Error('No active dam');
      const detail = await damService.getById(String(selected.id ?? selected.damId));
      if (!cancelled) setDam(detail.data?.data ?? detail.data);
    })().catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  if (!dam) return <Text className="text-gray-600 px-4 py-3">{failed ? 'Dam details unavailable. Check the API connection.' : 'Loading dam details…'}</Text>;
  const region = dam.region as Record<string, unknown> | undefined;
  const demo = dam.code === 'DEMO-002';
  const value = (field: string, unit = '') => dam[field] == null ? '—' : `${dam[field]}${unit}`;
  return <View className="bg-white rounded-2xl p-4 my-3 border border-gray-200">
    <Text className="text-gray-900 text-lg font-bold">{String(dam.name)}</Text>
    <Text className="text-gray-500 text-sm mt-1">{String(region?.name ?? 'Sri Lanka')} · {String(dam.riverName ?? '')}</Text>
    <View className="flex-row flex-wrap mt-3">
      {[
        ['Type', value('damType')], ['Height', value('heightMeters', ' m')],
        ['Length', value('lengthMeters', ' m')], ['Capacity', value('reservoirCapacityMcm', ' MCM')],
        ['Completed', value('yearCompleted')], ['Location', `${value('latitude')}, ${value('longitude')}`],
      ].map(([label, text]) => <View key={label} className="w-1/2 pr-2 mb-2">
        <Text className="text-gray-500 text-xs">{label}</Text>
        <Text className="text-gray-800 text-sm font-semibold">{text}</Text>
      </View>)}
    </View>
    {demo && <Text className="text-amber-700 text-xs mt-2">Demo scenario: Danger Levels 1–3 and water readings are illustrative, not live flood forecasts.</Text>}
  </View>;
}
