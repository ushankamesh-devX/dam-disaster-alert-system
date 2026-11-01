import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDashboard, type DashboardSnapshot } from '@/services/dams/dashboard.service';

export function useDamDashboard(damId: number | null | undefined) {
  const [data, setData] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setLoading(true); setError(false); setData(null);
    try {
      if (!damId) throw new Error('No selected dam');
      const result = await loadDashboard(damId);
      if (request === generation.current) setData(result);
    } catch {
      if (request === generation.current) setError(true);
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [damId]);
  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    return () => { clearTimeout(initial); invalidate(); };
  }, [refresh, invalidate]);
  return { data, loading, error, refresh };
}
