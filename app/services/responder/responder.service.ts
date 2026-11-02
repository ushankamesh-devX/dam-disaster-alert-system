import { axiosInstance } from "../api";

export type TeamStatus = 'assigned' | 'on_the_way' | 'arrived' | 'rescued' | 'done';

export type OtherTeam = { userId: number; name: string; station: string; type: string; label: string; status: TeamStatus };

export type Mission = {
  id: number; status: string; typeCode: string; type: string; message?: string | null; battery?: number | null;
  triggeredAt?: string; resolvedAt?: string | null; person: string; damName?: string | null;
  lat: number; lng: number; positionAgeSeconds?: number; teamStatus: TeamStatus;
  otherTeams: OtherTeam[]; backupRequested: boolean; resolutionNotes?: string | null;
};

export type Station = { id: number; name: string; type: string; label: string; lat: number; lng: number };

export type TeamRoute = {
  route: { type: "LineString"; coordinates: [number, number][] }; distanceKm: number; etaMin: number;
  instructions: string[]; routingAvailable: boolean;
};

export type ChatMessage = { id: number; at: string; text: string; from: 'control' | 'team'; fromName: string; fromUserId?: number | null; toPerson: boolean };

export type InboxItem = { key: string; kind: 'broadcast' | 'mission'; atMs: number; fromName: string; text: string; to?: string; sosId?: number };

/** Response team app (role RESPONDER): duty, position, missions, chat, inbox. */
export const responderService = {
  me: async (): Promise<{ station: Station; onDuty: boolean }> => (await axiosInstance.get("/responder/me")).data,
  duty: (onDuty: boolean) => axiosInstance.post("/responder/duty", { onDuty }),
  location: (lat: number, lng: number, battery?: number) => axiosInstance.post("/responder/location", { lat, lng, battery }),
  missions: async (): Promise<Mission[]> => (await axiosInstance.get("/responder/missions")).data,
  act: (id: number, action: "accept" | "arrived" | "resolve" | "backup", notes?: string) =>
    axiosInstance.post(`/responder/missions/${id}/${action}`, notes ? { notes } : {}),
  messages: async (id: number): Promise<ChatMessage[]> => (await axiosInstance.get(`/responder/missions/${id}/messages`)).data,
  send: (id: number, text: string, toPerson = false) => axiosInstance.post(`/responder/missions/${id}/messages`, { text, toPerson }),
  inbox: async (): Promise<InboxItem[]> => (await axiosInstance.get("/responder/inbox")).data,
  route: async (from: [number, number], to: [number, number]): Promise<TeamRoute> =>
    (await axiosInstance.post("/responder/route", { fromLat: from[1], fromLng: from[0], toLat: to[1], toLng: to[0] })).data,
};
