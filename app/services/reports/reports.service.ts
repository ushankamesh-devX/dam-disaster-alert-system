import { axiosInstance } from "../api";
import Constants from "expo-constants";
import { API_BASE_URL } from "@env";
import { Platform } from "react-native";
import { IssueType, MediaItem } from "@/components/pages/ReportIssues/types";

export interface ReportFeedItem {
  id: number;
  damName: string;
  issueType: string;
  issueTypeName?: string;
  title?: string;
  description: string;
  mediaUrls: string[];
  status: 'pending' | 'reviewing' | 'in_progress' | 'resolved' | string;
  createdAt: string;
  reporterDisplayName: string;
  isMine: boolean;
}

export interface ReportFeedParams {
  page?: number;
  size?: number;
  search?: string;
  issueType?: string;
}

export interface CreateReportPayload {
  damId?: number | string;
  damName?: string;
  issueType?: IssueType | string;
  description: string;
  latitude?: number;
  longitude?: number;
  locationDescription?: string;
  isAnonymous?: boolean;
  media?: MediaItem[];
}

export function getServerOrigin(): string {
  // 1. Get raw base URL from axiosInstance or environment
  const rawBase = (axiosInstance.defaults.baseURL || API_BASE_URL || 'http://localhost:8080').trim();

  // 2. Extract host and port only, stripping /api/v1 or any trailing path
  let origin = '';
  try {
    const url = new URL(rawBase);
    origin = url.origin; // e.g. "http://192.168.1.2:8080"
  } catch {
    origin = rawBase.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  }

  // 3. Physical phone support: If origin points to localhost or 127.0.0.1, resolve the LAN IP from Expo
  const expoHost =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (expoHost && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    const lanIp = expoHost.replace(/^https?:\/\//, '').split(':')[0];
    if (lanIp && lanIp !== 'localhost' && lanIp !== '127.0.0.1') {
      try {
        const parsed = new URL(origin);
        origin = `${parsed.protocol}//${lanIp}:${parsed.port || '8080'}`;
      } catch {
        origin = `http://${lanIp}:8080`;
      }
    }
  }

  return origin.replace(/\/+$/, '');
}

export function resolveReportMediaUrl(mediaUrl?: string | null): string {
  if (!mediaUrl || typeof mediaUrl !== 'string' || !mediaUrl.trim()) {
    return '';
  }
  const trimmed = mediaUrl.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file://')
  ) {
    return trimmed;
  }
  const origin = getServerOrigin();
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${origin}${cleanPath}`;
}

export const reportsService = {
  getFeed: (params?: ReportFeedParams) =>
    axiosInstance.get('/reports/feed', { params }),

  getMyReports: (params?: { page?: number; size?: number }) =>
    axiosInstance.get('/reports/mine', { params }),

  getById: (id: string | number) =>
    axiosInstance.get(`/reports/${id}`),

  getReportTypes: () =>
    axiosInstance.get('/report-types'),

  createReport: (data: CreateReportPayload, onUploadProgress?: (progressEvent: any) => void) => {
    const formData = new FormData();

    if (data.damId !== undefined && data.damId !== null && data.damId !== '') {
      formData.append('damId', String(data.damId));
    }
    if (data.damName) {
      formData.append('damName', data.damName);
    }
    if (data.issueType) {
      formData.append('issueType', String(data.issueType));
    }
    formData.append('description', data.description);

    if (data.latitude !== undefined && data.latitude !== null) {
      formData.append('latitude', String(data.latitude));
    }
    if (data.longitude !== undefined && data.longitude !== null) {
      formData.append('longitude', String(data.longitude));
    }
    if (data.locationDescription) {
      formData.append('locationDescription', data.locationDescription);
    }
    if (data.isAnonymous !== undefined) {
      formData.append('isAnonymous', String(data.isAnonymous));
    }

    if (data.media && data.media.length > 0) {
      data.media.forEach((item, index) => {
        const uri = item.uri;
        const filename = uri.split('/').pop() || `upload_${index}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
        const match = /\.(\w+)$/.exec(filename);
        const ext = match ? match[1].toLowerCase() : (item.type === 'video' ? 'mp4' : 'jpg');
        let mimeType = item.type === 'video' ? 'video/mp4' : 'image/jpeg';
        if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'mp4') mimeType = 'video/mp4';

        const fileObj = {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: filename,
          type: mimeType,
        };

        // Backend accepts "files" list
        formData.append('files', fileObj as any);
      });
    }

    return axiosInstance.post('/reports', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },
};
