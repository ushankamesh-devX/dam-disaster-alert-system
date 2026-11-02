import { axiosInstance } from "../api";

export type Mission = {
  id: number; status: string; typeCode: string; type: string; message?: string | null; battery?: number | null;
  triggeredAt?: string; assignedAt?: string; resolvedAt?: string | null; person: string; damName?: string | null;
  lat: number; lng: number; positionAgeSeconds?: number; teamStatus: 'assigned' | 'on_the_way' | 'arrived' | 'rescued';
  resolutionNotes?: string | null;
};

export type Station = { id: number; name: string; type: string; lat: number; lng: number; address?: string | null };

export type TeamRoute = {
  route: { type: "LineString"; coordinates: [number, number][] }; distanceKm: number; etaMin: number;
  instructions: string[]; routingAvailable: boolean;
};

/** Demo response teams (role RESPONDER): missions assigned to their station. Simulated teams only. */
export const responderService = {
  me: async (): Promise<{ station: Station | null }> => (await axiosInstance.get("/responder/me")).data,
  missions: async (): Promise<Mission[]> => (await axiosInstance.get("/responder/missions")).data,
  act: (id: number, action: "accept" | "arrived" | "resolve", notes?: string) =>
    axiosInstance.post(`/responder/missions/${id}/${action}`, notes ? { notes } : {}),
  location: (lat: number, lng: number) => axiosInstance.post("/responder/location", { lat, lng }),
  route: async (from: [number, number], to: [number, number]): Promise<TeamRoute> =>
    (await axiosInstance.post("/responder/route", { fromLat: from[1], fromLng: from[0], toLat: to[1], toLng: to[0] })).data,
};
