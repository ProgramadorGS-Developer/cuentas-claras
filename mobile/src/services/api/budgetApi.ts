import { httpClient } from "./httpClient";
import { SessionResult } from "@/domain/models";

// RF-13/RF-14.
export const budgetApi = {
  contribute: (sessionId: string, payload: { participantId: string; amount: number }) =>
    httpClient.post<SessionResult>(`/sessions/${sessionId}/budget`, payload),

  getResult: (sessionId: string) => httpClient.get<SessionResult>(`/sessions/${sessionId}/result`),
};
