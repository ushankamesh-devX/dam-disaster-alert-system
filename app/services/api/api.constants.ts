export const ENDPOINTS = {
  HEALTH: "/health",

  AUTH: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    TEST: "/auth/test",
  },

  USERS: {
    BASE: "/users",
    ME: "/users/me",
    ME_PASSWORD: "/users/me/password",
    ME_LOCATION: "/users/me/location",
    ME_PUSH_TOKEN: "/users/me/push-token",
    STATS: "/users/stats",
    BY_ROLE: (roleId: string) => `/users/by-role/${roleId}`,
    BY_STATUS: (status: string) => `/users/by-status/${status}`,
    SEARCH: "/users/search",
    BY_ID: (id: string) => `/users/${id}`,
    ROLE: (id: string) => `/users/${id}/role`,
    STATUS: (id: string) => `/users/${id}/status`,
    RESTORE: (id: string) => `/users/${id}/restore`,
  },

  DAMS: {
    BASE: "/dams",
    LIST: "/dams/list",
    ACTIVE: "/dams/active",
    SEARCH: "/dams/search",
    FILTER: "/dams/filter",
    BY_ID: (id: string) => `/dams/${id}`,
    BY_CODE: (code: string) => `/dams/code/${code}`,
    BY_REGION: (regionId: string) => `/dams/region/${regionId}`,
    BY_STATUS: (status: string) => `/dams/status/${status}`,
    BY_HAZARD_STATUS: (status: string) => `/dams/hazard-status/${status}`,
  },

  DAM_STATUS: {
    ALL: "/dams/statuses",
    HIGH_RISK: "/dams/statuses/high-risk",
    BY_DAM: (damId: string) => `/dams/${damId}/status`,
  },

  DAM_GATES: {
    BY_DAM: (damId: string) => `/dams/${damId}/gates`,
    OPEN_BY_DAM: (damId: string) => `/dams/${damId}/gates/open`,
    BY_ID: (id: string) => `/dams/gates/${id}`,
    BASE: "/dams/gates",
  },

  SENSORS: {
    BASE: "/sensors",
    TYPES: "/sensors/types",
    BY_ID: (id: string) => `/sensors/${id}`,
    BY_UID: (uid: string) => `/sensors/uid/${uid}`,
    BY_DAM: (damId: string) => `/sensors/dam/${damId}`,
    ACTIVE_BY_DAM: (damId: string) => `/sensors/dam/${damId}/active`,
    PROBLEMATIC_BY_DAM: (damId: string) => `/sensors/dam/${damId}/problematic`,
    BY_STATUS: (status: string) => `/sensors/status/${status}`,
    READINGS: (id: string) => `/sensors/${id}/readings`,
    LATEST_READING: (id: string) => `/sensors/${id}/readings/latest`,
    LATEST_BY_DAM: (damId: string) => `/sensors/dam/${damId}/readings/latest`,
    READINGS_RANGE: (id: string) => `/sensors/${id}/readings/range`,
    STATISTICS: (id: string) => `/sensors/${id}/statistics`,
    STATISTICS_BY_DAM: (damId: string) => `/sensors/dam/${damId}/statistics`,
    READINGS_BASE: "/sensors/readings",
    READINGS_BATCH: "/sensors/readings/batch",
  },

  HAZARD_LEVELS: {
    BASE: "/hazard-levels",
    ACTIVE: "/hazard-levels/active",
    BY_ID: (id: string) => `/hazard-levels/${id}`,
  },

  HAZARD_ZONES: {
    BY_DAM: (damId: string) => `/dams/${damId}/hazard-zones`,
    ACTIVE_BY_DAM: (damId: string) => `/dams/${damId}/hazard-zones/active`,
    BY_ID: (id: string) => `/dams/hazard-zones/${id}`,
    BASE: "/dams/hazard-zones",
  },

  REGIONS: {
    BASE: "/regions",
    BY_ID: (id: string) => `/regions/${id}`,
  },

  ROLES: {
    BASE: "/roles",
    DEFAULT: "/roles/default",
    BY_ID: (id: string) => `/roles/${id}`,
  },

  ALERTS: {
    BASE: "/alerts",
    ACTIVE: "/alerts/active",
    FEED: "/alerts/feed",
    SEARCH: "/alerts/search",
    BY_DAM: (damId: string) => `/alerts/dam/${damId}`,
    STATUS: (id: string) => `/alerts/${id}/status`,
  },

  NEWS: {
    BASE: "/news-articles",
    FEATURED: "/news-articles/featured",
    SEARCH: "/news-articles/search",
    BY_ID: (id: string) => `/news-articles/${id}`,
    SAVE: (id: string) => `/news-articles/${id}/save`,
    SHARE: (id: string) => `/news-articles/${id}/share`,
    VIEW: (id: string) => `/news-articles/${id}/view`,
    PUBLISH: (id: string) => `/news-articles/${id}/publish`,
    ARCHIVE: (id: string) => `/news-articles/${id}/archive`,
    PUSH_LOGS: (id: string) => `/news-articles/${id}/push-logs`,
    CATEGORIES: "/news-categories",
    CATEGORY_BY_ID: (id: string) => `/news-categories/${id}`,
    ARTICLES_BY_CATEGORY: (id: string) => `/news-categories/${id}/articles`,
    SUBSCRIPTIONS: "/news-subscriptions",
    SUBSCRIPTION_BY_ID: (id: string) => `/news-subscriptions/${id}`,
    SAVED_BY_USER: (userId: string) => `/users/${userId}/saved-news`,
    USER_SUBSCRIPTIONS: (userId: string) => `/users/${userId}/news-subscriptions`,
  },

  SAFE_LOCATIONS: {
    LIST: "/system-safe-locations/list",
    BY_UUID: (uuid: string) => `/system-safe-locations/uuid/${uuid}`,
    BASE: "/system-safe-locations",
    BULK_UPSERT: "/system-safe-locations/bulk-upsert",
    BY_ID: (id: string) => `/system-safe-locations/${id}`,
  },

  DEVICE: {
    PING: "/device/ping",
    READINGS: "/device/readings",
    READINGS_BATCH: "/device/readings/batch",
  },

  DEVICE_KEYS: {
    BASE: "/device-keys",
    BY_ID: (id: string) => `/device-keys/${id}`,
    BY_SENSOR: (sensorId: string) => `/device-keys/sensor/${sensorId}`,
    REGENERATE: (id: string) => `/device-keys/${id}/regenerate`,
    ACTIVATE: (id: string) => `/device-keys/${id}/activate`,
    DEACTIVATE: (id: string) => `/device-keys/${id}/deactivate`,
  },
};
