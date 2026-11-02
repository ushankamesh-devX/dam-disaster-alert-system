import { axiosInstance, ENDPOINTS } from "../api";

export type AppAlert = {
  id: number;
  title: string;
  message?: string;
  alertTypeName?: string;
  severity?: "info" | "warning" | "critical" | "emergency";
  status?: string;
  damId?: number | null;
  simulationMode?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

// The API wraps lists as { success, message, data }
const unwrap = (res: { data: unknown }): AppAlert[] => {
  const body = res.data as { data?: AppAlert[] } | AppAlert[];
  return Array.isArray(body) ? body : body?.data ?? [];
};

export const alertService = {
  getAll: (params?: { page?: number; size?: number }) =>
    axiosInstance.get(ENDPOINTS.ALERTS.BASE, { params }),

  getActive: () => axiosInstance.get(ENDPOINTS.ALERTS.ACTIVE),

  /** Alerts in force now (the ones the admin web shows as active). */
  listActive: async () => unwrap(await axiosInstance.get(ENDPOINTS.ALERTS.ACTIVE)),

  /** Resolved alerts, newest first. */
  listHistory: async () => unwrap(await axiosInstance.get(ENDPOINTS.ALERTS.SEARCH, { params: { status: "resolved" } })),

  getByDam: (damId: string) =>
    axiosInstance.get(ENDPOINTS.ALERTS.BY_DAM(damId)),

  search: (q: string) =>
    axiosInstance.get(ENDPOINTS.ALERTS.SEARCH, { params: { q } }),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.ALERTS.BASE, data),

  updateStatus: (id: string, status: string) =>
    axiosInstance.patch(ENDPOINTS.ALERTS.STATUS(id), { status }),
};
