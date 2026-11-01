import { axiosInstance, ENDPOINTS } from "../api";

// Public evacuation endpoints live under /api/public, next to the /api/v1 base URL
const publicUrl = (path: string) =>
  `${String(axiosInstance.defaults.baseURL || "").replace(/\/api\/v1\/?$/, "")}/api/public/evacuation${path}`;

export type Zone = {
  id: number; name: string; damName: string; hazardLevel: number; color?: string;
  boundaryGeojson: string; floodEtaMin?: number | null;
};

export type Shelter = {
  id: number; name: string; lat: number; lng: number; capacity?: number | null; occupancy?: number | null;
  status?: string; inDangerZone?: boolean; floodSafety?: string | null; aboveFloodM?: number | null;
  kind?: string | null; boundaryGeojson?: string | null;
};

export type EvacStatus = {
  dangerZones: Zone[]; watchZones: Zone[]; planningZones: Zone[]; shelters: Shelter[];
  blockedRoads: { id: number; name: string; boundaryGeojson: string }[];
};

export type RouteResult = {
  inDangerZone: boolean; zone?: { id: number; name: string; hazardLevel: number; damName: string } | null;
  floodEtaMin?: number | null; shelter: Shelter & { freeCapacity?: number | null };
  route?: { type: "LineString"; coordinates: [number, number][] } | null;
  distanceKm: number; etaMin: number; safe: boolean; routingAvailable: boolean; instructions?: string[];
};

export type SosType = { code: string; name: string; defaultMessage?: string };
export type MySos = { id: number; status: string; type: string; triggeredAt: string; responseNotes?: string | null; resolvedAt?: string | null };

export const evacuationService = {
  status: async (): Promise<EvacStatus> => (await axiosInstance.get(publicUrl("/status"))).data,

  route: async (lat: number, lng: number, mode: "walk" | "drive"): Promise<RouteResult> =>
    (await axiosInstance.post(publicUrl("/route"), { lat, lng, mode })).data,

  sosTypes: async (): Promise<SosType[]> => (await axiosInstance.get("/safety/sos-types")).data,

  /** Share the position with the command center (starts sharing on the first call). */
  shareLocation: (lat: number, lng: number, speedMps?: number) =>
    axiosInstance.post("/safety/location", { lat, lng, speedMps }),

  stopSharing: () => axiosInstance.post("/safety/location/stop"),

  imSafe: () => axiosInstance.post("/safety/safe"),

  sendSos: async (type: string, lat: number, lng: number, message?: string) =>
    (await axiosInstance.post("/safety/sos", { type, lat, lng, message })).data as { sosId: number },

  mySos: async (): Promise<MySos[]> => (await axiosInstance.get("/safety/sos")).data,

  dams: async () => (await axiosInstance.get(ENDPOINTS.DAMS.LIST)).data as
    { id: number; name: string; latitude: number; longitude: number }[],

  damStatuses: async () => (await axiosInstance.get(ENDPOINTS.DAM_STATUS.ALL)).data as {
    damId: number; damName: string; waterLevelMeters?: number; waterLevelPercentage?: number;
    dangerLevelMeters?: number; outflowCumecs?: number; gatesOpenCount?: number; lastUpdated?: string;
  }[],

  activeAlerts: async () => {
    const res = (await axiosInstance.get(ENDPOINTS.ALERTS.ACTIVE)).data;
    return (Array.isArray(res) ? res : res?.data ?? []) as {
      id: number; title: string; message?: string; severity?: string; damId?: number; damName?: string;
      createdAt?: string; simulationMode?: boolean;
    }[];
  },
};

// ── Geometry helpers ([lng, lat] order, like GeoJSON) ─────────────────────────

function rings(geojson: string): number[][][] {
  try {
    const g0 = JSON.parse(geojson);
    const g = g0.geometry ?? g0;
    return g.type === "Polygon" ? [g.coordinates[0]] : g.type === "MultiPolygon" ? g.coordinates.map((p: number[][][]) => p[0]) : [];
  } catch {
    return [];
  }
}

function inside(lng: number, lat: number, ring: number[][]) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x1, y1] = ring[j], [x2, y2] = ring[i];
    if ((y1 > lat) !== (y2 > lat) && lng < ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1) hit = !hit;
  }
  return hit;
}

/** The most dangerous zone containing the point (lowest level number). */
export function zoneAt(zones: Zone[], lat: number, lng: number): Zone | null {
  return zones.filter((z) => rings(z.boundaryGeojson).some((r) => inside(lng, lat, r)))
    .sort((a, b) => a.hazardLevel - b.hazardLevel)[0] ?? null;
}

export function metres(a: [number, number], b: [number, number]) {
  const lat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  return Math.hypot((b[0] - a[0]) * 111320 * Math.cos(lat), (b[1] - a[1]) * 110540);
}
