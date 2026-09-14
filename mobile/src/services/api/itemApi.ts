import { httpClient } from "./httpClient";
import { ShoppingItem } from "@/domain/models";

// CU-02/CU-02a/CU-03: reservar, liberar, marcar como comprado.
// El arbitraje de reserva se resuelve acá por REST (200 si ganaste, 409 si ya estaba tomado);
// el socket (ver realtime/reservationEvents.ts) solo difunde el nuevo estado del ítem
// (item:updated) para que todos los dispositivos converjan. Ver docs/12-diseno-concurrencia-de-reserva.md.
export const itemApi = {
  listBySession: (sessionId: string) => httpClient.get<ShoppingItem[]>(`/sessions/${sessionId}/items`),

  reserve: (itemId: string, participantId: string) =>
    httpClient.post(`/items/${itemId}/reserve`, { participantId }),

  release: (itemId: string, participantId: string) =>
    httpClient.post(`/items/${itemId}/release`, { participantId }),

  markPurchased: (itemId: string, payload: { participantId: string; pricePaid: number }) =>
    httpClient.post(`/items/${itemId}/purchase`, payload),

  attachTicket: (itemId: string, ticketImageUri: string) =>
    httpClient.post(`/items/${itemId}/ticket`, { ticketImageUri }),
};
