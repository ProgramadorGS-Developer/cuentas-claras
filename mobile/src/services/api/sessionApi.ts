import { httpClient } from "./httpClient";
import { Session } from "@/domain/models";

// RF-03, RF-04, CU-01: crear sesión, unirse por link, listar historial.
export const sessionApi = {
  create: (payload: { name: string; hostName: string; items: string[] }) =>
    httpClient.post<Session>("/sessions", payload),

  getByToken: (shareToken: string) =>
    httpClient.get<Session>(`/sessions/by-token/${shareToken}`),

  list: () => httpClient.get<Session[]>("/sessions"),

  getById: (sessionId: string) => httpClient.get<Session>(`/sessions/${sessionId}`),

  // Solo el anfitrión, y solo mientras nadie más se unió (EDT 1.1.2.1).
  update: (sessionId: string, payload: { participantId: string; name?: string; items?: string[] }) =>
    httpClient.patch<Session>(`/sessions/${sessionId}`, payload),

  // RF-04: cerrar la sesión (solo el anfitrión).
  close: (sessionId: string, participantId: string) =>
    httpClient.post<Session>(`/sessions/${sessionId}/close`, { participantId }),
};
