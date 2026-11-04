import { axiosInstance, ENDPOINTS } from "../api";
import Constants from "expo-constants";
import { API_BASE_URL } from "@env";

export interface NewsArticleItem {
  id: string;
  image: string;
  imageUrl: string;
  image_url: string;
  category: string;
  categoryFilterKey?: string;
  title: string;
  description: string;
  fullContent: string;
  timeAgo: string;
  publishDate?: string;
  filter: string;
  source?: string;
  priorityLevel?: string;
  isFeatured?: boolean;
}

export function getServerOrigin(): string {
  // 1. Get raw base URL from axiosInstance or environment
  const rawBase = (axiosInstance.defaults.baseURL || API_BASE_URL || "http://localhost:8080").trim();

  // 2. Extract host and port only, stripping /api/v1 or any trailing path
  let origin = "";
  try {
    const url = new URL(rawBase);
    origin = url.origin; // e.g. "http://192.168.1.2:8080"
  } catch {
    origin = rawBase.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
  }

  // 3. Physical phone support (Expo Go):
  // When running on a physical phone via Expo Go, requests to localhost/127.0.0.1 fail because
  // localhost refers to the phone itself. We resolve the PC's actual LAN IP from Expo's hostUri.
  const expoHost =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoClient?.hostUri;

  if (expoHost) {
    const lanIp = expoHost.replace(/^https?:\/\//, "").split(":")[0];
    if (lanIp && lanIp !== "localhost" && lanIp !== "127.0.0.1") {
      if (origin.includes("localhost") || origin.includes("127.0.0.1") || origin.includes("0.0.0.0")) {
        try {
          const parsed = new URL(origin);
          origin = `${parsed.protocol}//${lanIp}:${parsed.port || "8080"}`;
        } catch {
          origin = `http://${lanIp}:8080`;
        }
      }
    }
  }

  return origin.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
}

export function resolveNewsImageUrl(imageUrl?: string | null): string {
  if (!imageUrl || typeof imageUrl !== "string" || !imageUrl.trim()) {
    return "";
  }
  const trimmed = imageUrl.trim();
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("file://")
  ) {
    return trimmed;
  }
  const origin = getServerOrigin();
  let cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  // Ensure the relative path includes /api/v1 if it starts with /news-articles
  if (cleanPath.startsWith("/news-articles/")) {
    cleanPath = `/api/v1${cleanPath}`;
  }
  return `${origin}${cleanPath}`;
}

export function formatTimeAgo(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function mapFilterCategory(dto: Record<string, any>): string {
  const rawKey = String(
    dto.categoryFilterKey ||
    dto.category_filter_key ||
    dto.categorySlug ||
    dto.category_slug ||
    dto.filterTag ||
    dto.filter_tag ||
    dto.categoryName ||
    dto.category_name ||
    dto.category?.filterKey ||
    dto.category?.filter_key ||
    dto.category?.name ||
    ""
  ).toLowerCase();

  if (rawKey.includes("dam")) return "dam-status";
  if (rawKey.includes("weather") || rawKey.includes("rain") || rawKey.includes("climate")) return "weather-alerts";
  if (rawKey.includes("emerg") || rawKey.includes("landslide") || rawKey.includes("flood") || rawKey.includes("alert") || rawKey.includes("hazard")) return "emergency";

  return rawKey.replace(/\s+/g, "-");
}

export function mapNewsArticle(item: Record<string, any>): NewsArticleItem {
  const category =
    (item.category as Record<string, any>)?.name ??
    item.categoryName ??
    item.category_name ??
    item.category ??
    "News";
  const publishDate =
    item.publishDate ??
    item.publish_date ??
    item.publishedAt ??
    item.published_at ??
    item.createdAt ??
    item.created_at;
  const timeAgo = formatTimeAgo(publishDate);
  const rawImage =
    item.imageUrl ??
    item.image_url ??
    item.image ??
    item.thumbnailUrl ??
    item.thumbnail_url ??
    "";
  const resolvedImage = resolveNewsImageUrl(rawImage);
  const filter = mapFilterCategory(item);

  return {
    id: String(item.id ?? ""),
    image: resolvedImage,
    imageUrl: resolvedImage,
    image_url: resolvedImage,
    category: String(category),
    categoryFilterKey: item.categoryFilterKey || item.category_filter_key,
    title: String(item.title ?? ""),
    description: String(item.summary ?? item.summary_si ?? item.description ?? item.content ?? ""),
    fullContent: String(item.content ?? item.content_si ?? item.summary ?? item.description ?? ""),
    timeAgo,
    publishDate: publishDate ? String(publishDate) : undefined,
    filter,
    source: item.source ? String(item.source) : undefined,
    priorityLevel: item.priorityLevel || item.priority_level ? String(item.priorityLevel || item.priority_level) : undefined,
    isFeatured: Boolean(item.isFeatured ?? item.is_featured),
  };
}

export const newsService = {
  getAll: (params?: { page?: number; size?: number; status?: string }) =>
    axiosInstance.get(ENDPOINTS.NEWS.BASE, {
      params: {
        status: "published",
        size: 50,
        ...params,
      },
    }),

  getById: (id: string) => axiosInstance.get(ENDPOINTS.NEWS.BY_ID(id)),

  getFeatured: () => axiosInstance.get(ENDPOINTS.NEWS.FEATURED),

  search: (q: string) =>
    axiosInstance.get(ENDPOINTS.NEWS.SEARCH, { params: { q } }),

  saveArticle: (id: string) =>
    axiosInstance.post(ENDPOINTS.NEWS.SAVE(id)),

  shareArticle: (id: string) =>
    axiosInstance.post(ENDPOINTS.NEWS.SHARE(id)),

  markViewed: (id: string) =>
    axiosInstance.post(ENDPOINTS.NEWS.VIEW(id)),

  getPushLogs: (id: string) =>
    axiosInstance.get(ENDPOINTS.NEWS.PUSH_LOGS(id)),

  getSavedByUser: (userId: string) =>
    axiosInstance.get(ENDPOINTS.NEWS.SAVED_BY_USER(userId)),

  getUserSubscriptions: (userId: string) =>
    axiosInstance.get(ENDPOINTS.NEWS.USER_SUBSCRIPTIONS(userId)),

  create: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.NEWS.BASE, data),

  update: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put(ENDPOINTS.NEWS.BY_ID(id), data),

  publish: (id: string) => axiosInstance.patch(ENDPOINTS.NEWS.PUBLISH(id)),

  archive: (id: string) => axiosInstance.patch(ENDPOINTS.NEWS.ARCHIVE(id)),

  delete: (id: string) => axiosInstance.delete(ENDPOINTS.NEWS.BY_ID(id)),

  createSubscription: (data: Record<string, unknown>) =>
    axiosInstance.post(ENDPOINTS.NEWS.SUBSCRIPTIONS, data),

  updateSubscription: (id: string, data: Record<string, unknown>) =>
    axiosInstance.put(ENDPOINTS.NEWS.SUBSCRIPTION_BY_ID(id), data),

  deleteSubscription: (id: string) =>
    axiosInstance.delete(ENDPOINTS.NEWS.SUBSCRIPTION_BY_ID(id)),
};
