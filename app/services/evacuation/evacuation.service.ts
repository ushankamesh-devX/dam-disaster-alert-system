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

export type River = {
  damId: number; damName: string; damLat?: number | null; damLng?: number | null; geojson: string;
  active: boolean; minutesSinceRelease?: number | null;
};

export type EvacStatus = {
  dangerZones: Zone[]; watchZones: Zone[]; planningZones: Zone[]; shelters: Shelter[]; rivers?: River[];
  blockedRoads: { id: number; name: string; boundaryGeojson: string }[];
};

export type RouteResult = {
  inDangerZone: boolean; zone?: { id: number; name: string; hazardLevel: number; damName: string } | null;
  floodEtaMin?: number | null; shelter: Shelter & { freeCapacity?: number | null };
  route?: { type: "LineString"; coordinates: [number, number][] } | null;
  distanceKm: number; etaMin: number; safe: boolean; routingAvailable: boolean; instructions?: string[];
};

export type SosType = { code: string; name: string; defaultMessage?: string };
export type MySos = {
  id: number; status: string; type: string; triggeredAt: string; responseNotes?: string | null; resolvedAt?: string | null;
  team?: string | null; teamStatus?: string | null; teamLat?: number | string | null; teamLng?: number | string | null;
};

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

/** A point inside a zone (zones follow the river, so the plain centre can fall outside). */
export function interiorPoint(geojson: string): [number, number] | null {
  const ring = rings(geojson).sort((a, b) => b.length - a.length)[0];
  if (!ring?.length) return null;
  const xs = ring.map((p) => p[0]), ys = ring.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let best: [number, number] | null = null, bestD = Infinity;
  for (let i = 1; i < 12; i++) {
    for (let j = 1; j < 12; j++) {
      const x = x0 + ((x1 - x0) * i) / 12, y = y0 + ((y1 - y0) * j) / 12;
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d < bestD && inside(x, y, ring)) { best = [x, y]; bestD = d; }
    }
  }
  return best ?? [ring[0][0], ring[0][1]];
}

/** Flood front: minutes after release -> km down the river (same timing as the zones and the web map). */
const FRONT: [number, number][] = [[0, 0], [15, 3], [40, 8], [80, 15], [140, 25], [210, 35]];
export function frontKm(minutes: number) {
  if (minutes <= 0) return 0;
  for (let i = 1; i < FRONT.length; i++) {
    const [t0, d0] = FRONT[i - 1], [t1, d1] = FRONT[i];
    if (minutes <= t1) return d0 + ((d1 - d0) * (minutes - t0)) / (t1 - t0);
  }
  return FRONT[FRONT.length - 1][1];
}

export function metres(a: [number, number], b: [number, number]) {
  const lat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  return Math.hypot((b[0] - a[0]) * 111320 * Math.cos(lat), (b[1] - a[1]) * 110540);
}
